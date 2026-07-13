"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function grantCredits(userId: string, amount: number, description: string) {
  await requireAdmin();
  if (amount <= 0) return { error: "El monto debe ser positivo" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type: "DEPOSIT_ADMIN",
        description: description || "Abono manual por admin",
      },
    }),
  ]);

  revalidatePath("/admin/creditos");
  revalidatePath("/creditos");
}

export async function deductCredits(userId: string, amount: number, description: string) {
  await requireAdmin();
  if (amount <= 0) return { error: "El monto debe ser positivo" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user || Number(user.credits) < amount) return { error: "Saldo insuficiente" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "SPEND_ENTRY",
        description: description || "Descuento manual por admin",
      },
    }),
  ]);

  revalidatePath("/admin/creditos");
  revalidatePath("/creditos");
}
