import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ANDRES_PICKS: [number, string][] = [
  [1001, "HOME"], [1002, "DRAW"], [1003, "AWAY"], [1004, "HOME"],
  [1005, "HOME"], [1006, "DRAW"], [1007, "DRAW"], [1009, "DRAW"],
  [9001, "DRAW"], [9002, "HOME"], [9003, "HOME"], [9004, "DRAW"],
];

const ERICK_PICKS: [number, string][] = [
  [1001, "HOME"], [1002, "DRAW"], [1003, "AWAY"], [1004, "AWAY"],
  [1005, "HOME"], [1006, "DRAW"], [1007, "HOME"], [1009, "AWAY"],
  [9001, "DRAW"], [9002, "HOME"], [9003, "HOME"], [9004, "HOME"],
];

async function restore(name: string, picks: [number, string][]) {
  const user = await prisma.user.findFirst({
    where: { name: { contains: name } },
    select: { id: true, name: true },
  });
  if (!user) { console.log(`  !! Usuario "${name}" no encontrado`); return; }

  const matchNums = picks.map(([n]) => n);
  const matches = await prisma.match.findMany({
    where: { matchNumber: { in: matchNums } },
    select: { id: true, matchNumber: true },
  });
  const matchMap = new Map(matches.map((m) => [m.matchNumber, m.id]));

  let count = 0;
  for (const [num, pick] of picks) {
    const matchId = matchMap.get(num);
    if (!matchId) { console.log(`  !! M${num} no encontrado`); continue; }
    await prisma.matchBet.upsert({
      where: { userId_matchId_poolModule: { userId: user.id, matchId, poolModule: "LMX_J1" } },
      create: { userId: user.id, matchId, pick: pick as "HOME" | "DRAW" | "AWAY", poolModule: "LMX_J1" },
      update: { pick: pick as "HOME" | "DRAW" | "AWAY" },
    });
    count++;
  }
  console.log(`  ok  ${user.name}: ${count} picks restaurados`);
}

async function main() {
  await restore("Andres", ANDRES_PICKS);
  await restore("Erick", ERICK_PICKS);
  console.log("\nListo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
