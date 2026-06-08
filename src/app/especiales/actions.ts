"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { SpecialCategory } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function submitSpecialBet(category: SpecialCategory, playerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const pool = await prisma.specialPool.findUnique({ where: { category } });
  if (!pool?.isOpen) return { error: "Esta categoría no está abierta" };

  const existing = await prisma.specialBet.findUnique({ where: { userId_category: { userId, category } } });
  if (existing) return { error: "Ya tienes una apuesta en esta categoría" };

  const price = Number(pool.price);

  if (price > 0) {
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.specialBet.create({ data: { userId, category, playerId, paymentId: payment.id } });

    if (process.env.MP_ACCESS_TOKEN) {
      const { createPreference } = await import("@/lib/mercadopago");
      const catLabels: Record<SpecialCategory, string> = {
        TOP_SCORER: "Goleador", BEST_PLAYER: "Jugador del Torneo",
        BEST_GOALKEEPER: "Mejor Portero", BEST_YOUNG_PLAYER: "Mejor Joven",
      };
      const pref = await createPreference({
        title: `Apuesta ${catLabels[category]} WCGTF 2026`,
        amount: price,
        userId,
        paymentId: payment.id,
        backUrl: `${process.env.AUTH_URL}/especiales`,
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
      return { redirectUrl: pref.sandbox_init_point ?? pref.init_point };
    }

    revalidatePath("/especiales");
    return { success: true, pending: true };
  }

  await prisma.specialBet.create({ data: { userId, category, playerId } });
  revalidatePath("/especiales");
  return { success: true };
}
