import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const J2 = "cmrtt3znn00008cc48iljib0r";
async function main() {
  const bets = await prisma.matchBet.findMany({
    where: { duelSessionId: J2 },
    select: { userId: true, pick: true },
  });
  console.log("Total picks en J2:", bets.length);
  const byUser = new Map<string, number>();
  for (const b of bets) byUser.set(b.userId, (byUser.get(b.userId) ?? 0) + 1);
  for (const [uid, cnt] of byUser) {
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { name: true, credits: true } });
    const entry = await prisma.duelEntry.findUnique({
      where: { sessionId_userId: { sessionId: J2, userId: uid } },
      select: { paired: true, refunded: true },
    });
    console.log(`  ${u?.name}: ${cnt} picks | credits=${u?.credits} | entry=${entry ? JSON.stringify(entry) : "NONE"}`);
  }
  const s = await prisma.duelSession.findUnique({ where: { id: J2 } });
  console.log(`\nJ2: isOpen=${s?.isOpen} pairingDone=${s?.pairingDone}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
