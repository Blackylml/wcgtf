import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JornadaReaction" (
      "id" TEXT PRIMARY KEY,
      "jornadaKey" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JornadaReaction_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "JornadaReaction_jornadaKey_userId_key" ON "JornadaReaction" ("jornadaKey", "userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "JornadaReaction_jornadaKey_idx" ON "JornadaReaction" ("jornadaKey");`);

  const count = await prisma.jornadaReaction.count();
  console.log(`OK: tabla JornadaReaction lista (filas actuales: ${count}).`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
