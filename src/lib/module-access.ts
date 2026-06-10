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
