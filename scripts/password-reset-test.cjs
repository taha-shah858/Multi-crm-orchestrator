// Disposable PostgreSQL fixtures. All outbound email requests are intercepted.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function(n,p,m,o) { return resolve.call(this,n.startsWith('@/') ? path.join(root,'src',n.slice(2)) : n,p,m,o); };
Module._load = function(n,p,m) { return n === 'server-only' ? {} : load.call(this,n,p,m); };
require.extensions['.ts'] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,f);
const { prisma } = require('../src/lib/db/prisma.ts');
const { hashPassword, createSession, signIn } = require('../src/lib/auth/auth-service.ts');
const { requestPasswordReset, resetPassword } = require('../src/lib/auth/password-reset-service.ts');
const { NextRequest } = require('next/server');
const marker = 'reset-review-' + Date.now(), org = marker, agent = marker+'-agent', admin = marker+'-admin';
const email = agent+'@example.test', adminEmail = admin+'@example.test';
let messages = [], failDelivery = false;
process.env.RESEND_API_KEY = 'test-only'; process.env.SMTP_FROM = 'fixture@example.test'; process.env.APP_URL = 'http://localhost:3000'; delete process.env.EMAIL_DEV_LOG;
global.fetch = async (url, options) => { assert.equal(url,'https://api.resend.com/emails'); if(failDelivery) return Response.json({}, {status:503}); messages.push(JSON.parse(options.body)); return Response.json({id:'fixture'}); };
const tokenFor = () => new URL(messages.at(-1).html.match(/href="([^"]+)"/)[1]).searchParams.get('token');
async function age(userId, seconds=61) { await prisma.passwordResetToken.update({where:{userId},data:{createdAt:new Date(Date.now()-seconds*1000)}}); }
async function main() { try {
  await prisma.organization.create({data:{id:org,name:'Password reset fixture'}});
  const oldHash = await hashPassword('Original1!');
  await prisma.user.createMany({data:[{id:agent,email,name:'Reset Agent',role:'AGENT'},{id:admin,email:adminEmail,name:'Reset Admin',role:'ADMIN'}].map(x=>({...x,organizationId:org,status:'ACTIVE',passwordHash:oldHash}))});
  const generic = await requestPasswordReset({email:'unknown-'+email}); assert.equal(messages.length,0);
  assert.deepEqual(await requestPasswordReset({email}),generic); assert.equal(messages.length,1);
  const first = tokenFor(); const stored = await prisma.passwordResetToken.findUnique({where:{userId:agent}});
  assert.notEqual(stored.tokenHash,first); assert.equal(first.length,64); assert.ok(stored.expiresAt.getTime()-stored.createdAt.getTime()===1800000);
  await requestPasswordReset({email}); assert.equal(messages.length,1);
  await assert.rejects(resetPassword({token:first,password:'short'})); assert.ok(await prisma.passwordResetToken.findUnique({where:{userId:agent}}));
  await age(agent); await requestPasswordReset({email}); const second = tokenFor();
  await assert.rejects(resetPassword({token:first,password:'NewValid1!'}));
  await prisma.passwordResetToken.update({where:{userId:agent},data:{expiresAt:new Date(Date.now()-1000)}});
  await assert.rejects(resetPassword({token:second,password:'NewValid1!'}));
  await age(agent); await requestPasswordReset({email}); const valid = tokenFor();
  await createSession(agent); await createSession(agent); await createSession(admin);
  const actualClient = global.prisma;
  const realTransaction = actualClient.$transaction.bind(actualClient);
  actualClient.$transaction = (callback, ...args) => realTransaction(tx => callback(new Proxy(tx, { get(target, key) { return key === 'auditLog' ? { ...target.auditLog, create: async () => { throw Error('fixture rollback'); } } : Reflect.get(target, key); } })), ...args);
  try { await assert.rejects(resetPassword({token:valid,password:'NewValid1!'})); }
  finally { actualClient.$transaction = realTransaction; }
  assert.ok(await prisma.passwordResetToken.findUnique({where:{userId:agent}})); assert.equal(await prisma.authSession.count({where:{userId:agent}}),2);
  const resetRoute = require('../src/app/api/auth/reset-password/route.ts');
  const response = await resetRoute.POST(new NextRequest('http://localhost:3000/api/auth/reset-password',{method:'POST',body:JSON.stringify({token:valid,password:'NewValid1!'})}));
  assert.equal(response.status,200); assert.match(response.headers.get('set-cookie'),/multi_crm_session=/);
  assert.equal(await prisma.authSession.count({where:{userId:agent}}),0); assert.equal(await prisma.authSession.count({where:{userId:admin}}),1);
  const user=await prisma.user.findUnique({where:{id:agent}}); assert.equal(user.status,'ACTIVE'); assert.equal(user.role,'AGENT');
  await signIn({email,password:'NewValid1!',workspaceRole:'AGENT'});
  await assert.rejects(signIn({email,password:'Original1!',workspaceRole:'AGENT'}));
  await assert.rejects(resetPassword({token:valid,password:'Another1!'}));
  await requestPasswordReset({email:adminEmail}); const adminToken=tokenFor();
  const raced=await Promise.allSettled([resetPassword({token:adminToken,password:'AdminNew1!'}),resetPassword({token:adminToken,password:'AdminOther1!'})]);
  assert.equal(raced.filter(x=>x.status==='fulfilled').length,1);
  await requestPasswordReset({email}); failDelivery=true; await age(agent); assert.deepEqual(await requestPasswordReset({email}),generic); assert.equal(await prisma.passwordResetToken.count({where:{userId:agent}}),0); failDelivery=false;
  await prisma.user.update({where:{id:agent},data:{status:'SUSPENDED'}}); const sent=messages.length; assert.deepEqual(await requestPasswordReset({email}),generic); assert.equal(messages.length,sent);
  const requestRoute=require('../src/app/api/auth/forgot-password/route.ts'); const missing=await requestRoute.POST(new NextRequest('http://localhost:3000/api/auth/forgot-password',{method:'POST',body:JSON.stringify({email:'unknown-'+email})})); assert.equal(missing.status,200);
  console.log('PASS password reset: hashed expiring tokens, generic account response, resend cooldown, replacement, password policy, expiry/replay, rollback, single concurrent consumption, session revocation, account-role preservation, admin/agent support, API cookies and failed-delivery cleanup. No live emails sent.');
} finally { await prisma.organization.deleteMany({where:{id:org}}); await prisma.$disconnect(); } }
main().catch(e=>{console.error(e);process.exitCode=1});
