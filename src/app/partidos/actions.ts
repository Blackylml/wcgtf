"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MatchPick } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getModuleAccess } from "@/lib/module-access";

/** Crea la apuesta del partido (gratis; la entrada al módulo se paga aparte). */
export async function createMatchBet(matchId: string, pick: MatchPick) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, "MATCHES");
  if (!access.entered) return { error: "Primero entra a Partidos" };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "Este partido no está abierto" };
  if (!match.penaltiesAllowed && pick === "DRAW" && match.stage !== "GROUP")
    return { error: "Empate no disponible en esta fase" };

  const existing = await prisma.matchBet.findUnique({ where: { userId_matchId: { userId, matchId } } });
  if (existing) return { error: "Ya tienes una apuesta en este partido" };

  await prisma.matchBet.create({ data: { userId, matchId, pick } });
  revalidatePath("/partidos");
  return { success: true };
}

/** Borra la apuesta del partido si sigue abierto. */
export async function deleteMatchBet(matchId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.isOpen) return { error: "No puedes cambiar tu apuesta con el partido cerrado" };

  await prisma.matchBet.deleteMany({ where: { userId, matchId } });
  revalidatePath("/partidos");
  return { success: true };
}
