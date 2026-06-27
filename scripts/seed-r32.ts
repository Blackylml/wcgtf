/**
 * Actualiza los partidos R32 (M73–M88) con los equipos reales
 * confirmados tras la fase de grupos del Mundial 2026.
 * Uso: npx tsx scripts/seed-r32.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Equipos reales por número de partido (matchNumber).
// Orden: [ matchNumber, homeCode, awayCode ]
// Resultado de grupos confirmado al 27-jun-2026.
const R32: [number, string, string][] = [
  [73, "RSA", "CAN"],   // Jun 28 — SoFi Stadium, Los Ángeles
  [74, "GER", "PAR"],   // Jun 29 — Gillette Stadium, Boston
  [75, "NED", "MAR"],   // Jun 29 — Estadio BBVA, Monterrey
  [76, "BRA", "JPN"],   // Jun 29 — NRG Stadium, Houston
  [77, "FRA", "SWE"],   // Jun 30 — MetLife Stadium, Nueva York/NJ
  [78, "CIV", "NOR"],   // Jun 30 — AT&T Stadium, Dallas
  [79, "MEX", "ECU"],   // Jun 30 — Estadio Azteca, Ciudad de México
  [80, "ENG", "SEN"],   // Jul 1  — Mercedes-Benz Stadium, Atlanta
  [81, "USA", "BIH"],   // Jul 1  — Levi's Stadium, Santa Clara
  [82, "BEL", "KOR"],   // Jul 1  — Lumen Field, Seattle
  [83, "POR", "GHA"],   // Jul 2  — BMO Field, Toronto
  [84, "ESP", "AUT"],   // Jul 2  — SoFi Stadium, Los Ángeles
  [85, "SUI", "IRN"],   // Jul 2  — BC Place, Vancouver
  [86, "ARG", "CPV"],   // Jul 3  — Hard Rock Stadium, Miami
  [87, "COL", "CRO"],   // Jul 3  — Arrowhead Stadium, Kansas City
  [88, "AUS", "EGY"],   // Jul 3  — AT&T Stadium, Dallas
];

async function main() {
  const teams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamMap = new Map(teams.map((t) => [t.code, t.id]));

  let updated = 0;
  for (const [matchNumber, homeCode, awayCode] of R32) {
    const homeTeamId = teamMap.get(homeCode);
    const awayTeamId = teamMap.get(awayCode);

    if (!homeTeamId) { console.warn(`⚠  Equipo no encontrado: ${homeCode} (M${matchNumber})`); continue; }
    if (!awayTeamId) { console.warn(`⚠  Equipo no encontrado: ${awayCode} (M${matchNumber})`); continue; }

    const match = await prisma.match.findUnique({ where: { matchNumber }, select: { id: true, homeTeamId: true } });
    if (!match) { console.warn(`⚠  Partido M${matchNumber} no existe en DB`); continue; }

    await prisma.match.update({
      where: { matchNumber },
      data: {
        homeTeamId,
        awayTeamId,
        homeLabel: homeCode,
        awayLabel: awayCode,
        penaltiesAllowed: true,
      },
    });

    console.log(`✅ M${matchNumber}: ${homeCode} vs ${awayCode}`);
    updated++;
  }

  console.log(`\n${updated}/${R32.length} partidos actualizados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
