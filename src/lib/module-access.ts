import { prisma } from "@/lib/prisma";
import type { Module } from "@/generated/prisma/client";
import { ALL_MODULES, GROUP_MATCH_QUINIELAS } from "@/lib/modules";

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
  return null;
}

export function isLocked(lockAt: Date | null): boolean {
  return lockAt != null && Date.now() >= lockAt.getTime();
}

export type Participant = { id: string; name: string; image: string | null };

/**
 * Participantes CONFIRMADOS de una bolsa/quiniela:
 * - bolsa de paga → usuarios con pago APROBADO de ese módulo.
 * - bolsa gratis → usuarios que ya hicieron al menos una apuesta en ella.
 */
export async function getConfirmedParticipants(module: Module): Promise<Participant[]> {
  const settings = await prisma.moduleSettings.findUnique({ where: { module } });
  const priced = Number(settings?.price ?? 0) > 0;
  const sel = { id: true, name: true, email: true, image: true } as const;

  const dedupe = (users: { id: string; name: string | null; email: string | null; image: string | null }[]) => {
    const map = new Map<string, Participant>();
    for (const u of users) if (!map.has(u.id)) map.set(u.id, { id: u.id, name: u.name ?? u.email ?? "—", image: u.image ?? null });
    return [...map.values()];
  };

  if (priced) {
    const pays = await prisma.payment.findMany({
      where: { module, status: "APPROVED" },
      select: { user: { select: sel } },
    });
    return dedupe(pays.map((p) => p.user));
  }

  // Bolsa gratis → quien tenga apuesta en ella.
  if (module === "GROUPS") {
    const r = await prisma.groupBet.findMany({ select: { user: { select: sel } } });
    return dedupe(r.map((x) => x.user));
  }
  if (module === "SPECIALS") {
    const r = await prisma.specialBet.findMany({ select: { user: { select: sel } } });
    return dedupe(r.map((x) => x.user));
  }
  if (module === "BRACKET") {
    const r = await prisma.bracketBet.findMany({ select: { user: { select: sel } } });
    return dedupe(r.map((x) => x.user));
  }
  const r = await prisma.matchBet.findMany({ where: { poolModule: module }, select: { user: { select: sel } } });
  return dedupe(r.map((x) => x.user));
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
