"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { Module } from "../../../generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function createDuelSession(
  module: Module,
  label: string,
  entryFee: number,
  houseCutPct: number,
) {
  await requireAdmin();
  await prisma.duelSession.create({
    data: { module, label, entryFee, houseCutPct },
  });
  revalidatePath("/admin/duelos");
}

export async function toggleDuelSession(id: string, current: boolean) {
  await requireAdmin();
  await prisma.duelSession.update({ where: { id }, data: { isOpen: !current } });
  revalidatePath("/admin/duelos");
}

/**
 * Empareja a todos los participantes sin pareja de forma aleatoria.
 * Si queda un número impar, el último recibe reembolso de créditos.
 */
export async function pairDuelEntries(sessionId: string) {
  await requireAdmin();

  const session = await prisma.duelSession.findUnique({
    where: { id: sessionId },
    include: { entries: { where: { paired: false, refunded: false } } },
  });
  if (!session) return;

  const unpaired = [...session.entries].sort(() => Math.random() - 0.5);
  const prize = Number(session.entryFee) * 2 * (1 - session.houseCutPct / 100);

  const pairs: Array<{ user1Id: string; user2Id: string }> = [];
  for (let i = 0; i + 1 < unpaired.length; i += 2) {
    pairs.push({ user1Id: unpaired[i].userId, user2Id: unpaired[i + 1].userId });
  }

  const leftover = unpaired.length % 2 === 1 ? unpaired[unpaired.length - 1] : null;

  await prisma.$transaction([
    // Crear pares
    ...pairs.map((p) =>
      prisma.duelPair.create({
        data: { sessionId, user1Id: p.user1Id, user2Id: p.user2Id, prizePool: prize },
      }),
    ),
    // Marcar entradas como emparejadas
    prisma.duelEntry.updateMany({
      where: { id: { in: unpaired.slice(0, pairs.length * 2).map((e) => e.id) } },
      data: { paired: true },
    }),
    // Reembolsar al sobrante (si lo hay)
    ...(leftover
      ? [
          prisma.duelEntry.update({ where: { id: leftover.id }, data: { refunded: true } }),
          prisma.user.update({
            where: { id: leftover.userId },
            data: { credits: { increment: session.entryFee } },
          }),
          prisma.creditTransaction.create({
            data: {
              userId: leftover.userId,
              amount: session.entryFee,
              type: "REFUND",
              description: `Reembolso: sin pareja en ${session.label}`,
              refId: sessionId,
            },
          }),
        ]
      : []),
    prisma.duelSession.update({ where: { id: sessionId }, data: { pairingDone: true } }),
  ]);

  revalidatePath("/admin/duelos");
}

/**
 * Calcula ganadores de cada par según puntos de quiniela y acredita el premio.
 * Llama después de que los resultados del módulo estén ingresados.
 */
export async function settleDuelPrizes(sessionId: string) {
  await requireAdmin();

  const pairs = await prisma.duelPair.findMany({
    where: { sessionId, prizeGiven: false },
    include: {
      session: true,
      user1: { select: { id: true } },
      user2: { select: { id: true } },
    },
  });

  const session = await prisma.duelSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  // Puntos de cada usuario en el módulo (MatchBets correctas)
  const allUserIds = [...new Set(pairs.flatMap((p) => [p.user1Id, p.user2Id]))];
  const bets = await prisma.matchBet.findMany({
    where: {
      poolModule: session.module,
      userId: { in: allUserIds },
      isCorrect: true,
    },
    select: { userId: true },
  });
  const scoreMap = new Map<string, number>();
  for (const b of bets) {
    scoreMap.set(b.userId, (scoreMap.get(b.userId) ?? 0) + 1);
  }

  const txns = [];
  for (const pair of pairs) {
    const s1 = scoreMap.get(pair.user1Id) ?? 0;
    const s2 = scoreMap.get(pair.user2Id) ?? 0;
    let winnerId: string | null = null;

    if (s1 > s2) winnerId = pair.user1Id;
    else if (s2 > s1) winnerId = pair.user2Id;
    // empate: nadie gana por ahora (quedará winnerId null, admin puede revisar)

    txns.push(
      prisma.duelPair.update({
        where: { id: pair.id },
        data: { score1: s1, score2: s2, winnerId, prizeGiven: !!winnerId },
      }),
    );

    if (winnerId) {
      txns.push(
        prisma.user.update({
          where: { id: winnerId },
          data: { credits: { increment: pair.prizePool } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: winnerId,
            amount: pair.prizePool,
            type: "PRIZE_WIN",
            description: `Premio 1v1 — ${session.label}`,
            refId: pair.id,
          },
        }),
      );
    }
  }

  await prisma.$transaction(txns);
  revalidatePath("/admin/duelos");
}
