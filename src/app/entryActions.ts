"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Module } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { MODULE_META } from "@/lib/modules";

/** Crea la ENTRADA al módulo (un Payment con `module`) en estado PENDING. */
export async function createModuleEntry(module: Module) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const settings = await prisma.moduleSettings.findUnique({ where: { module } });
  const price = Number(settings?.price ?? 0);
  if (price <= 0) return { error: "Este módulo es gratis" };
  if (settings && !settings.entryOpen) return { error: "La entrada a este módulo está cerrada" };

  const existing = await prisma.payment.findFirst({
    where: { userId, module, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) return { error: "Ya tienes una entrada a este módulo" };

  await prisma.payment.create({ data: { userId, module, amount: price, status: "PENDING" } });
  revalidatePath(MODULE_META[module].path);
  return { price };
}

/** Genera la URL de MercadoPago para la entrada pendiente del módulo. */
export async function getModuleEntryMPUrl(module: Module) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const payment = await prisma.payment.findFirst({
    where: { userId, module, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return { error: "No se encontró una entrada pendiente" };
  if (!process.env.MP_ACCESS_TOKEN) return { error: "MercadoPago no configurado" };

  const { createPreference } = await import("@/lib/mercadopago");
  let pref;
  try {
    pref = await createPreference({
      title: `Entrada ${MODULE_META[module].label} WCGTF 2026`,
      amount: Number(payment.amount),
      userId,
      paymentId: payment.id,
      backUrl: `${process.env.AUTH_URL}${MODULE_META[module].path}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("MP createPreference error:", msg);
    return { error: `Error al crear preferencia MP: ${msg}` };
  }
  if (!pref.init_point) return { error: "MercadoPago no devolvió URL de pago" };
  await prisma.payment.update({ where: { id: payment.id }, data: { mpPreferenceId: pref.id } });
  return { redirectUrl: pref.init_point };
}

/** Cancela la entrada al módulo si el pago no fue aprobado (las apuestas se conservan). */
export async function deleteModuleEntry(module: Module) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const payment = await prisma.payment.findFirst({
    where: { userId, module, status: { in: ["PENDING", "REJECTED", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return { error: "No hay entrada que cancelar" };

  await prisma.payment.delete({ where: { id: payment.id } });
  revalidatePath(MODULE_META[module].path);
  return { success: true };
}
