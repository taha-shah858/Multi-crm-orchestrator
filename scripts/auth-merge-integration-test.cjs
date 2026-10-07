/* Disposable PostgreSQL fixtures; outbound email is intercepted. No real invitations are sent. */
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(name, parent, main, options) { return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, parent, main, options); };
Module._load = function(name, parent, main) { return name === 'server-only' ? {} : load.call(this, name, parent, main); };
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { prisma } = require('../src/lib/db/prisma.ts');
const { signUp, verifySignUpOtp, signIn, findAuthenticatedUser } = require('../src/lib/auth/auth-service.ts');
const { sendEmail, resendPendingSignupOtp } = require('../src/lib/email/email-service.ts');
const { inviteMember, acceptMemberInvite, revokeMember } = require('../src/lib/members/member-service.ts');
const { updateManagedUser } = require('../src/lib/admin/admin-service.ts');
const marker = 'auth-merge-' + Date.now(), emails = [], orgIds = [], delivered = new Map();
let failedDelivery = false;
process.env.RESEND_API_KEY = 'test-only'; process.env.SMTP_FROM = 'review@example.test'; process.env.APP_URL = 'http://localhost:3000'; delete process.env.EMAIL_DEV_LOG;
global.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails');
  if (failedDelivery) return Response.json({}, { status: 503 });
  const body = JSON.parse(options.body); delivered.set(body.to[0], body.html);
  return Response.json({ id: 'test-email' });
};
const otpFor = email => delivered.get(email).match(/font-size: 34px[^>]*>\s*(\d{6})/)[1];
const invitationFor = email => new URL(delivered.get(email).match(/href="([^"]+accept-invite\?token=[^"]+)"/)[1]).searchParams.get('token');
const inputFor = label => { const email = marker + '-' + label + '@example.test'; emails.push(email); return { accountType: 'ADMIN', workspace: marker + '-' + label, name: 'Merge Reviewer', email, password: 'Abcd1!x' }; };
async function main() {
  try {
    const input = inputFor('owner');
    assert.equal((await signUp(input)).requiresVerification, true);
    assert.equal(await prisma.user.count({ where: { email: input.email } }), 0);
    const pending = await prisma.emailVerificationToken.findUnique({ where: { email: input.email } });
    assert.notEqual(pending.otpHash, otpFor(input.email));
    assert.notEqual(pending.signupData.passwordHash, input.password);
    await assert.rejects(resendPendingSignupOtp(input.email), e => e.status === 429);
    const verified = await verifySignUpOtp({ email: input.email, otp: otpFor(input.email) });
    orgIds.push(verified.user.organizationId); const admin = verified.user;
    assert.equal(await prisma.authSession.count({ where: { userId: admin.id } }), 0);
    const session = await signIn({ email: input.email, password: input.password, workspaceRole: 'ADMIN' });
    assert.equal((await findAuthenticatedUser(session.session.token)).id, admin.id);
    await assert.rejects(verifySignUpOtp({ email: input.email, otp: otpFor(input.email) }), e => e.code === 'INVALID_OTP');

    const limited = inputFor('limited'); await signUp(limited);
    for (let i = 0; i < 5; i++) await assert.rejects(verifySignUpOtp({ email: limited.email, otp: '000000' }), e => e.code === 'INVALID_OTP');
    await assert.rejects(verifySignUpOtp({ email: limited.email, otp: otpFor(limited.email) }), e => e.status === 429);
    await prisma.emailVerificationToken.update({ where: { email: limited.email }, data: { updatedAt: new Date(Date.now() - 61000) } });
    await resendPendingSignupOtp(limited.email);
    const limitedVerified = await verifySignUpOtp({ email: limited.email, otp: otpFor(limited.email) }); orgIds.push(limitedVerified.user.organizationId);

    const raced = inputFor('race'); await signUp(raced);
    const results = await Promise.allSettled([verifySignUpOtp({ email: raced.email, otp: otpFor(raced.email) }), verifySignUpOtp({ email: raced.email, otp: otpFor(raced.email) })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    orgIds.push(results.find(r => r.status === 'fulfilled').value.user.organizationId);

    const expired = inputFor('expired'); await signUp(expired);
    await prisma.emailVerificationToken.update({ where: { email: expired.email }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(verifySignUpOtp({ email: expired.email, otp: otpFor(expired.email) }), e => e.code === 'OTP_EXPIRED');

    const rollback = inputFor('rollback'); await signUp(rollback);
    const { verifyAndConsumePendingSignupOtp } = require('../src/lib/email/email-service.ts');
    await assert.rejects(verifyAndConsumePendingSignupOtp(rollback.email, otpFor(rollback.email), async () => { throw Error('test transaction failure'); }));
    assert.ok(await prisma.emailVerificationToken.findUnique({ where: { email: rollback.email } }));

    const client = await prisma.clientAccount.create({ data: { organizationId: admin.organizationId, name: marker + ' client', brandName: marker } });
    const agentEmail = marker + '-agent@example.test'; emails.push(agentEmail);
    await inviteMember(admin, { email: agentEmail, role: 'AGENT' });
    const invited = await acceptMemberInvite({ token: invitationFor(agentEmail), name: 'Invited Agent', password: 'Abcd1!x' });
    assert.equal(invited.user.organizationId, admin.organizationId);
    assert.equal(await prisma.clientAssignment.count({ where: { userId: invited.user.id } }), 0);
    await assert.rejects(acceptMemberInvite({ token: invitationFor(agentEmail), name: 'Invited Agent', password: 'Abcd1!x' }));
    await prisma.clientAssignment.create({ data: { userId: invited.user.id, clientAccountId: client.id, hourlyRateCents: 4500 } });
    await updateManagedUser(admin, invited.user.id, { clientAccountIds: [client.id] });
    assert.equal((await prisma.clientAssignment.findUnique({ where: { clientAccountId_userId: { userId: invited.user.id, clientAccountId: client.id } } })).hourlyRateCents, 4500);
    const manager = { ...admin, role: 'MANAGER' };
    await assert.rejects(inviteMember(manager, { email: marker + '-privileged@example.test', role: 'ADMIN' }), e => e.code === 'FORBIDDEN');
    await assert.rejects(revokeMember(invited.user, admin.id), e => e.code === 'FORBIDDEN');
    const log = await prisma.timeLog.create({ data: { organizationId: admin.organizationId, clientAccountId: client.id, userId: invited.user.id, minutes: 10, description: 'Preserve fixture history', loggedAt: new Date() } });
    await revokeMember(admin, invited.user.id);
    assert.equal((await prisma.user.findUnique({ where: { id: invited.user.id } })).status, 'SUSPENDED');
    assert.equal(await findAuthenticatedUser(invited.session.token), null);
    assert.ok(await prisma.timeLog.findUnique({ where: { id: log.id } }));

    failedDelivery = true;
    await assert.rejects(sendEmail({ to: 'nobody@example.test', subject: 'fixture', html: 'fixture', fallbackSnippet: 'SECRET_CODE' }), e => e.code === 'EXTERNAL_SERVICE_ERROR');
    delete process.env.RESEND_API_KEY; delete process.env.SMTP_USER; delete process.env.SMTP_PASS; process.env.NODE_ENV = 'production'; process.env.EMAIL_DEV_LOG = 'true';
    await assert.rejects(sendEmail({ to: 'nobody@example.test', subject: 'fixture', html: 'fixture', fallbackSnippet: 'SECRET_CODE' }), e => e.code === 'INTEGRATION_CONFIGURATION_ERROR');
    console.log('PASS merged authentication: OTP gate, existing login, replay/expiry/attempt limits, atomic consumption and rollback, no automatic client access, rate preservation, privileged invitation checks, session revocation/history preservation and truthful email failures. No live email sent.');
  } finally {
    await prisma.emailVerificationToken.deleteMany({ where: { email: { in: emails } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
