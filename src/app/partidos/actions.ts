"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MatchPick } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function submitMatchBet(matchId: string, pick: MatchPick) {
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
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.matchBet.create({ data: { userId, matchId, pick, paymentId: payment.id } });

    if (process.env.MP_ACCESS_TOKEN) {
      const { createPreference } = await import("@/lib/mercadopago");
      const homeLabel = match.homeLabel ?? "Local";
      const awayLabel = match.awayLabel ?? "Visitante";
      const pref = await createPreference({
        title: `Apuesta M${match.matchNumber} ${homeLabel} vs ${awayLabel}`,
        amount: price,
        userId,
        paymentId: payment.id,
        backUrl: `${process.env.AUTH_URL}/partidos`,
      });
      await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
      return { redirectUrl: pref.sandbox_init_point ?? pref.init_point };
    }

    revalidatePath("/partidos");
    return { success: true, pending: true };
  }

  await prisma.matchBet.create({ data: { userId, matchId, pick } });
  revalidatePath("/partidos");
  return { success: true };
}
