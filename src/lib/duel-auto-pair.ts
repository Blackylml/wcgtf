import { prisma } from "./prisma";
import { LMX_JORNADAS } from "./modules";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Core pairing algorithm for one DuelSession.
 *
 * Uses an atomic DB claim (updateMany WHERE pairingDone=false) so concurrent
 * calls — from multiple page loads or cron overlaps — are safe: only one
 * writer will get count=1; the rest return false immediately.
 *
 * Side-effects on success:
 *  - session.isOpen → false, session.pairingDone → true
 *  - DuelPair rows created (shuffled random)
 *  - DuelEntry rows marked paired=true
 *  - Leftover user (odd count): DuelEntry.refunded=true + credits returned
 */
export async function executePairing(sessionId: string): Promise<boolean> {
  // Atomic claim: only one concurrent caller wins this.
  const claim = await prisma.duelSession.updateMany({
    where: { id: sessionId, pairingDone: false },
    data: { isOpen: false, pairingDone: true },
  });
  if (claim.count === 0) return false; // already paired by another call

  const session = await prisma.duelSession.findUnique({ where: { id: sessionId } });
  if (!session) return false;

  const entries = await prisma.duelEntry.findMany({
    where: { sessionId, paired: false, refunded: false },
  });

  // Fisher-Yates shuffle
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const pairCount = Math.floor(shuffled.length / 2);
  const prize = Number(session.entryFee) * 2 * (1 - session.houseCutPct / 100);

  // Build transaction ops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  for (let i = 0; i < pairCount; i++) {
    ops.push(
      prisma.duelPair.create({
        data: {
          sessionId,
          user1Id: shuffled[i * 2].userId,
          user2Id: shuffled[i * 2 + 1].userId,
          prizePool: prize,
        },
      }),
    );
  }

  if (pairCount > 0) {
    ops.push(
      prisma.duelEntry.updateMany({
        where: { id: { in: shuffled.slice(0, pairCount * 2).map((e) => e.id) } },
        data: { paired: true },
      }),
    );
  }

  const leftover = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1] : null;
  if (leftover) {
    ops.push(
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
          description: `Reembolso sin pareja: ${session.label}`,
          refId: sessionId,
        },
      }),
    );
  }

  if (ops.length > 0) await prisma.$transaction(ops);
  return true;
}

/**
 * Scans all open DuelSessions and auto-pairs any whose jornada's first match
 * has already kicked off. Safe to call from page renders and cron simultaneously.
 *
 * Returns the labels of sessions that were paired on this call.
 */
export async function autoPairReadySessions(): Promise<string[]> {
  const now = new Date();

  const sessions = await prisma.duelSession.findMany({
    where: { pairingDone: false },
    include: {
      entries: {
        where: { paired: false, refunded: false },
        select: { id: true },
      },
    },
  });

  if (sessions.length === 0) return [];

  const paired: string[] = [];

  for (const s of sessions) {
    if (s.entries.length < 2) continue;

    const lmxJ = LMX_JORNADAS.find((j) => j.module === s.module);
    if (!lmxJ) continue; // module not a jornada (liguilla etc.) — skip for now

    const firstMatch = await prisma.match.findFirst({
      where: { stage: "JORNADA", matchNumber: { gte: lmxJ.min, lte: lmxJ.max } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true },
    });

    if (!firstMatch?.scheduledAt || firstMatch.scheduledAt > now) continue;

    const ok = await executePairing(s.id);
    if (ok) paired.push(s.label);
  }

  return paired;
}

/**
 * Resolves finished duels: counts picks, sets scores + winner, distributes credits.
 *
 * Runs on every duelos page load (lazy). The atomic claim (prizeGiven flip) ensures
 * concurrent calls never double-pay — only the first writer proceeds.
 *
 * Returns labels of pairs resolved on this call.
 */
export async function resolveFinishedDuels(): Promise<string[]> {
  const pairs = await prisma.duelPair.findMany({
    where: { prizeGiven: false },
    include: { session: { select: { id: true, module: true, label: true } } },
  });
  if (pairs.length === 0) return [];

  const resolved: string[] = [];

  for (const pair of pairs) {
    const jornada = LMX_JORNADAS.find((j) => j.module === pair.session.module);
    if (!jornada) continue;

    // All match numbers for this jornada (range minus excludes, plus extras)
    const nums: number[] = [];
    for (let n = jornada.min; n <= jornada.max; n++) {
      if (!jornada.exclude?.includes(n)) nums.push(n);
    }
    for (const n of jornada.extra ?? []) nums.push(n);

    const matches = await prisma.match.findMany({
      where: { matchNumber: { in: nums } },
      select: { id: true, homeScore: true, awayScore: true },
    });

    // Skip until every match has a result
    if (matches.length === 0 || matches.some((m) => m.homeScore === null)) continue;

    const matchIds = matches.map((m) => m.id);

    const [score1, score2, entry1, entry2] = await Promise.all([
      prisma.matchBet.count({ where: { userId: pair.user1Id, duelSessionId: pair.sessionId, matchId: { in: matchIds }, isCorrect: true } }),
      prisma.matchBet.count({ where: { userId: pair.user2Id, duelSessionId: pair.sessionId, matchId: { in: matchIds }, isCorrect: true } }),
      prisma.duelEntry.findUnique({ where: { sessionId_userId: { sessionId: pair.sessionId, userId: pair.user1Id } }, select: { goalsGuess: true } }),
      prisma.duelEntry.findUnique({ where: { sessionId_userId: { sessionId: pair.sessionId, userId: pair.user2Id } }, select: { goalsGuess: true } }),
    ]);

    let winnerId: string | null = null;
    if (score1 > score2) {
      winnerId = pair.user1Id;
    } else if (score2 > score1) {
      winnerId = pair.user2Id;
    } else if (entry1?.goalsGuess != null && entry2?.goalsGuess != null) {
      // Tiebreaker: closest goals guess to actual total
      const actualGoals = matches.reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);
      const diff1 = Math.abs(entry1.goalsGuess - actualGoals);
      const diff2 = Math.abs(entry2.goalsGuess - actualGoals);
      if (diff1 < diff2) winnerId = pair.user1Id;
      else if (diff2 < diff1) winnerId = pair.user2Id;
      // if equal difference → true tie, winnerId stays null
    }
    const prize = Number(pair.prizePool);

    // Atomic claim — if another concurrent call already claimed this pair, skip.
    const claim = await prisma.duelPair.updateMany({
      where: { id: pair.id, prizeGiven: false },
      data: { score1, score2, winnerId, prizeGiven: true },
    });
    if (claim.count === 0) continue;

    const ops: Prisma.PrismaPromise<unknown>[] = [];

    if (winnerId) {
      ops.push(
        prisma.user.update({ where: { id: winnerId }, data: { credits: { increment: prize } } }),
        prisma.creditTransaction.create({
          data: { userId: winnerId, amount: prize, type: "PRIZE_WIN", description: `Duelo 1v1 ganado: ${pair.session.label}`, refId: pair.id },
        }),
      );
    } else {
      // Tie — return half to each player
      const half = prize / 2;
      for (const uid of [pair.user1Id, pair.user2Id]) {
        ops.push(
          prisma.user.update({ where: { id: uid }, data: { credits: { increment: half } } }),
          prisma.creditTransaction.create({
            data: { userId: uid, amount: half, type: "REFUND", description: `Duelo 1v1 empatado (devolución): ${pair.session.label}`, refId: pair.id },
          }),
        );
      }
    }

    if (ops.length > 0) await prisma.$transaction(ops);
    resolved.push(pair.session.label);
  }

  return resolved;
}
