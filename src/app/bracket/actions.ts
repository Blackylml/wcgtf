"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

type Predictions = Record<string, Record<string, string> | string>;

/** Paso 1: valida el bracket completo y crea la apuesta + pago PENDING (si hay precio). */
export async function createBracketBet(predictions: Predictions) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  if (!bracketSession?.isOpen) return { error: "Bracket cerrado" };

  const existing = await prisma.bracketBet.findUnique({
    where: { userId_bracketSessionId: { userId, bracketSessionId: bracketSession.id } },
  });
  if (existing) return { error: "Ya enviaste tu bracket" };

  const config = bracketSession.config as { R32: [string, string][] } | null;
  if (!config?.R32?.length) return { error: "El bracket no está configurado aún" };

  const n = config.R32.length;
  const r32 = (predictions.R32 ?? {}) as Record<string, string>;
  const r16 = (predictions.R16 ?? {}) as Record<string, string>;
  const qf = (predictions.QF ?? {}) as Record<string, string>;
  const sf = (predictions.SF ?? {}) as Record<string, string>;
  const count = (o: Record<string, string>) => Object.values(o).filter(Boolean).length;

  if (count(r32) !== n) return { error: "Completa todos los partidos de la Ronda de 32" };
  if (count(r16) !== Math.floor(n / 2)) return { error: "Completa la Ronda de 16" };
  if (count(qf) !== Math.floor(n / 4)) return { error: "Completa los Cuartos" };
  if (count(sf) !== Math.floor(n / 8)) return { error: "Completa las Semifinales" };
  if (!predictions.THIRD || !predictions.FINAL) return { error: "Elige tercer lugar y campeón" };

  const price = Number(bracketSession.price);

  if (price > 0) {
    const payment = await prisma.payment.create({ data: { userId, amount: price, status: "PENDING" } });
    await prisma.bracketBet.create({
      data: { userId, bracketSessionId: bracketSession.id, predictions, paymentId: payment.id },
    });
    revalidatePath("/bracket");
    return { price };
  }

  await prisma.bracketBet.create({
    data: { userId, bracketSessionId: bracketSession.id, predictions },
  });
  revalidatePath("/bracket");
  return { price: 0 };
}

/** Paso 2: genera la URL de MercadoPago para el pago pendiente del bracket. */
export async function getBracketMPUrl() {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  if (!bracketSession) return { error: "Bracket no disponible" };

  const bet = await prisma.bracketBet.findUnique({
    where: { userId_bracketSessionId: { userId, bracketSessionId: bracketSession.id } },
    include: { payment: true },
  });
  if (!bet?.payment) return { error: "No se encontró la apuesta o el pago" };
  if (bet.payment.status !== "PENDING") return { error: "El pago ya no está pendiente" };
  if (!process.env.MP_ACCESS_TOKEN) return { error: "MercadoPago no configurado" };

  const { createPreference } = await import("@/lib/mercadopago");
  let pref;
  try {
    pref = await createPreference({
      title: "Bracket Eliminatorias WCGTF 2026",
      amount: Number(bet.payment.amount),
      userId,
      paymentId: bet.payment.id,
      backUrl: `${process.env.AUTH_URL}/bracket`,
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

/** Cancela el bracket si la sesión sigue abierta y el pago no fue aprobado. */
export async function deleteBracketBet() {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  if (!bracketSession?.isOpen) return { error: "No puedes cancelar con el bracket cerrado" };

  const bet = await prisma.bracketBet.findUnique({
    where: { userId_bracketSessionId: { userId, bracketSessionId: bracketSession.id } },
    include: { payment: true },
  });
  if (!bet) return { error: "No tienes bracket enviado" };
  if (bet.payment?.status === "APPROVED") return { error: "El pago ya fue aprobado, contacta al admin" };

  await prisma.bracketBet.delete({ where: { id: bet.id } });
  if (bet.paymentId) await prisma.payment.delete({ where: { id: bet.paymentId } });
  revalidatePath("/bracket");
  return { success: true };
}
