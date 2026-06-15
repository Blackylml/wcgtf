import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchWorldCupFixtures, isFinished } from "@/lib/football-api";

/** Aplica un marcador a un partido y (re)califica sus apuestas. No revalida (lo hace el caller). */
export async function applyResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  penWinner: string | null,
) {
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, penaltiesWinner: penWinner },
  });
  const outcome = homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";
  await prisma.matchBet.updateMany({ where: { matchId, pick: outcome }, data: { isCorrect: true } });
  await prisma.matchBet.updateMany({ where: { matchId, pick: { not: outcome } }, data: { isCorrect: false } });
}

function revalidateAll() {
  revalidatePath("/admin/partidos");
  revalidatePath("/admin/usuarios");
  revalidatePath("/partidos");
  revalidatePath("/dashboard");
}

// Ventana para auto-checar un partido: desde ~10 min después de su fin estimado
// (kickoff + ~110 min) hasta 8 h después (más allá = postergado/cancelado → manual).
const DUE_MIN_MS = 110 * 60 * 1000;
const DUE_MAX_MS = 8 * 60 * 60 * 1000;

/**
 * Trae los partidos finalizados de la API y actualiza los mapeados (externalId).
 * Sin `force`, solo llama a la API si hay un partido que ya debió terminar y sigue sin
 * resultado (ahorra cuota). El botón "Sincronizar ahora" usa force=true.
 */
export async function syncResults(
  { force = false }: { force?: boolean } = {},
): Promise<{ checked: number; updated: number; finished: number; skipped: boolean }> {
  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    select: {
      id: true, externalId: true, scheduledAt: true, homeScore: true, awayScore: true, penaltiesWinner: true,
      homeTeam: { select: { code: true } }, awayTeam: { select: { code: true } },
    },
  });

  if (!force) {
    const now = Date.now();
    const due = matches.some((m) => {
      if (m.homeScore !== null) return false; // ya tiene resultado
      const elapsed = now - m.scheduledAt.getTime();
      return elapsed >= DUE_MIN_MS && elapsed <= DUE_MAX_MS;
    });
    if (!due) return { checked: matches.length, updated: 0, finished: 0, skipped: true };
  }

  const fixtures = await fetchWorldCupFixtures();
  const finished = fixtures.filter((f) => isFinished(f.statusShort) && f.homeGoals !== null && f.awayGoals !== null);
  const byId = new Map(finished.map((f) => [f.id, f]));

  let updated = 0;
  for (const m of matches) {
    const f = byId.get(m.externalId!);
    if (!f || f.homeGoals === null || f.awayGoals === null) continue;

    let penWinner: string | null = null;
    if (f.statusShort === "PEN" && f.penHome !== null && f.penAway !== null) {
      penWinner = f.penHome > f.penAway ? (m.homeTeam?.code ?? null) : (m.awayTeam?.code ?? null);
    }

    if (m.homeScore === f.homeGoals && m.awayScore === f.awayGoals && m.penaltiesWinner === penWinner) continue;
    await applyResult(m.id, f.homeGoals, f.awayGoals, penWinner);
    updated++;
  }

  if (updated > 0) revalidateAll();
  return { checked: matches.length, updated, finished: finished.length, skipped: false };
}

// ─── Auto-mapeo de fixtures por nombre de equipo ────────────────────────────

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

// FIFA code → nombre en inglés (como lo suele dar API-Football). Best-effort.
const CODE_EN: Record<string, string> = {
  MEX: "Mexico", USA: "USA", CAN: "Canada", BRA: "Brazil", ARG: "Argentina", GER: "Germany",
  FRA: "France", ESP: "Spain", ENG: "England", POR: "Portugal", NED: "Netherlands", BEL: "Belgium",
  ITA: "Italy", CRO: "Croatia", URU: "Uruguay", COL: "Colombia", JPN: "Japan", KOR: "South Korea",
  AUS: "Australia", MAR: "Morocco", SEN: "Senegal", SUI: "Switzerland", DEN: "Denmark", SWE: "Sweden",
  POL: "Poland", SRB: "Serbia", SCO: "Scotland", WAL: "Wales", RSA: "South Africa", NGA: "Nigeria",
  EGY: "Egypt", GHA: "Ghana", CIV: "Ivory Coast", CMR: "Cameroon", TUN: "Tunisia", ALG: "Algeria",
  QAT: "Qatar", KSA: "Saudi Arabia", IRN: "Iran", PAR: "Paraguay", PER: "Peru", CHI: "Chile",
  ECU: "Ecuador", VEN: "Venezuela", CRC: "Costa Rica", PAN: "Panama", JAM: "Jamaica", HAI: "Haiti",
  BIH: "Bosnia and Herzegovina", CZE: "Czechia", TUR: "Turkey", CUW: "Curacao", AUT: "Austria",
  NOR: "Norway", UKR: "Ukraine", ROU: "Romania", NZL: "New Zealand", SVN: "Slovenia", SVK: "Slovakia",
};

function teamKeys(name: string | null, code: string | null): Set<string> {
  const keys = new Set<string>();
  if (name) keys.add(normalize(name));
  if (code && CODE_EN[code]) keys.add(normalize(CODE_EN[code]));
  if (code) keys.add(normalize(code));
  return keys;
}

/** Asigna externalId a los partidos (con equipos definidos) que aún no lo tienen, por nombre. */
export async function autoMapFixtures(): Promise<{ mapped: number; unmapped: number[]; fixtures: number; sample: string[] }> {
  const fixtures = await fetchWorldCupFixtures();
  const sample = fixtures.slice(0, 4).map((f) => `${f.home} vs ${f.away}`);
  const used = new Set(
    (await prisma.match.findMany({ where: { externalId: { not: null } }, select: { externalId: true } }))
      .map((m) => m.externalId!),
  );

  const matches = await prisma.match.findMany({
    where: { externalId: null, homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: {
      id: true, matchNumber: true,
      homeTeam: { select: { name: true, code: true } },
      awayTeam: { select: { name: true, code: true } },
    },
  });

  let mapped = 0;
  const unmapped: number[] = [];

  for (const m of matches) {
    const homeKeys = teamKeys(m.homeTeam?.name ?? null, m.homeTeam?.code ?? null);
    const awayKeys = teamKeys(m.awayTeam?.name ?? null, m.awayTeam?.code ?? null);

    const hit = fixtures.find((f) => {
      if (used.has(f.id)) return false;
      const fh = normalize(f.home);
      const fa = normalize(f.away);
      const direct = homeKeys.has(fh) && awayKeys.has(fa);
      const swapped = homeKeys.has(fa) && awayKeys.has(fh);
      return direct || swapped;
    });

    if (hit) {
      await prisma.match.update({ where: { id: m.id }, data: { externalId: hit.id } });
      used.add(hit.id);
      mapped++;
    } else {
      unmapped.push(m.matchNumber);
    }
  }

  if (mapped > 0) revalidatePath("/admin/partidos");
  return { mapped, unmapped, fixtures: fixtures.length, sample };
}
