/**
 * Vincula los partidos extra de J1 (9001-9004) con los equipos reales en la BD.
 * Uso: npx tsx scripts/update-j1-extra-team-links.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// [matchNumber, homeCode, awayCode]
const LINKS: [number, string, string][] = [
  [9001, "ESP", "ARG"],
  [9002, "ESP", "ARG"],
  [9003, "GDL", "TOL"],
  [9004, "GDL", "TOL"],
];

async function main() {
  const teams = await prisma.team.findMany({
    where: { code: { in: ["ESP", "ARG", "GDL", "TOL"] } },
    select: { id: true, code: true, name: true, flag: true },
  });
  const teamMap = new Map(teams.map((t) => [t.code, t]));
  console.log("Equipos encontrados:", teams.map((t) => `${t.code} ${t.flag}`).join(", "));

  for (const [matchNumber, homeCode, awayCode] of LINKS) {
    const home = teamMap.get(homeCode);
    const away = teamMap.get(awayCode);
    if (!home || !away) {
      console.log(`  SKIP M${matchNumber} — equipo ${!home ? homeCode : awayCode} no encontrado`);
      continue;
    }
    await prisma.match.update({
      where: { matchNumber },
      data: { homeTeamId: home.id, awayTeamId: away.id },
    });
    console.log(`  ok   M${matchNumber}: ${home.flag} ${home.name} vs ${away.flag} ${away.name}`);
  }
  console.log("\nListo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
