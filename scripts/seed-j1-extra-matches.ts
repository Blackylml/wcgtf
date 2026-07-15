/**
 * Inserta 4 partidos extra en la Jornada 1 (matchNumbers 9001-9004) para desempate 1v1.
 * Estos picks quedan fuera del rango 1001-1009 y se incluyen via `extra` en LMX_JORNADAS.
 * Uso: npx tsx scripts/seed-j1-extra-matches.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// [matchNumber, homeLabel, awayLabel, scheduledAt UTC]
const EXTRA: [number, string, string, string][] = [
  [9001, "España", "Argentina", "2026-07-19T20:00:00Z"], // Final Mundial — 1er Tiempo
  [9002, "España", "Argentina", "2026-07-19T22:00:00Z"], // Final Mundial — Tiempo Completo
  [9003, "Chivas", "Toluca",    "2026-07-19T01:07:00Z"], // GDL vs TOL — 1er Tiempo
  [9004, "Chivas", "Toluca",    "2026-07-19T01:07:00Z"], // GDL vs TOL — Tiempo Completo
];

const LABELS: Record<number, string> = {
  9001: "Final del Mundial — 1er Tiempo",
  9002: "Final del Mundial — Tiempo Completo",
  9003: "Chivas vs Toluca — 1er Tiempo",
  9004: "Chivas vs Toluca — Tiempo Completo",
};

async function main() {
  let created = 0;
  let skipped = 0;

  for (const [matchNumber, homeLabel, awayLabel, scheduledAt] of EXTRA) {
    const exists = await prisma.match.findUnique({ where: { matchNumber } });
    if (exists) {
      console.log(`  skip  M${matchNumber} (${LABELS[matchNumber]}) — ya existe`);
      skipped++;
      continue;
    }
    await prisma.match.create({
      data: {
        matchNumber,
        homeLabel,
        awayLabel,
        stage: "JORNADA",
        scheduledAt: new Date(scheduledAt),
        isOpen: true,
      },
    });
    console.log(`  +     M${matchNumber} (${LABELS[matchNumber]})`);
    created++;
  }

  console.log(`\nListo: ${created} creados, ${skipped} omitidos.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
