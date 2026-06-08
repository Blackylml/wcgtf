"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

type Prediction = { teamId: string; position: number };

export async function submitGroupBet(groupPoolId: string, predictions: Prediction[]) {
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

    if (process.env.MP_ACCESS_TOKEN) {
      const { createPreference } = await import("@/lib/mercadopago");
      const pref = await createPreference({
        title: `Apuesta Grupo ${group.name} WCGTF 2026`,
        amount: price,
        userId,
        paymentId: payment.id,
        backUrl: `${process.env.AUTH_URL}/grupos`,
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
      return { redirectUrl: pref.init_point };
    }

    revalidatePath("/grupos");
    return { success: true, pending: true };
  }

  await prisma.groupBet.createMany({
    data: predictions.map((p) => ({ userId, groupPoolId, teamId: p.teamId, position: p.position })),
  });
  revalidatePath("/grupos");
  return { success: true };
}
