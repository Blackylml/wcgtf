"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { SpecialCategory } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

const CAT_LABELS: Record<SpecialCategory, string> = {
  TOP_SCORER: "Goleador",
  BEST_PLAYER: "Jugador del Torneo",
  BEST_GOALKEEPER: "Mejor Portero",
  BEST_YOUNG_PLAYER: "Mejor Joven",
};

/** Paso 1: crea la apuesta y un pago PENDING (si hay precio). */
export async function createSpecialBet(category: SpecialCategory, playerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const pool = await prisma.specialPool.findUnique({ where: { category } });
  if (!pool?.isOpen) return { error: "Esta categoría no está abierta" };

  const existing = await prisma.specialBet.findUnique({
    where: { userId_category: { userId, category } },
  });
  if (existing) return { error: "Ya tienes una apuesta en esta categoría" };

  const price = Number(pool.price);

  if (price > 0) {
    const payment = await prisma.payment.create({
      data: { userId, amount: price, status: "PENDING" },
    });
    await prisma.specialBet.create({
      data: { userId, category, playerId, paymentId: payment.id },
    });
    revalidatePath("/especiales");
    return { price };
  }

  await prisma.specialBet.create({ data: { userId, category, playerId } });
  revalidatePath("/especiales");
  return { price: 0 };
}

/** Paso 2a: genera URL de MercadoPago para la apuesta ya creada. */
export async function getSpecialMPUrl(category: SpecialCategory) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bet = await prisma.specialBet.findUnique({
    where: { userId_category: { userId, category } },
    include: { payment: true },
  });
  if (!bet?.payment) return { error: "No se encontró la apuesta o el pago" };
  if (bet.payment.status !== "PENDING") return { error: "El pago ya no está pendiente" };

  if (!process.env.MP_ACCESS_TOKEN) return { error: "MercadoPago no configurado" };

  const { createPreference } = await import("@/lib/mercadopago");
  const pref = await createPreference({
    title: `Apuesta ${CAT_LABELS[category]} WCGTF 2026`,
    amount: Number(bet.payment.amount),
    userId,
    paymentId: bet.payment.id,
    backUrl: `${process.env.AUTH_URL}/especiales`,
  });
  await prisma.payment.update({
    where: { id: bet.payment.id },
    data: { mpPreferenceId: pref.id },
  });
  return { redirectUrl: pref.sandbox_init_point ?? pref.init_point };
}

/** Cancela la apuesta si el pool sigue abierto y el pago no fue aprobado. */
export async function deleteSpecialBet(category: SpecialCategory) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const pool = await prisma.specialPool.findUnique({ where: { category } });
  if (!pool?.isOpen) return { error: "No puedes cancelar una apuesta con el pool cerrado" };

  const bet = await prisma.specialBet.findUnique({
    where: { userId_category: { userId, category } },
    include: { payment: true },
  });
  if (!bet) return { error: "No tienes apuesta en esta categoría" };
  if (bet.payment?.status === "APPROVED") return { error: "El pago ya fue aprobado, contacta al admin" };

  await prisma.specialBet.delete({ where: { id: bet.id } });
  if (bet.paymentId) {
    await prisma.payment.delete({ where: { id: bet.paymentId } });
  }
  revalidatePath("/especiales");
  return { success: true };
}
