import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

declare const globalThis: {
  prismaGlobal: PrismaClient | undefined;
} & typeof global;

// Use singleton pattern to reuse connection across hot reloads in development
const prisma = globalThis.prismaGlobal ?? (() => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
})();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export { prisma };
