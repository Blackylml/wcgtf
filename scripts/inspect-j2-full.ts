import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";

async function main() {
  // Todas las entries en J2
  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID },
    include: { user: { select: { name: true, credits: true } } },
  });
  console.log(`\nEntries J2 (${entries.length}):`);
  for (const e of entries) {
    console.log(`  ${e.user.name} | paired=${e.paired} refunded=${e.refunded} credits=${e.user.credits}`);
  }

  // Todos los picks en J2
  const bets = await prisma.matchBet.findMany({
    where: { duelSessionId: J2_SESSION_ID },
    include: { user: { select: { name: true } } },
    select: { user: true, pick: true, matchId: true },
  });
  console.log(`\nPicks J2 (${bets.length}):`);
  const byUser = new Map<string, number>();
  for (const b of bets) {
    byUser.set(b.user.name, (byUser.get(b.user.name) ?? 0) + 1);
  }
  for (const [name, count] of byUser) {
    console.log(`  ${name}: ${count} picks`);
  }

  // Todas las SPEND_ENTRY de J2
  const txns = await prisma.creditTransaction.findMany({
    where: { refId: J2_SESSION_ID },
    include: { user: { select: { name: true } } },
  });
  console.log(`\nTransacciones J2 (${txns.length}):`);
  for (const t of txns) console.log(`  ${t.user.name} | ${t.type} $${t.amount}`);

  // Estado del sesión
  const s = await prisma.duelSession.findUnique({ where: { id: J2_SESSION_ID } });
  console.log(`\nJ2 state: isOpen=${s?.isOpen} pairingDone=${s?.pairingDone}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
