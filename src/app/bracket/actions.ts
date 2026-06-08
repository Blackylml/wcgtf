"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getModuleAccess } from "@/lib/module-access";

type Predictions = Record<string, Record<string, string> | string>;

/** Crea el bracket completo (gratis; la entrada al módulo se paga aparte). */
export async function createBracketBet(predictions: Predictions) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const access = await getModuleAccess(userId, "BRACKET");
  if (!access.entered) return { error: "Primero entra al Bracket" };

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

  await prisma.bracketBet.create({
    data: { userId, bracketSessionId: bracketSession.id, predictions },
  });
  revalidatePath("/bracket");
  return { success: true };
}

/** Borra el bracket si la sesión sigue abierta. */
export async function deleteBracketBet() {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autenticado" };
  const userId = session.user.id;

  const bracketSession = await prisma.bracketSession.findFirst();
  if (!bracketSession?.isOpen) return { error: "No puedes cambiar tu bracket con la sesión cerrada" };

  await prisma.bracketBet.deleteMany({ where: { userId, bracketSessionId: bracketSession.id } });
  revalidatePath("/bracket");
  return { success: true };
}
