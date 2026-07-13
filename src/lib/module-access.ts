import { prisma } from "@/lib/prisma";
import type { Module } from "@/generated/prisma/client";
import { ALL_MODULES, GROUP_MATCH_QUINIELAS, KO_QUINIELAS, LMX_JORNADAS } from "@/lib/modules";

/**
 * Momento en que la quiniela se cierra = arranque de su primer partido.
 * Solo aplica a quinielas basadas en partidos (jornadas de grupos y eliminatorias).
 * Devuelve null si el módulo no tiene partidos asociados (no se autocierra).
 */
export async function moduleLockAt(module: Module): Promise<Date | null> {
  const q = GROUP_MATCH_QUINIELAS.find((x) => x.module === module);
  if (q) {
    const first = await prisma.match.findFirst({
      where: { stage: "GROUP", matchNumber: { gte: q.min, lte: q.max } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    });
    return first?.scheduledAt ?? null;
  }
  if (module === "MATCHES") {
    const first = await prisma.match.findFirst({
      where: { stage: { not: "GROUP" } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    });
    return first?.scheduledAt ?? null;
  }
  const koQ = KO_QUINIELAS.find((x) => x.module === module);
  if (koQ) {
    const first = await prisma.match.findFirst({
      where: { stage: { in: koQ.stages } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    });
    return first?.scheduledAt ?? null;
  }
  return null;
}

export function isLocked(lockAt: Date | null): boolean {
  return lockAt != null && Date.now() >= lockAt.getTime();
}

export type LeaderRow = { id: string; name: string; image: string | null; points: number };

const userName = (u: { name: string | null; email: string | null }) => u.name ?? u.email ?? "—";

/**
 * Ranking de una bolsa/quiniela entre participantes CONFIRMADOS:
 * - bolsa de paga → usuarios con pago APROBADO de ese módulo.
 * - bolsa gratis → usuarios que ya hicieron al menos una apuesta en ella.
 * Ordenado por puntos (aciertos) descendente.
 */
export async function getQuinielaLeaderboard(module: Module): Promise<LeaderRow[]> {
  const settings = await prisma.moduleSettings.findUnique({ where: { module } });
  const priced = Number(settings?.price ?? 0) > 0;
  const sel = { id: true, name: true, email: true, image: true } as const;
  const pay = { where: { module, status: "APPROVED" as const }, select: { id: true } };
  const sort = (rows: LeaderRow[]) => rows.sort((a, b) => b.points - a.points);

  if (module === "GROUPS") {
    const users = await prisma.user.findMany({ select: { ...sel, payments: pay, groupBets: { select: { isCorrect: true } } } });
    return sort(users.filter((u) => (priced ? u.payments.length > 0 : u.groupBets.length > 0))
      .map((u) => ({ id: u.id, name: userName(u), image: u.image, points: u.groupBets.filter((b) => b.isCorrect === true).length })));
  }
  if (module === "SPECIALS") {
    const users = await prisma.user.findMany({ select: { ...sel, payments: pay, specialBets: { select: { isCorrect: true } } } });
    return sort(users.filter((u) => (priced ? u.payments.length > 0 : u.specialBets.length > 0))
      .map((u) => ({ id: u.id, name: userName(u), image: u.image, points: u.specialBets.filter((b) => b.isCorrect === true).length })));
  }
  if (module === "BRACKET") {
    const users = await prisma.user.findMany({ select: { ...sel, payments: pay, bracketBets: { select: { score: true } } } });
    return sort(users.filter((u) => (priced ? u.payments.length > 0 : u.bracketBets.length > 0))
      .map((u) => ({ id: u.id, name: userName(u), image: u.image, points: u.bracketBets.reduce((s, b) => s + b.score, 0) })));
  }
  // KO quinielas — mismo tipo de apuesta, pero con desempate por tiebreakers
  const isKO = KO_QUINIELAS.some((q) => q.module === module);
  if (isKO) {
    const [users, result, tiebreakers] = await Promise.all([
      prisma.user.findMany({ select: { ...sel, payments: pay, matchBets: { where: { poolModule: module }, select: { isCorrect: true } } } }),
      prisma.koRoundResult.findUnique({ where: { module } }),
      prisma.koTiebreaker.findMany({ where: { module }, select: { userId: true, topScorerTeam: true, firstHalfGoals: true, earliestGoalTeam: true } }),
    ]);
    const tbMap = new Map(tiebreakers.map((t) => [t.userId, t]));

    const rows = users
      .filter((u) => (priced ? u.payments.length > 0 : u.matchBets.length > 0))
      .map((u) => {
        const tb = tbMap.get(u.id);
        const points = u.matchBets.filter((b) => b.isCorrect === true).length;
        const tb1 = result?.topScorerTeam && tb?.topScorerTeam
          ? (tb.topScorerTeam === result.topScorerTeam ? 1 : 0) : 0;
        const tb2 = result?.firstHalfGoals != null && tb?.firstHalfGoals != null
          ? Math.abs(tb.firstHalfGoals - result.firstHalfGoals) : Infinity;
        const tb3 = result?.earliestGoalTeam && tb?.earliestGoalTeam
          ? (tb.earliestGoalTeam === result.earliestGoalTeam ? 1 : 0) : 0;
        return { id: u.id, name: userName(u), image: u.image, points, tb1, tb2, tb3 };
      });

    // puntos DESC → tb1 (acierto top scorer) DESC → tb2 (dif goles 1T) ASC → tb3 (acierto gol temprano) DESC
    rows.sort((a, b) =>
      b.points - a.points ||
      b.tb1 - a.tb1 ||
      (a.tb2 === Infinity ? 1 : b.tb2 === Infinity ? -1 : a.tb2 - b.tb2) ||
      b.tb3 - a.tb3
    );
    return rows.map(({ id, name, image, points }) => ({ id, name, image, points }));
  }

  // bolsa de partidos de grupos
  const users = await prisma.user.findMany({ select: { ...sel, payments: pay, matchBets: { where: { poolModule: module }, select: { isCorrect: true } } } });
  return sort(users.filter((u) => (priced ? u.payments.length > 0 : u.matchBets.length > 0))
    .map((u) => ({ id: u.id, name: userName(u), image: u.image, points: u.matchBets.filter((b) => b.isCorrect === true).length })));
}

// Jornadas de grupos en orden, con sus bolsas. La J2 tiene dos bolsas ($50 y Premio $250).
const STAR_JORNADAS: { key: string; label: string; range: [number, number]; pools: Module[] }[] = [
  { key: "j1", label: "Jornada 1", range: [1, 24], pools: ["MATCHES_G1"] },
  { key: "j2", label: "Jornada 2", range: [25, 48], pools: ["MATCHES_G2", "MATCHES_G2B"] },
  { key: "j3", label: "Jornada 3", range: [49, 72], pools: ["MATCHES_G3"] },
];

export type LastJornada = { key: string; label: string; winners: { id: string; name: string; image: string | null }[] };

/**
 * Info de la "jornada pasada" = la última jornada de grupos con TODOS sus partidos
 * resueltos: su etiqueta y ganador(es) (top de puntos, con empates; en la J2 ambas
 * bolsas). Devuelve null si aún no hay una jornada completa con puntos.
 */
export async function getLastJornadaInfo(): Promise<LastJornada | null> {
  const matches = await prisma.match.findMany({
    where: { stage: "GROUP" },
    select: { matchNumber: true, homeScore: true },
  });

  let target: (typeof STAR_JORNADAS)[number] | null = null;
  for (const j of STAR_JORNADAS) {
    const inRange = matches.filter((m) => m.matchNumber >= j.range[0] && m.matchNumber <= j.range[1]);
    if (inRange.length > 0 && inRange.every((m) => m.homeScore !== null)) target = j;
  }
  if (!target) return null;

  const winners = new Map<string, { name: string; image: string | null }>();
  for (const pool of target.pools) {
    const rows = await getQuinielaLeaderboard(pool);
    const top = rows[0]?.points ?? 0;
    if (top <= 0) continue;
    for (const r of rows) if (r.points === top) winners.set(r.id, { name: r.name, image: r.image });
  }
  if (winners.size === 0) return null;
  return { key: target.key, label: target.label, winners: [...winners].map(([id, w]) => ({ id, ...w })) };
}

/**
 * Ganador(es) de la jornada pasada como Set de ids (para la estrella en toda la app).
 */
export async function getLastJornadaWinners(): Promise<Set<string>> {
  const info = await getLastJornadaInfo();
  return new Set(info?.winners.map((w) => w.id) ?? []);
}

export type QuinielaStanding = { rank: number; total: number; points: number; ranked: boolean };

/**
 * Posición del usuario dentro de cada quiniela de jornada (entre quienes participan).
 * `ranked` = ya hay puntos en juego (resultados cargados); si no, solo cuenta participantes.
 */
export async function getGroupQuinielaRanks(userId: string): Promise<Record<string, QuinielaStanding | null>> {
  const [settings, users] = await Promise.all([
    prisma.moduleSettings.findMany(),
    prisma.user.findMany({
      select: {
        id: true,
        payments: { where: { module: { not: null }, status: "APPROVED" }, select: { module: true } },
        matchBets: { select: { isCorrect: true, poolModule: true } },
      },
    }),
  ]);
  const priced = new Set(settings.filter((s) => Number(s.price) > 0).map((s) => String(s.module)));
  const out: Record<string, QuinielaStanding | null> = {};

  for (const q of GROUP_MATCH_QUINIELAS) {
    const isFree = !priced.has(q.module);
    const rows = users
      .map((u) => {
        const inPool = u.matchBets.filter((b) => b.poolModule === q.module);
        const participates = isFree ? inPool.length > 0 : u.payments.some((p) => String(p.module) === q.module);
        const points = inPool.filter((b) => b.isCorrect === true).length;
        return { id: u.id, participates, points };
      })
      .filter((r) => r.participates);

    const mine = rows.find((r) => r.id === userId);
    if (!mine) { out[q.module] = null; continue; }
    const rank = rows.filter((r) => r.points > mine.points).length + 1;
    const ranked = rows.some((r) => r.points > 0);
    out[q.module] = { rank, total: rows.length, points: mine.points, ranked };
  }
  return out;
}

/** Posición del usuario en cada jornada regular de Liga MX (misma lógica que getGroupQuinielaRanks). */
export async function getLmxJornadaRanks(userId: string): Promise<Record<string, QuinielaStanding | null>> {
  const [settings, users] = await Promise.all([
    prisma.moduleSettings.findMany(),
    prisma.user.findMany({
      select: {
        id: true,
        payments:  { where: { module: { not: null }, status: "APPROVED" }, select: { module: true } },
        matchBets: { select: { isCorrect: true, poolModule: true } },
      },
    }),
  ]);
  const priced = new Set(settings.filter((s) => Number(s.price) > 0).map((s) => String(s.module)));
  const out: Record<string, QuinielaStanding | null> = {};

  for (const q of LMX_JORNADAS) {
    const isFree = !priced.has(q.module);
    const rows = users
      .map((u) => {
        const inPool = u.matchBets.filter((b) => b.poolModule === q.module);
        const participates = isFree ? inPool.length > 0 : u.payments.some((p) => String(p.module) === q.module);
        const points = inPool.filter((b) => b.isCorrect === true).length;
        return { id: u.id, participates, points };
      })
      .filter((r) => r.participates);

    const mine = rows.find((r) => r.id === userId);
    if (!mine) { out[q.module] = null; continue; }
    const rank   = rows.filter((r) => r.points > mine.points).length + 1;
    const ranked = rows.some((r) => r.points > 0);
    out[q.module] = { rank, total: rows.length, points: mine.points, ranked };
  }
  return out;
}

export type ModuleAccess = {
  price: number;
  entryOpen: boolean;
  paymentStatus: string | null;
  /** true si el usuario ya entró (pago pendiente o aprobado) o el módulo es gratis. */
  entered: boolean;
  /** true si el pago está aprobado o el módulo es gratis (sus apuestas suman). */
  approved: boolean;
};

/** Estado de acceso de un usuario a un módulo (para gates y para habilitar apuestas). */
export async function getModuleAccess(userId: string, module: Module): Promise<ModuleAccess> {
  const [settings, pay] = await Promise.all([
    prisma.moduleSettings.findUnique({ where: { module } }),
    prisma.payment.findFirst({
      where: { userId, module },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
  ]);

  const price = Number(settings?.price ?? 0);
  const entryOpen = settings?.entryOpen ?? true;

  if (price <= 0) {
    return { price: 0, entryOpen, paymentStatus: "APPROVED", entered: true, approved: true };
  }

  const paymentStatus = pay?.status ?? null;
  const entered = paymentStatus === "PENDING" || paymentStatus === "APPROVED";
  const approved = paymentStatus === "APPROVED";
  return { price, entryOpen, paymentStatus, entered, approved };
}

/** Conjunto de módulos cuyas apuestas suman para un usuario (pago aprobado o módulo gratis). */
export async function getApprovedModules(userId: string): Promise<Set<Module>> {
  const [settings, entries] = await Promise.all([
    prisma.moduleSettings.findMany(),
    prisma.payment.findMany({
      where: { userId, module: { not: null }, status: "APPROVED" },
      select: { module: true },
    }),
  ]);
  const priced = new Set(settings.filter((s) => Number(s.price) > 0).map((s) => s.module));
  const approvedPaid = new Set(entries.map((e) => e.module));
  const result = new Set<Module>();
  for (const m of ALL_MODULES) {
    if (!priced.has(m) || approvedPaid.has(m)) result.add(m);
  }
  return result;
}
