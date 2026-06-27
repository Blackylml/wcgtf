"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MatchPick, Module } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getModuleAccess, moduleLockAt, isLocked } from "@/lib/module-access";
import { quinielaRange, koQuinielaStages } from "@/lib/modules";

export async function saveKoTiebreaker(
  module: Module,
  data: { topScorerTeam: string | null; firstHalfGoals: number | null; earliestGoalTeam: string | null },
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, module);
  if (!access.entered) return { error: "Primero paga la entrada" };
  if (isLocked(await moduleLockAt(module))) return { error: "La quiniela ya cerró" };

  await prisma.koTiebreaker.upsert({
    where: { userId_module: { userId, module } },
    create: { userId, module, ...data },
    update: data,
  });
  revalidatePath(`/partidos/${module}`);
  return { success: true };
}

// Las apuestas individuales / eliminatorias viven en la bolsa de eliminatorias.
const KO_POOL: Module = "MATCHES";

/**
 * Guarda toda la quiniela de una bolsa de un jalón (upsert de cada pronóstico).
 * Cada bolsa (module) guarda sus propios picks (poolModule), independientes entre bolsas.
 */
export async function saveQuinielaBets(module: Module, picks: { matchId: string; pick: MatchPick }[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, module);
  if (!access.entered) return { error: "Primero paga la entrada de esta quiniela" };
  if (isLocked(await moduleLockAt(module))) return { error: "La quiniela ya cerró (empezó el primer partido)" };

  const range = quinielaRange(module);
  const koStages = koQuinielaStages(module);
  const matches = await prisma.match.findMany({
    where: { id: { in: picks.map((p) => p.matchId) } },
    select: { id: true, stage: true, matchNumber: true, penaltiesAllowed: true },
  });
  const byId = new Map(matches.map((m) => [m.id, m]));

  for (const { matchId, pick } of picks) {
    const m = byId.get(matchId);
    if (!m) continue;
    const inPool = range
      ? m.stage === "GROUP" && m.matchNumber >= range.min && m.matchNumber <= range.max
      : koStages
      ? (koStages as string[]).includes(m.stage)
      : m.stage !== "GROUP";
    if (!inPool) continue;
    if (pick === "DRAW" && m.stage !== "GROUP" && !m.penaltiesAllowed) continue;
    await prisma.matchBet.upsert({
      where: { userId_matchId_poolModule: { userId, matchId, poolModule: module } },
      create: { userId, matchId, pick, poolModule: module },
      update: { pick },
    });
  }

  revalidatePath("/partidos");
  return { success: true };
}

/**
 * Crea la apuesta de un partido de ELIMINATORIAS (bolsa MATCHES).
 * - Partido con precio propio (> 0) → apuesta INDIVIDUAL: crea un Payment por la apuesta.
 * - Partido sin precio → cubierto por la entrada de eliminatorias.
 */
export async function createMatchBet(matchId: string, pick: MatchPick) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "Este partido no está abierto" };
  if (!match.penaltiesAllowed && pick === "DRAW" && match.stage !== "GROUP")
    return { error: "Empate no disponible en esta fase" };

  const price = Number(match.price);
  // Individual (partido destacado, precio propio) → bolsa aparte (poolModule null, no entra al ranking de quinielas).
  // Cubierto por eliminatorias (sin precio) → bolsa MATCHES.
  const pool = price > 0 ? null : KO_POOL;

  const existing = await prisma.matchBet.findFirst({ where: { userId, matchId, poolModule: pool } });
  if (existing) return { error: "Ya tienes una apuesta en este partido" };

  if (price > 0) {
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.matchBet.create({ data: { userId, matchId, pick, poolModule: null, paymentId: payment.id } });
    revalidatePath("/partidos");
    return { individual: true, price };
  }

  const access = await getModuleAccess(userId, KO_POOL);
  if (!access.entered) return { error: "Primero paga la entrada de esta quiniela" };
  await prisma.matchBet.create({ data: { userId, matchId, pick, poolModule: KO_POOL } });
  revalidatePath("/partidos");
  return { individual: false };
}

/** Genera la URL de MercadoPago para la apuesta individual de un partido (eliminatorias). */
export async function getMatchMPUrl(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bet = await prisma.matchBet.findFirst({
    where: { userId, matchId, poolModule: null },
    include: { payment: true, match: true },
  });
  if (!bet?.payment) return { error: "No se encontró la apuesta o el pago" };
  if (bet.payment.status !== "PENDING") return { error: "El pago ya no está pendiente" };
  if (!process.env.MP_ACCESS_TOKEN) return { error: "MercadoPago no configurado" };

  const { createPreference } = await import("@/lib/mercadopago");
  const homeLabel = bet.match.homeLabel ?? "Local";
  const awayLabel = bet.match.awayLabel ?? "Visitante";
  let pref;
  try {
    pref = await createPreference({
      title: `Apuesta M${bet.match.matchNumber} ${homeLabel} vs ${awayLabel}`,
      amount: Number(bet.payment.amount),
      userId,
      paymentId: bet.payment.id,
      backUrl: `${process.env.AUTH_URL}/partidos`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("MP createPreference error:", msg);
    return { error: `Error al crear preferencia MP: ${msg}` };
  }
  if (!pref.init_point) return { error: "MercadoPago no devolvió URL de pago" };
  await prisma.payment.update({ where: { id: bet.payment.id }, data: { mpPreferenceId: pref.id } });
  return { redirectUrl: pref.init_point };
}

/** Borra la apuesta de eliminatorias (y su pago individual si lo tiene y no fue aprobado). */
export async function deleteMatchBet(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "No puedes cambiar tu apuesta con el partido cerrado" };

  const pool = Number(match.price) > 0 ? null : KO_POOL;
  const bet = await prisma.matchBet.findFirst({
    where: { userId, matchId, poolModule: pool },
    include: { payment: true },
  });
  if (!bet) return { error: "No tienes apuesta en este partido" };
  if (bet.payment?.status === "APPROVED") return { error: "El pago ya fue aprobado, contacta al admin" };

  await prisma.matchBet.delete({ where: { id: bet.id } });
  if (bet.paymentId) await prisma.payment.delete({ where: { id: bet.paymentId } });
  revalidatePath("/partidos");
  return { success: true };
}
