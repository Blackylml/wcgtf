"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getModuleAccess } from "@/lib/module-access";

type Prediction = { teamId: string; position: number };

/** Crea las 4 predicciones del grupo (gratis; la entrada al módulo se paga aparte). */
export async function createGroupBet(groupPoolId: string, predictions: Prediction[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, "GROUPS");
  if (!access.entered) return { error: "Primero entra a Fase de Grupos" };

  const group = await prisma.groupPool.findUnique({ where: { id: groupPoolId } });
  if (!group?.isOpen) return { error: "Este grupo no está abierto para apuestas" };

  const existing = await prisma.groupBet.findFirst({ where: { userId, groupPoolId } });
  if (existing) return { error: "Ya tienes una apuesta en este grupo" };

  if (predictions.length !== 4) return { error: "Debes predecir los 4 lugares" };
  if (new Set(predictions.map((p) => p.position)).size !== 4) return { error: "No puedes repetir posiciones" };
  if (new Set(predictions.map((p) => p.teamId)).size !== 4) return { error: "No puedes repetir equipos" };

  await prisma.groupBet.createMany({
    data: predictions.map((p) => ({ userId, groupPoolId, teamId: p.teamId, position: p.position })),
  });
  revalidatePath("/grupos");
  return { success: true };
}

/** Borra la apuesta del grupo si sigue abierto. */
export async function deleteGroupBet(groupPoolId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const group = await prisma.groupPool.findUnique({ where: { id: groupPoolId } });
  if (!group?.isOpen) return { error: "No puedes cambiar tu apuesta con el grupo cerrado" };

  await prisma.groupBet.deleteMany({ where: { userId, groupPoolId } });
  revalidatePath("/grupos");
  return { success: true };
}
