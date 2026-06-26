"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function initBracketSession() {
  const existing = await prisma.bracketSession.findFirst();
  if (!existing) {
    await prisma.bracketSession.create({ data: { isOpen: false, price: 0 } });
  }
  revalidatePath("/admin/bracket");
}

export async function toggleBracket(id: string, current: boolean) {
  await prisma.bracketSession.update({ where: { id }, data: { isOpen: !current } });
  revalidatePath("/admin/bracket");
  revalidatePath("/bracket");
}

export async function setBracketPrice(id: string, price: number) {
  if (isNaN(price) || price < 0) return;
  await prisma.bracketSession.update({ where: { id }, data: { price } });
  revalidatePath("/admin/bracket");
}

export async function saveBracketConfig(id: string, configJson: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any;
  try { config = JSON.parse(configJson); } catch { return; }
  await prisma.bracketSession.update({ where: { id }, data: { config } });
  revalidatePath("/admin/bracket");
  revalidatePath("/bracket");
}

export async function recalcBracketScores(sessionId: string) {
  const session = await prisma.bracketSession.findUnique({ where: { id: sessionId } });
  if (!session?.config) return;

  const config = session.config as { R32: [string, string][] };
  const bets = await prisma.bracketBet.findMany({ where: { bracketSessionId: sessionId } });

  // Build map of actual match results: team code → won rounds
  const matchesByStage = await prisma.match.findMany({
    where: { stage: { in: ["R32", "R16", "QF", "SF", "THIRD", "FINAL"] } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  // Map matchNumber → winner code
  const matchWinners = new Map<number, string>();
  for (const m of matchesByStage) {
    if (m.homeScore === null || m.awayScore === null) continue;
    let winner: string | null = null;
    if (m.homeScore > m.awayScore) winner = m.homeTeam?.code ?? null;
    else if (m.homeScore < m.awayScore) winner = m.awayTeam?.code ?? null;
    else if (m.penaltiesWinner) winner = m.penaltiesWinner;
    if (winner) matchWinners.set(m.matchNumber, winner);
  }

  const POINTS: Record<string, number> = { R32: 1, R16: 2, QF: 4, SF: 8, THIRD: 4, FINAL: 16 };

  for (const bet of bets) {
    const preds = bet.predictions as Record<string, Record<string, string> | string>;
    let score = 0;

    // Validate each stage prediction against actual results
    // Predictions format: { R32: {"0": "MEX", ...}, R16: {...}, QF: {...}, SF: {...}, THIRD: "BRA", FINAL: "MEX" }
    for (const [stage, pts] of Object.entries(POINTS)) {
      const stagePreds = preds[stage];
      if (!stagePreds) continue;

      if (stage === "THIRD" || stage === "FINAL") {
        // Find the actual match for this stage
        const actualMatch = matchesByStage.find((m) => m.stage === stage);
        if (actualMatch) {
          const winner = matchWinners.get(actualMatch.matchNumber);
          if (winner && stagePreds === winner) score += pts;
        }
      } else {
        const stageMatches = matchesByStage.filter((m) => m.stage === stage);
        for (const m of stageMatches) {
          const slotKey = String(stageMatches.indexOf(m));
          const pred = (stagePreds as Record<string, string>)[slotKey];
          const winner = matchWinners.get(m.matchNumber);
          if (pred && winner && pred === winner) score += pts;
        }
      }
    }

    await prisma.bracketBet.update({ where: { id: bet.id }, data: { score } });
  }

  revalidatePath("/admin/bracket");
  revalidatePath("/dashboard");
}
