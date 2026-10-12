import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed operations.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    "emailVerificationToken" in globalForPrisma.prisma &&
    "workspaceInvitation" in globalForPrisma.prisma &&
    "passwordResetToken" in globalForPrisma.prisma
  ) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  if (!Reflect.get(client, "passwordResetToken")) {
    void client.$disconnect();
    throw new AppError(
      "INTEGRATION_CONFIGURATION_ERROR",
      503,
      "The running server has an outdated Prisma client.",
      "Restart the development server to load the updated database client, then try again.",
    );
  }
  globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
