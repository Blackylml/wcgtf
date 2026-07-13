/**
 * Inserta los 9 partidos de la Jornada 1 del Apertura 2026 de Liga MX.
 * matchNumbers: 1001–1009
 * Uso: npx tsx scripts/seed-ligamx-j1.ts
 *
 * Horarios en UTC (México = UTC-6, sin horario de verano desde 2023).
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// [matchNumber, homeCode, awayCode, scheduledAt UTC, venue]
const J1: [number, string, string, string, string][] = [
  [1001, "NEX", "ATL", "2026-07-17T01:00:00Z", "Estadio Victoria, Aguascalientes"],
  [1002, "TIJ", "TIG", "2026-07-17T03:00:00Z", "Estadio Caliente, Tijuana"],
  [1003, "ASL", "CAZ", "2026-07-18T01:00:00Z", "Estadio Libertad Financiera, SLP"],
  [1004, "LEO", "ATZ", "2026-07-18T01:00:00Z", "Estadio León, León"],
  [1005, "JUA", "PUE", "2026-07-18T03:00:00Z", "Estadio Olímpico Benito Juárez, Juárez"],
  [1006, "UNM", "PAC", "2026-07-18T23:00:00Z", "Estadio Olímpico Universitario, CDMX"],
  [1007, "MTY", "SAN", "2026-07-19T01:00:00Z", "Estadio BBVA, Monterrey"],
  [1008, "GDL", "TOL", "2026-07-19T01:07:00Z", "Estadio Akron, Zapopan"],
  [1009, "QRO", "AME", "2026-07-19T03:00:00Z", "Estadio La Corregidora, Querétaro"],
];

async function main() {
  const teams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamMap = new Map(teams.map((t) => [t.code, t.id]));

  let created = 0;
  let skipped = 0;

  for (const [matchNumber, homeCode, awayCode, scheduledAt, venue] of J1) {
    const homeTeamId = teamMap.get(homeCode);
    const awayTeamId = teamMap.get(awayCode);

    if (!homeTeamId) { console.warn(`⚠  Equipo no encontrado: ${homeCode}`); skipped++; continue; }
    if (!awayTeamId) { console.warn(`⚠  Equipo no encontrado: ${awayCode}`); skipped++; continue; }

    await prisma.match.upsert({
      where: { matchNumber },
      create: {
        matchNumber,
        homeTeamId,
        awayTeamId,
        homeLabel: homeCode,
        awayLabel: awayCode,
        stage: "JORNADA",
        scheduledAt: new Date(scheduledAt),
        venue,
        penaltiesAllowed: false,
      },
      update: {
        homeTeamId,
        awayTeamId,
        homeLabel: homeCode,
        awayLabel: awayCode,
        stage: "JORNADA",
        scheduledAt: new Date(scheduledAt),
        venue,
      },
    });

    console.log(`✅ M${matchNumber}: ${homeCode} vs ${awayCode}  —  ${scheduledAt}  (${venue})`);
    created++;
  }

  console.log(`\n${created} partidos de J1 insertados/actualizados. ${skipped} omitidos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
