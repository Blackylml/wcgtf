"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function submitBracketBet(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  if (!bracketSession?.isOpen) return { error: "Bracket cerrado" };

  const existing = await prisma.bracketBet.findUnique({
    where: { userId_bracketSessionId: { userId, bracketSessionId: bracketSession.id } },
  });
  if (existing) return { error: "Ya enviaste tu bracket" };

  const config = bracketSession.config as { R32: [string, string][] } | null;
  if (!config?.R32?.length) return { error: "El bracket no está configurado aún" };

  // Build predictions from formData
  const predictions: Record<string, Record<string, string> | string> = {};

  // R32 picks
  const r32: Record<string, string> = {};
  for (let i = 0; i < 16; i++) {
    const pick = formData.get(`R32_${i}`) as string;
    if (pick) r32[String(i)] = pick;
  }
  predictions.R32 = r32;

  // R16 picks
  const r16: Record<string, string> = {};
  for (let i = 0; i < 8; i++) {
    const pick = formData.get(`R16_${i}`) as string;
    if (pick) r16[String(i)] = pick;
  }
  predictions.R16 = r16;

  // QF picks
  const qf: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const pick = formData.get(`QF_${i}`) as string;
    if (pick) qf[String(i)] = pick;
  }
  predictions.QF = qf;

  // SF picks
  const sf: Record<string, string> = {};
  for (let i = 0; i < 2; i++) {
    const pick = formData.get(`SF_${i}`) as string;
    if (pick) sf[String(i)] = pick;
  }
  predictions.SF = sf;

  const third = formData.get("THIRD") as string;
  if (third) predictions.THIRD = third;

  const champion = formData.get("FINAL") as string;
  if (champion) predictions.FINAL = champion;

  const price = Number(bracketSession.price);

  if (price > 0) {
    // Create the pending payment and link the bracket bet to it.
    const payment = await prisma.payment.create({
      data: { userId, amount: price, status: "PENDING" },
    });
    await prisma.bracketBet.create({
      data: { userId, bracketSessionId: bracketSession.id, predictions, paymentId: payment.id },
    });

    // With MercadoPago configured, send the user to checkout. Otherwise the bet
    // stays PENDING and an admin approves it manually (same fallback as the other pools).
    if (process.env.MP_ACCESS_TOKEN) {
      const { createPreference } = await import("@/lib/mercadopago");
      try {
        const pref = await createPreference({
          title: "Bracket Eliminatorias WCGTF 2026",
          amount: price,
          userId,
          paymentId: payment.id,
          backUrl: `${process.env.AUTH_URL}/bracket`,
        });
        await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
        redirect(pref.init_point ?? "/bracket");
      } catch {
        redirect("/bracket");
      }
    }

    redirect("/bracket");
  }

  await prisma.bracketBet.create({
    data: { userId, bracketSessionId: bracketSession.id, predictions },
  });

  redirect("/bracket");
}
