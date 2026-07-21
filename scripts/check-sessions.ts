import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  const sessions = await prisma.duelSession.findMany({ include: { entries: { select: { userId: true } } } });
  for (const s of sessions) {
    console.log(`${s.module} | ${s.label} | isOpen:${s.isOpen} | pairingDone:${s.pairingDone} | entries:${s.entries.length} | id:${s.id}`);
  }
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  console.log("USERS:", JSON.stringify(users));
}
main().catch(console.error).finally(() => prisma.$disconnect());
