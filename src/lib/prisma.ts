import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

declare const globalThis: {
  prismaGlobal: PrismaClient | undefined;
} & typeof global;

// Use singleton pattern to reuse connection across hot reloads in development
const prisma = globalThis.prismaGlobal ?? (() => {
  const adapter = new PrismaPg({
    connectionString,
    // Connection pooling for better performance
    max: 10, // Max connections in pool
    min: 2, // Min connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail fast if no connection available
  });
  return new PrismaClient({
    adapter,
    // Optimize query logging
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "query"],
  });
})();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };
