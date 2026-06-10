"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MatchPick } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getModuleAccess } from "@/lib/module-access";
import { matchModule } from "@/lib/modules";

/**
 * Crea la apuesta del partido.
 * - Partido con precio propio (> 0) → apuesta INDIVIDUAL: crea un Payment por la apuesta.
 * - Partido sin precio → cubierto por la entrada del módulo Partidos (gratis).
 */
export async function createMatchBet(matchId: string, pick: MatchPick) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "Este partido no está abierto" };
  if (!match.penaltiesAllowed && pick === "DRAW" && match.stage !== "GROUP")
    return { error: "Empate no disponible en esta fase" };

  const existing = await prisma.matchBet.findUnique({ where: { userId_matchId: { userId, matchId } } });
  if (existing) return { error: "Ya tienes una apuesta en este partido" };

  const price = Number(match.price);

  if (price > 0) {
    // Apuesta individual: pago propio por este partido.
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.matchBet.create({ data: { userId, matchId, pick, paymentId: payment.id } });
    revalidatePath("/partidos");
    return { individual: true, price };
  }

  // Cubierto por la entrada de su quiniela (jornada de grupos o eliminatorias).
  const mod = matchModule(match.stage, match.matchNumber);
  const access = await getModuleAccess(userId, mod);
  if (!access.entered) return { error: "Primero paga la entrada de esta quiniela" };
  await prisma.matchBet.create({ data: { userId, matchId, pick } });
  revalidatePath("/partidos");
  return { individual: false };
}

/** Genera la URL de MercadoPago para la apuesta individual de un partido. */
export async function getMatchMPUrl(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bet = await prisma.matchBet.findUnique({
    where: { userId_matchId: { userId, matchId } },
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

/** Borra la apuesta del partido (y su pago individual si lo tiene y no fue aprobado). */
export async function deleteMatchBet(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "No puedes cambiar tu apuesta con el partido cerrado" };

  const bet = await prisma.matchBet.findUnique({
    where: { userId_matchId: { userId, matchId } },
    include: { payment: true },
  });
  if (!bet) return { error: "No tienes apuesta en este partido" };
  if (bet.payment?.status === "APPROVED") return { error: "El pago ya fue aprobado, contacta al admin" };

  await prisma.matchBet.delete({ where: { id: bet.id } });
  if (bet.paymentId) await prisma.payment.delete({ where: { id: bet.paymentId } });
  revalidatePath("/partidos");
  return { success: true };
}
