import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";

async function main() {
  // Buscar todos los Gerardos
  const gerardos = await prisma.user.findMany({
    where: { name: { contains: "Gerardo" } },
    select: { id: true, name: true, credits: true },
  });
  console.log("Gerardos:", gerardos.map((g) => `${g.name} (${g.id.slice(-6)}) credits=${g.credits}`));

  for (const g of gerardos) {
    // Transacciones relacionadas con J2
    const txns = await prisma.creditTransaction.findMany({
      where: { userId: g.id, refId: J2_SESSION_ID },
    });
    console.log(`\n${g.name} — txns J2:`, txns.length);
    for (const t of txns) console.log(`  ${t.type} $${t.amount} ${t.description}`);

    // Picks en J2
    const bets = await prisma.matchBet.findMany({
      where: { userId: g.id, duelSessionId: J2_SESSION_ID },
      select: { matchId: true, pick: true },
    });
    console.log(`${g.name} — picks J2:`, bets.length);

    // Entry en J2
    const entry = await prisma.duelEntry.findUnique({
      where: { sessionId_userId: { sessionId: J2_SESSION_ID, userId: g.id } },
    });
    console.log(`${g.name} — entry J2:`, entry ? `paired=${entry.paired} refunded=${entry.refunded}` : "NO ENTRY");

    // Todas las txns recientes
    const allTxns = await prisma.creditTransaction.findMany({
      where: { userId: g.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    console.log(`${g.name} — últimas 5 txns:`);
    for (const t of allTxns) console.log(`  ${t.type} $${t.amount} refId=${t.refId} | ${t.description}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
