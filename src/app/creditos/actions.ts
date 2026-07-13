"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { createPreference } from "@/lib/mercadopago";

const MIN_TOPUP = 50; // MXN mínimo

/** Crea un Payment de tipo topup y devuelve la URL de MercadoPago. */
export async function initCreditTopup(amount: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  if (amount < MIN_TOPUP) return { error: `El mínimo de recarga es $${MIN_TOPUP} MXN` };
  if (!process.env.MP_ACCESS_TOKEN) return { error: "Pagos con tarjeta no disponibles" };

  const payment = await prisma.payment.create({
    data: { userId, amount, status: "PENDING", isCreditTopup: true },
  });

  let pref;
  try {
    pref = await createPreference({
      title: `Recarga de créditos`,
      amount,
      userId,
      paymentId: payment.id,
      backUrl: `${process.env.AUTH_URL}/creditos`,
    });
  } catch (e: unknown) {
    await prisma.payment.delete({ where: { id: payment.id } });
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Error MP: ${msg}` };
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
  return { redirectUrl: pref.init_point };
}
