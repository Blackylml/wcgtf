"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { MatchPick } from "@/generated/prisma/client";

export async function enterDuelSession(sessionId: string): Promise<{ error?: string }> {
  const sess = await auth();
  if (!sess?.user?.id) return { error: "No autenticado" };
  const userId = sess.user.id;

  const ds = await prisma.duelSession.findUnique({ where: { id: sessionId } });
  if (!ds) return { error: "Sesión no encontrada" };
  if (!ds.isOpen) return { error: "Inscripción cerrada" };
  if (ds.pairingDone) return { error: "El emparejamiento ya se realizó" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user) return { error: "Usuario no encontrado" };
  if (Number(user.credits) < Number(ds.entryFee)) {
    return { error: `Créditos insuficientes — necesitas $${Number(ds.entryFee).toFixed(0)}` };
  }

  try {
    await prisma.$transaction([
      prisma.duelEntry.create({ data: { sessionId, userId } }),
      prisma.user.update({ where: { id: userId }, data: { credits: { decrement: ds.entryFee } } }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -Number(ds.entryFee),
          type: "SPEND_ENTRY",
          description: `Entrada duelo: ${ds.label}`,
          refId: sessionId,
        },
      }),
    ]);
  } catch {
    return { error: "Ya estás inscrito en este duelo" };
  }

  revalidatePath("/duelos");
  return {};
}

export async function saveTiebreakerPick(
  sessionId: string,
  htPick: MatchPick,
  ftPick: MatchPick,
): Promise<{ error?: string }> {
  const sess = await auth();
  if (!sess?.user?.id) return { error: "No autenticado" };
  const userId = sess.user.id;

  const ds = await prisma.duelSession.findUnique({ where: { id: sessionId } });
  if (!ds) return { error: "Sesión no encontrada" };
  if (!ds.hasTiebreaker) return { error: "Esta sesión no tiene desempate" };
  // Bloquear si ya se conoce el resultado completo
  if (ds.tbFtResult !== null) return { error: "El resultado ya fue registrado" };

  // Solo usuarios inscritos pueden guardar pick de desempate
  const entry = await prisma.duelEntry.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!entry) return { error: "No estás inscrito en este duelo" };

  await prisma.duelTiebreakerPick.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, htPick, ftPick },
    update: { htPick, ftPick },
  });

  revalidatePath("/duelos");
  return {};
}
