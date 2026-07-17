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
// (kickoff + ~110 min) hasta 25 h después. 25h permite que un cron diario alcance
// partidos de la noche anterior (Liga MX termina ~1-4 AM UTC, cron corre a las 2/4 AM UTC).
const DUE_MIN_MS = 110 * 60 * 1000;
const DUE_MAX_MS = 25 * 60 * 60 * 1000;

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

    // ESPN puede listar el partido con local/visitante invertido respecto a nuestra BD.
    // Orientamos el marcador por CÓDIGO de equipo (abreviatura ESPN = Team.code), no por posición.
    const ourHome = m.homeTeam?.code ?? null;
    const ourAway = m.awayTeam?.code ?? null;

    // GUARD DE INTEGRIDAD: si conocemos ambos códigos, el fixture DEBE ser de
    // estos dos equipos. Evita escribir el marcador de otro partido cuando el
    // externalId quedó mal mapeado (ej. el 1-0 de MEX-KOR en USA-AUS).
    if (ourHome && ourAway) {
      const sameTeams =
        (f.homeAbbr === ourHome && f.awayAbbr === ourAway) ||
        (f.homeAbbr === ourAway && f.awayAbbr === ourHome);
      if (!sameTeams) continue;
    }

    const reversed = !!ourHome && !!ourAway && f.homeAbbr === ourAway && f.awayAbbr === ourHome;
    const hs = reversed ? f.awayGoals : f.homeGoals;
    const as = reversed ? f.homeGoals : f.awayGoals;

    let penWinner: string | null = null;
    if (f.statusShort === "PEN" && f.penHome !== null && f.penAway !== null) {
      // Ganador de penales por código (independiente de la orientación).
      penWinner = f.penHome > f.penAway ? f.homeAbbr : f.awayAbbr;
    }

    if (m.homeScore === hs && m.awayScore === as && m.penaltiesWinner === penWinner) continue;
    await applyResult(m.id, hs, as, penWinner);
    updated++;
  }

  if (updated > 0) revalidateAll();
  return { checked: matches.length, updated, finished: finished.length, skipped: false };
}

/**
 * Corrige el horario (scheduledAt) de los partidos mapeados usando la fecha real
 * de ESPN (UTC). Útil porque el seed original guardó algunas horas con la zona
 * horaria de la máquina que lo ejecutó (quedaron corridas ~1 h).
 */
export async function syncKickoffs(): Promise<{ checked: number; updated: number }> {
  const fixtures = await fetchWorldCupFixtures();
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true, scheduledAt: true },
  });

  let updated = 0;
  for (const m of matches) {
    const f = byId.get(m.externalId!);
    if (!f?.date) continue;
    const espnAt = new Date(f.date);
    if (Number.isNaN(espnAt.getTime())) continue;
    // Solo si difiere más de 1 minuto (evita escrituras por segundos de desfase).
    if (Math.abs(espnAt.getTime() - m.scheduledAt.getTime()) <= 60_000) continue;
    await prisma.match.update({ where: { id: m.id }, data: { scheduledAt: espnAt } });
    updated++;
  }

  if (updated > 0) {
    revalidatePath("/admin/partidos");
    revalidatePath("/partidos");
    revalidatePath("/resultados");
    revalidatePath("/");
  }
  return { checked: matches.length, updated };
}

// ─── Auto-mapeo de fixtures por código de equipo (abreviatura ESPN = code FIFA) ──

/** Asigna externalId a los partidos (con equipos definidos) que aún no lo tienen, por código. */
/**
 * Sincroniza resultados de partidos de hoy/ayer al vuelo — se llama desde server components.
 * Solo toca ESPN cuando hay partidos sin resultado que ya deberían haber terminado.
 * En días sin partidos o antes del kickoff retorna en <30ms (solo una query a BD).
 */
export async function syncTodayIfNeeded(): Promise<{ updated: number; skipped: boolean }> {
  const now = Date.now();

  const pending = await prisma.match.findMany({
    where: {
      externalId: { not: null },
      homeScore: null,
      scheduledAt: { gte: new Date(now - 25 * 60 * 60 * 1000) },
    },
    select: {
      id: true, externalId: true, scheduledAt: true, homeScore: true, awayScore: true, penaltiesWinner: true,
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
    },
  });

  if (pending.length === 0) return { updated: 0, skipped: true };

  const hasDue = pending.some((m) => now - m.scheduledAt.getTime() >= DUE_MIN_MS);
  if (!hasDue) return { updated: 0, skipped: true };

  // Rango estrecho: solo ayer + hoy (vs la temporada completa del cron)
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, "");
  const dateRange = `${fmt(now - 86_400_000)}-${fmt(now)}`;

  const fixtures = await fetchWorldCupFixtures(dateRange);
  const byId = new Map(
    fixtures
      .filter((f) => isFinished(f.statusShort) && f.homeGoals !== null && f.awayGoals !== null)
      .map((f) => [f.id, f]),
  );

  let updated = 0;
  for (const m of pending) {
    const f = byId.get(m.externalId!);
    if (!f || f.homeGoals === null || f.awayGoals === null) continue;

    const ourHome = m.homeTeam?.code ?? null;
    const ourAway = m.awayTeam?.code ?? null;
    if (ourHome && ourAway) {
      const sameTeams =
        (f.homeAbbr === ourHome && f.awayAbbr === ourAway) ||
        (f.homeAbbr === ourAway && f.awayAbbr === ourHome);
      if (!sameTeams) continue;
    }

    const reversed = !!ourHome && !!ourAway && f.homeAbbr === ourAway && f.awayAbbr === ourHome;
    const hs = reversed ? f.awayGoals : f.homeGoals;
    const as_ = reversed ? f.homeGoals : f.awayGoals;
    const penWinner =
      f.statusShort === "PEN" && f.penHome !== null && f.penAway !== null
        ? f.penHome > f.penAway ? f.homeAbbr : f.awayAbbr
        : null;

    if (m.homeScore === hs && m.awayScore === as_ && m.penaltiesWinner === penWinner) continue;
    await applyResult(m.id, hs, as_, penWinner);
    updated++;
  }

  if (updated > 0) revalidateAll();
  return { updated, skipped: false };
}

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
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
    },
  });

  let mapped = 0;
  const unmapped: number[] = [];

  for (const m of matches) {
    const hc = m.homeTeam?.code;
    const ac = m.awayTeam?.code;
    if (!hc || !ac) { unmapped.push(m.matchNumber); continue; }

    const hit = fixtures.find((f) => {
      if (used.has(f.id)) return false;
      return (f.homeAbbr === hc && f.awayAbbr === ac) || (f.homeAbbr === ac && f.awayAbbr === hc);
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
