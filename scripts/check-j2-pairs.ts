import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const J2 = "cmrtt3znn00008cc48iljib0r";
const J1 = "cmrjwbuaq0000a0c4h0d0yqnd";
async function main() {
  const s = await prisma.duelSession.findUnique({ where: { id: J2 } });
  console.log(`J2: isOpen=${s?.isOpen} pairingDone=${s?.pairingDone}`);

  const pairs = await prisma.duelPair.findMany({
    where: { sessionId: J2 },
    include: {
      user1: { select: { name: true } },
      user2: { select: { name: true } },
    },
  });
  console.log(`\nPares J2 (${pairs.length}):`);
  for (const p of pairs) console.log(`  ${p.user1.name}  vs  ${p.user2.name} | prizePool=${p.prizePool}`);

  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: J2 },
    include: { user: { select: { name: true } } },
  });
  console.log(`\nEntries J2 (${entries.length}):`);
  for (const e of entries) console.log(`  ${e.user.name} | paired=${e.paired} refunded=${e.refunded}`);

  // J1 pairs para referencia
  console.log("\n--- J1 pares (referencia) ---");
  const j1pairs = await prisma.duelPair.findMany({
    where: { sessionId: J1 },
    include: { user1: { select: { name: true } }, user2: { select: { name: true } } },
  });
  for (const p of j1pairs) console.log(`  ${p.user1.name}  vs  ${p.user2.name} | score=${p.score1}-${p.score2} winner=${p.winnerId ? "u1" : "empate"}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
