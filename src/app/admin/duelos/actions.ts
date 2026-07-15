"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { executePairing } from "@/lib/duel-auto-pair";
import type { Module } from "../../../generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function configureTiebreaker(
  sessionId: string,
  hasTiebreaker: boolean,
  homeLabel: string,
  awayLabel: string,
  dateLabel: string,
  home2Label: string,
  away2Label: string,
  date2Label: string,
) {
  await requireAdmin();
  await prisma.duelSession.update({
    where: { id: sessionId },
    data: {
      hasTiebreaker,
      tbHomeLabel: homeLabel || null,
      tbAwayLabel: awayLabel || null,
      tbDateLabel: dateLabel || null,
      tb2HomeLabel: home2Label || null,
      tb2AwayLabel: away2Label || null,
      tb2DateLabel: date2Label || null,
    },
  });
  revalidatePath("/admin/duelos");
  revalidatePath("/duelos");
}

export async function setTiebreakerResults(
  sessionId: string,
  matchIdx: number,
  htResult: string,
  ftResult: string,
) {
  await requireAdmin();
  const data: Record<string, unknown> = {};
  if (matchIdx === 0) {
    if (htResult) data.tbHtResult = htResult;
    if (ftResult) data.tbFtResult = ftResult;
  } else {
    if (htResult) data.tb2HtResult = htResult;
    if (ftResult) data.tb2FtResult = ftResult;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.duelSession.update({ where: { id: sessionId }, data });
  revalidatePath("/admin/duelos");
  revalidatePath("/duelos");
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
 * Empareja aleatoriamente todos los participantes sin pareja.
 * Usa executePairing() que es atómica (safe ante doble-click).
 */
export async function pairDuelEntries(sessionId: string) {
  await requireAdmin();
  await executePairing(sessionId);
  revalidatePath("/admin/duelos");
  revalidatePath("/duelos");
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

  // Picks de desempate (matchIdx 0 y 1) indexados por userId
  const tbPicks = session.hasTiebreaker
    ? await prisma.duelTiebreakerPick.findMany({ where: { sessionId } })
    : [];
  // tbMap: userId → { 0: pick, 1: pick }
  const tbMap = new Map<string, Map<number, typeof tbPicks[0]>>();
  for (const p of tbPicks) {
    if (!tbMap.has(p.userId)) tbMap.set(p.userId, new Map());
    tbMap.get(p.userId)!.set(p.matchIdx, p);
  }

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
    else if (session.hasTiebreaker) {
      // Desempate: sumar picks correctos de ambos partidos (HT+FT × 2 = máx 4 pts)
      const tbScore = (userId: string) => {
        const picks = tbMap.get(userId);
        let score = 0;
        const p0 = picks?.get(0);
        if (p0 && session.tbHtResult) score += p0.htPick === session.tbHtResult ? 1 : 0;
        if (p0 && session.tbFtResult) score += p0.ftPick === session.tbFtResult ? 1 : 0;
        const p1 = picks?.get(1);
        if (p1 && session.tb2HtResult) score += p1.htPick === session.tb2HtResult ? 1 : 0;
        if (p1 && session.tb2FtResult) score += p1.ftPick === session.tb2FtResult ? 1 : 0;
        return score;
      };
      const ts1 = tbScore(pair.user1Id);
      const ts2 = tbScore(pair.user2Id);
      if (ts1 > ts2) winnerId = pair.user1Id;
      else if (ts2 > ts1) winnerId = pair.user2Id;
      // si aún empatan: dividir
    }

    const isTie = s1 === s2 && winnerId === null;
    const halfPrize = Number(pair.prizePool) / 2;

    txns.push(
      prisma.duelPair.update({
        where: { id: pair.id },
        data: { score1: s1, score2: s2, winnerId, prizeGiven: !!(winnerId || isTie) },
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
    } else if (isTie) {
      txns.push(
        prisma.user.update({ where: { id: pair.user1Id }, data: { credits: { increment: halfPrize } } }),
        prisma.user.update({ where: { id: pair.user2Id }, data: { credits: { increment: halfPrize } } }),
        prisma.creditTransaction.create({
          data: { userId: pair.user1Id, amount: halfPrize, type: "PRIZE_WIN", description: `Empate 1v1 — ${session.label}`, refId: pair.id },
        }),
        prisma.creditTransaction.create({
          data: { userId: pair.user2Id, amount: halfPrize, type: "PRIZE_WIN", description: `Empate 1v1 — ${session.label}`, refId: pair.id },
        }),
      );
    }
  }

  await prisma.$transaction(txns);
  revalidatePath("/admin/duelos");
}
