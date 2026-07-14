/**
 * Corrige equipos y resultados de fase eliminatoria del Mundial 2026.
 * - Arregla 5 R32 con equipos erróneos en BD
 * - Mapea externalId a M89-M101 (R16, QF, SF jugadas)
 * - Aplica todos los resultados desde ESPN
 * Uso: npx tsx scripts/fix-ko-bracket.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Mapa ESPN fixture → partido en BD ───────────────────────────────────────
// Construido a mano desde inspect-espn-ko + inspect-ko-matches

type FixInfo = {
  espnId: number;
  matchNumber: number;
  homeCode: string;      // abreviatura ESPN = code en BD
  awayCode: string;
  homeGoals: number | null;
  awayGoals: number | null;
  penWinner: string | null; // code del ganador en penales, null si no hubo
};

const FIXES: FixInfo[] = [
  // ── R32: equipos incorrectos en BD (externalId ya correcto, solo actualizar equipo) ──
  { espnId: 760495, matchNumber: 80, homeCode: "ENG", awayCode: "COD", homeGoals: 2, awayGoals: 1, penWinner: null },
  { espnId: 760493, matchNumber: 82, homeCode: "BEL", awayCode: "SEN", homeGoals: 3, awayGoals: 2, penWinner: null },
  { espnId: 760496, matchNumber: 83, homeCode: "POR", awayCode: "CRO", homeGoals: 2, awayGoals: 1, penWinner: null },
  { espnId: 760498, matchNumber: 85, homeCode: "SUI", awayCode: "ALG", homeGoals: 2, awayGoals: 0, penWinner: null },
  { espnId: 760501, matchNumber: 87, homeCode: "COL", awayCode: "GHA", homeGoals: 1, awayGoals: 0, penWinner: null },

  // ── R16: sin externalId ni equipos ──
  { espnId: 760503, matchNumber: 89, homeCode: "PAR", awayCode: "FRA", homeGoals: 0, awayGoals: 1, penWinner: null },
  { espnId: 760502, matchNumber: 90, homeCode: "CAN", awayCode: "MAR", homeGoals: 0, awayGoals: 3, penWinner: null },
  { espnId: 760504, matchNumber: 91, homeCode: "BRA", awayCode: "NOR", homeGoals: 1, awayGoals: 2, penWinner: null },
  { espnId: 760505, matchNumber: 92, homeCode: "MEX", awayCode: "ENG", homeGoals: 2, awayGoals: 3, penWinner: null },
  { espnId: 760506, matchNumber: 93, homeCode: "POR", awayCode: "ESP", homeGoals: 0, awayGoals: 1, penWinner: null },
  { espnId: 760507, matchNumber: 94, homeCode: "USA", awayCode: "BEL", homeGoals: 1, awayGoals: 4, penWinner: null },
  { espnId: 760509, matchNumber: 95, homeCode: "ARG", awayCode: "EGY", homeGoals: 3, awayGoals: 2, penWinner: null },
  { espnId: 760508, matchNumber: 96, homeCode: "SUI", awayCode: "COL", homeGoals: 0, awayGoals: 0, penWinner: "SUI" }, // pen 4-3

  // ── QF ──
  { espnId: 760510, matchNumber: 97, homeCode: "FRA", awayCode: "MAR", homeGoals: 2, awayGoals: 0, penWinner: null },
  { espnId: 760511, matchNumber: 98, homeCode: "ESP", awayCode: "BEL", homeGoals: 2, awayGoals: 1, penWinner: null },
  { espnId: 760512, matchNumber: 99, homeCode: "NOR", awayCode: "ENG", homeGoals: 1, awayGoals: 2, penWinner: null },
  { espnId: 760513, matchNumber: 100, homeCode: "ARG", awayCode: "SUI", homeGoals: 3, awayGoals: 1, penWinner: null },

  // ── SF jugada ──
  { espnId: 760514, matchNumber: 101, homeCode: "FRA", awayCode: "ESP", homeGoals: 0, awayGoals: 2, penWinner: null },
  // M102 (ENG vs ARG) aún no jugada — ESPN id:760515, sin resultado
  // M103, M104 tampoco
];

// Matches sin resultado que SÍ necesitan externalId + equipos pero aún no hay score
const PENDING: { espnId: number; matchNumber: number; homeCode: string; awayCode: string }[] = [
  { espnId: 760515, matchNumber: 102, homeCode: "ENG", awayCode: "ARG" },
  { espnId: 760516, matchNumber: 103, homeCode: "FRA", awayCode: "ENG" }, // 3er lugar (perdedores SF)
  { espnId: 760517, matchNumber: 104, homeCode: "ESP", awayCode: "ARG" }, // Final
];

async function getTeamId(code: string, fallbackName: string): Promise<string | null> {
  const team = await prisma.team.findFirst({ where: { code } });
  if (team) return team.id;
  // Si no existe, lo creamos mínimamente
  console.log(`  ⚙️  Creando equipo faltante: ${code} (${fallbackName})`);
  const created = await prisma.team.create({ data: { code, name: fallbackName, flag: null } });
  return created.id;
}

// Nombres de respaldo para equipos que podrían no existir en BD
const TEAM_NAMES: Record<string, string> = {
  COD: "DR Congo", SEN: "Senegal", CRO: "Croacia", ALG: "Argelia", GHA: "Ghana",
  CAN: "Canadá", MAR: "Marruecos", PAR: "Paraguay", NOR: "Noruega",
  ENG: "Inglaterra", POR: "Portugal", BEL: "Bélgica", EGY: "Egipto",
  SUI: "Suiza", COL: "Colombia", ARG: "Argentina", FRA: "Francia",
  ESP: "España", BRA: "Brasil", MEX: "México", USA: "Estados Unidos",
  GER: "Alemania", NED: "Países Bajos", AUS: "Australia",
};

async function applyResult(matchId: string, hs: number, as_: number, penWinner: string | null) {
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore: hs, awayScore: as_, penaltiesWinner: penWinner },
  });
  const outcome = hs > as_ ? "HOME" : hs < as_ ? "AWAY" : "DRAW";
  await prisma.matchBet.updateMany({ where: { matchId, pick: outcome }, data: { isCorrect: true } });
  await prisma.matchBet.updateMany({ where: { matchId, pick: { not: outcome } }, data: { isCorrect: false } });
}

async function main() {
  console.log("🔧  Corrigiendo bracket KO del Mundial 2026...\n");

  // Pre-cargar todos los team IDs que necesitamos
  const allCodes = [...new Set([
    ...FIXES.flatMap((f) => [f.homeCode, f.awayCode]),
    ...PENDING.flatMap((p) => [p.homeCode, p.awayCode]),
  ])];
  const teamIdMap: Record<string, string> = {};
  for (const code of allCodes) {
    const id = await getTeamId(code, TEAM_NAMES[code] ?? code);
    if (id) teamIdMap[code] = id;
  }
  console.log(`Equipos en BD: ${Object.keys(teamIdMap).length}/${allCodes.length}\n`);

  // Cargar matches por matchNumber
  const matchNumbers = [...FIXES.map((f) => f.matchNumber), ...PENDING.map((p) => p.matchNumber)];
  const dbMatches = await prisma.match.findMany({
    where: { matchNumber: { in: matchNumbers } },
    select: { id: true, matchNumber: true, externalId: true, homeScore: true, awayScore: true, penaltiesWinner: true },
  });
  const matchByNum = new Map(dbMatches.map((m) => [m.matchNumber, m]));

  // ── Aplicar FIXES (con resultado) ──
  console.log("── Aplicando resultados + equipos ──");
  for (const f of FIXES) {
    const m = matchByNum.get(f.matchNumber);
    if (!m) { console.log(`  ❌ M${f.matchNumber} no encontrado en BD`); continue; }

    const homeId = teamIdMap[f.homeCode];
    const awayId = teamIdMap[f.awayCode];

    await prisma.match.update({
      where: { id: m.id },
      data: {
        externalId: f.espnId,
        homeTeamId: homeId ?? undefined,
        awayTeamId: awayId ?? undefined,
        homeLabel: null,
        awayLabel: null,
      },
    });

    if (f.homeGoals !== null && f.awayGoals !== null) {
      await applyResult(m.id, f.homeGoals, f.awayGoals, f.penWinner);
      const pen = f.penWinner ? ` (pen:${f.penWinner})` : "";
      console.log(`  ✅ M${f.matchNumber}: ${f.homeCode} ${f.homeGoals}-${f.awayGoals} ${f.awayCode}${pen}`);
    }
  }

  // ── Mapear PENDING (externalId + equipos, sin resultado aún) ──
  console.log("\n── Mapeando partidos pendientes ──");
  for (const p of PENDING) {
    const m = matchByNum.get(p.matchNumber);
    if (!m) { console.log(`  ❌ M${p.matchNumber} no encontrado en BD`); continue; }

    const homeId = teamIdMap[p.homeCode];
    const awayId = teamIdMap[p.awayCode];

    await prisma.match.update({
      where: { id: m.id },
      data: {
        externalId: p.espnId,
        homeTeamId: homeId ?? undefined,
        awayTeamId: awayId ?? undefined,
        homeLabel: null,
        awayLabel: null,
      },
    });
    console.log(`  🕐 M${p.matchNumber}: ${p.homeCode} vs ${p.awayCode} — mapeado (sin resultado)`);
  }

  console.log("\n✨ Listo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
