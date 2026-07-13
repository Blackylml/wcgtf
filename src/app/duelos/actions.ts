"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

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
