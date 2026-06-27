/**
 * Mapea externalId (ESPN) a los partidos R32 (M73–M88).
 * También corrige scheduledAt con la hora exacta de ESPN (UTC).
 * Uso: npx tsx scripts/map-r32-espn.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// matchNumber → ESPN externalId, fecha exacta UTC
const MAP: [number, number, string][] = [
  [73, 760486, "2026-06-28T19:00:00Z"],  // RSA vs CAN
  [74, 760489, "2026-06-29T20:30:00Z"],  // GER vs PAR
  [75, 760488, "2026-06-30T01:00:00Z"],  // NED vs MAR
  [76, 760487, "2026-06-29T17:00:00Z"],  // BRA vs JPN
  [77, 760492, "2026-06-30T21:00:00Z"],  // FRA vs SWE
  [78, 760490, "2026-06-30T17:00:00Z"],  // CIV vs NOR
  [79, 760491, "2026-07-01T01:00:00Z"],  // MEX vs ECU
  [80, 760495, "2026-07-01T16:00:00Z"],  // ENG vs SEN
  [81, 760494, "2026-07-02T00:00:00Z"],  // USA vs BIH
  [82, 760493, "2026-07-01T20:00:00Z"],  // BEL vs KOR
  [83, 760496, "2026-07-02T23:00:00Z"],  // POR vs GHA
  [84, 760497, "2026-07-02T19:00:00Z"],  // ESP vs AUT
  [85, 760498, "2026-07-03T03:00:00Z"],  // SUI vs IRN
  [86, 760500, "2026-07-03T22:00:00Z"],  // ARG vs CPV
  [87, 760501, "2026-07-04T01:30:00Z"],  // COL vs CRO
  [88, 760499, "2026-07-03T18:00:00Z"],  // AUS vs EGY
];

async function main() {
  let updated = 0;
  for (const [matchNumber, externalId, dateStr] of MAP) {
    const scheduledAt = new Date(dateStr);
    await prisma.match.update({
      where: { matchNumber },
      data: { externalId, scheduledAt },
    });
    console.log(`✅ M${matchNumber} → ESPN ${externalId} | ${scheduledAt.toISOString()}`);
    updated++;
  }
  console.log(`\n${updated}/16 partidos mapeados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
