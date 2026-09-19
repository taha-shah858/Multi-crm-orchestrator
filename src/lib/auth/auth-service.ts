import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { isWorkspaceRole, workspaceRoleForUserRole } from "@/lib/auth/roles";
import type { AuthenticatedUser, ClientAccountSummary, UserRole } from "@/lib/models/canonical";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;

const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

export function toAuthenticatedUser(user: { id: string; organizationId: string; name: string; email: string; role: UserRole }): AuthenticatedUser {
  return { id: user.id, organizationId: user.organizationId, name: user.name, email: user.email, role: user.role };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}

export async function signIn(input: Record<string, unknown>) {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  const workspaceRole = input.workspaceRole;
  if (!isWorkspaceRole(workspaceRole)) throw new AppError("INVALID_CREDENTIALS", 422, "A workspace role is required.", "Choose the Admin / Manager or Sales Agent workspace.");
  if (!email || !password) throw new AppError("INVALID_CREDENTIALS", 422, "Email and password are required.", "Enter your email and password.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials.", "Check your email and password and try again.");
  }
  if (user.status !== "ACTIVE") throw new AppError("ACCOUNT_UNAVAILABLE", 403, "User account is unavailable.", "Ask an administrator to activate your account.");
  if (workspaceRoleForUserRole(user.role) !== workspaceRole) {
    throw new AppError("INVALID_CREDENTIALS", 403, "Account role does not match the selected workspace.", "This account does not have access to the selected workspace. Choose the correct role and try again.");
  }

  const session = await createSession(user.id);
  await prisma.auditLog.create({ data: { organizationId: user.organizationId, userId: user.id, action: "AUTH_SIGNED_IN", entityType: "AUTH_SESSION", source: "PLATFORM", metadata: { role: user.role } } });
  return { user: toAuthenticatedUser(user), session };
}

export async function signUp(input: Record<string, unknown>) {
  if (input.accountType !== "ADMIN") {
    throw new AppError("INVALID_SIGNUP", 422, "Only company administrators can self-register.", "Sales Agent accounts must be provisioned by a company administrator.");
  }
  const workspace = text(input.workspace);
  const name = text(input.name) || "Workspace administrator";
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (workspace.length < 2 || !email || password.length < 10) {
    throw new AppError("INVALID_SIGNUP", 422, "Signup details are invalid.", "Enter a workspace, a valid email, and a password of at least 10 characters.");
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new AppError("EMAIL_IN_USE", 409, "Email is already registered.", "Sign in with this email instead.");

  const passwordHash = await hashPassword(password);
  const result = await prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.create({ data: { name: workspace } });
    const user = await transaction.user.create({ data: { organizationId: organization.id, name, email, passwordHash, role: "ADMIN", status: "ACTIVE" } });
    const client = await transaction.clientAccount.create({ data: { organizationId: organization.id, name: `${workspace} primary account`, brandName: workspace, status: "ACTIVE" } });
    await transaction.clientAssignment.create({ data: { clientAccountId: client.id, userId: user.id } });
    await transaction.auditLog.create({ data: { organizationId: organization.id, userId: user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, source: "PLATFORM", metadata: { role: "ADMIN", signup: true } } });
    return { user, client };
  });
  const session = await createSession(result.user.id);
  return { user: toAuthenticatedUser(result.user), defaultClientAccountId: result.client.id, session };
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  const session = await prisma.authSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
  if (!session) return;
  await prisma.$transaction([
    prisma.authSession.delete({ where: { id: session.id } }),
    prisma.auditLog.create({ data: { organizationId: session.user.organizationId, userId: session.userId, action: "AUTH_SIGNED_OUT", entityType: "AUTH_SESSION", entityId: session.id, source: "PLATFORM" } }),
  ]);
}

export async function findAuthenticatedUser(sessionToken: string | undefined) {
  if (!sessionToken) return null;
  const session = await prisma.authSession.findUnique({ where: { tokenHash: tokenHash(sessionToken) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) await prisma.authSession.delete({ where: { id: session.id } });
    return null;
  }
  void prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return toAuthenticatedUser(session.user);
}

export async function listAccessibleClientAccounts(user: AuthenticatedUser): Promise<ClientAccountSummary[]> {
  const where = user.role === "AGENT"
    ? { organizationId: user.organizationId, status: "ACTIVE" as const, agentAssignments: { some: { userId: user.id } } }
    : { organizationId: user.organizationId, status: "ACTIVE" as const };
  const accounts = await prisma.clientAccount.findMany({ where, select: { id: true, organizationId: true, name: true, brandName: true, communicationIdentity: true }, orderBy: { name: "asc" } });
  return accounts.map((account) => ({ ...account, communicationIdentity: account.communicationIdentity ?? undefined }));
}

export async function assertClientAccess(user: AuthenticatedUser, clientAccountId: string) {
  const account = await prisma.clientAccount.findFirst({
    where: {
      id: clientAccountId,
      organizationId: user.organizationId,
      status: "ACTIVE",
      ...(user.role === "AGENT" ? { agentAssignments: { some: { userId: user.id } } } : {}),
    },
    select: { id: true },
  });
  if (!account) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client account access is denied.", "Choose a client account assigned to your user.");
  return account;
}
