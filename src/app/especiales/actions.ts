"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { SpecialCategory } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getModuleAccess } from "@/lib/module-access";

/** Crea la apuesta especial (gratis; la entrada al módulo se paga aparte). */
export async function createSpecialBet(category: SpecialCategory, playerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, "SPECIALS");
  if (!access.entered) return { error: "Primero entra a Premios Especiales" };

  const pool = await prisma.specialPool.findUnique({ where: { category } });
  if (!pool?.isOpen) return { error: "Esta categoría no está abierta" };

  const existing = await prisma.specialBet.findUnique({ where: { userId_category: { userId, category } } });
  if (existing) return { error: "Ya tienes una apuesta en esta categoría" };

  await prisma.specialBet.create({ data: { userId, category, playerId } });
  revalidatePath("/especiales");
  return { success: true };
}

/** Borra la apuesta especial si la categoría sigue abierta. */
export async function deleteSpecialBet(category: SpecialCategory) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const pool = await prisma.specialPool.findUnique({ where: { category } });
  if (!pool?.isOpen) return { error: "No puedes cambiar tu apuesta con la categoría cerrada" };

  await prisma.specialBet.deleteMany({ where: { userId, category } });
  revalidatePath("/especiales");
  return { success: true };
}
