import { prisma } from "./prisma";
import { LMX_JORNADAS } from "./modules";

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
