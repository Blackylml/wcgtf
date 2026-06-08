"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

type Prediction = { teamId: string; position: number };

/** Paso 1: valida y crea las 4 apuestas + un pago PENDING (si hay precio). */
export async function createGroupBet(groupPoolId: string, predictions: Prediction[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const group = await prisma.groupPool.findUnique({ where: { id: groupPoolId } });
  if (!group?.isOpen) return { error: "Este grupo no está abierto para apuestas" };

  const existing = await prisma.groupBet.findFirst({ where: { userId, groupPoolId } });
  if (existing) return { error: "Ya tienes una apuesta en este grupo" };

  if (predictions.length !== 4) return { error: "Debes predecir los 4 lugares" };
  if (new Set(predictions.map((p) => p.position)).size !== 4) return { error: "No puedes repetir posiciones" };
  if (new Set(predictions.map((p) => p.teamId)).size !== 4) return { error: "No puedes repetir equipos" };

  const price = Number(group.price);

  if (price > 0) {
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.groupBet.createMany({
      data: predictions.map((p) => ({ userId, groupPoolId, teamId: p.teamId, position: p.position, paymentId: payment.id })),
    });
    revalidatePath("/grupos");
    return { price };
  }

  await prisma.groupBet.createMany({
    data: predictions.map((p) => ({ userId, groupPoolId, teamId: p.teamId, position: p.position })),
  });
  revalidatePath("/grupos");
  return { price: 0 };
}

/** Paso 2: genera la URL de MercadoPago para el pago pendiente de este grupo. */
export async function getGroupMPUrl(groupPoolId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bet = await prisma.groupBet.findFirst({
    where: { userId, groupPoolId },
    include: { payment: true, groupPool: true },
  });
  if (!bet?.payment) return { error: "No se encontró la apuesta o el pago" };
  if (bet.payment.status !== "PENDING") return { error: "El pago ya no está pendiente" };
  if (!process.env.MP_ACCESS_TOKEN) return { error: "MercadoPago no configurado" };

  const { createPreference } = await import("@/lib/mercadopago");
  let pref;
  try {
    pref = await createPreference({
      title: `Apuesta Grupo ${bet.groupPool.name} WCGTF 2026`,
      amount: Number(bet.payment.amount),
      userId,
      paymentId: bet.payment.id,
      backUrl: `${process.env.AUTH_URL}/grupos`,
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

/** Cancela la apuesta del grupo si sigue abierto y el pago no fue aprobado. */
export async function deleteGroupBet(groupPoolId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const group = await prisma.groupPool.findUnique({ where: { id: groupPoolId } });
  if (!group?.isOpen) return { error: "No puedes cancelar con el grupo cerrado" };

  const bets = await prisma.groupBet.findMany({
    where: { userId, groupPoolId },
    include: { payment: true },
  });
  if (bets.length === 0) return { error: "No tienes apuesta en este grupo" };
  if (bets[0].payment?.status === "APPROVED") return { error: "El pago ya fue aprobado, contacta al admin" };

  const paymentId = bets[0].paymentId;
  await prisma.groupBet.deleteMany({ where: { userId, groupPoolId } });
  if (paymentId) await prisma.payment.delete({ where: { id: paymentId } });
  revalidatePath("/grupos");
  return { success: true };
}
