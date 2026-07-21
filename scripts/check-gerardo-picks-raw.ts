import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// J2 matchNumbers: 1010-1018
const J2_MATCH_NUMS = [1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018];

async function main() {
  const j2matches = await prisma.match.findMany({
    where: { matchNumber: { in: J2_MATCH_NUMS } },
    select: { id: true, matchNumber: true },
  });
  const j2matchIds = j2matches.map((m) => m.id);
  console.log("Matches J2 en DB:", j2matches.map((m) => m.matchNumber));

  // Todos los picks de ambos Gerardos en esos partidos (cualquier sessionId)
  const gerardos = await prisma.user.findMany({
    where: { name: { contains: "Gerardo" } },
    select: { id: true, name: true },
  });

  for (const g of gerardos) {
    const bets = await prisma.matchBet.findMany({
      where: { userId: g.id, matchId: { in: j2matchIds } },
      select: { matchId: true, pick: true, duelSessionId: true, poolModule: true },
    });
    console.log(`\n${g.name} — picks en partidos J2: ${bets.length}`);
    for (const b of bets) {
      const mn = j2matches.find((m) => m.id === b.matchId)?.matchNumber;
      console.log(`  M${mn} ${b.pick} | duelSession=${b.duelSessionId ?? "null"} pool=${b.poolModule ?? "null"}`);
    }

    // Créditos actuales
    const u = await prisma.user.findUnique({ where: { id: g.id }, select: { credits: true } });
    console.log(`  credits=${u?.credits}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
