"use server";

import { prisma } from "@/lib/prisma";
import { Stage, MatchPick } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function toggleMatch(id: string, current: boolean) {
  await prisma.match.update({ where: { id }, data: { isOpen: !current } });
  revalidatePath("/admin/partidos");
}

export async function setMatchPrice(id: string, price: number) {
  if (isNaN(price) || price < 0) return;
  await prisma.match.update({ where: { id }, data: { price } });
  revalidatePath("/admin/partidos");
}

export async function setResult(
  id: string,
  homeScore: number,
  awayScore: number,
  penaltiesWinner: string | null
) {
  await prisma.match.update({
    where: { id },
    data: { homeScore, awayScore, penaltiesWinner: penaltiesWinner || null },
  });

  // Score MatchBets: HOME wins if homeScore > away, AWAY if less, DRAW otherwise
  const outcome: MatchPick =
    homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";

  await prisma.matchBet.updateMany({
    where: { matchId: id, pick: outcome },
    data: { isCorrect: true },
  });
  await prisma.matchBet.updateMany({
    where: { matchId: id, pick: { not: outcome } },
    data: { isCorrect: false },
  });

  revalidatePath("/admin/partidos");
  revalidatePath("/dashboard");
}

export async function clearResult(id: string) {
  await prisma.match.update({
    where: { id },
    data: { homeScore: null, awayScore: null, penaltiesWinner: null },
  });
  revalidatePath("/admin/partidos");
}

export async function bulkToggleStage(stage: Stage, open: boolean) {
  await prisma.match.updateMany({ where: { stage }, data: { isOpen: open } });
  revalidatePath("/admin/partidos");
}

export async function bulkSetPrice(stage: Stage, price: number) {
  if (isNaN(price) || price < 0) return;
  await prisma.match.updateMany({ where: { stage }, data: { price } });
  revalidatePath("/admin/partidos");
}

export async function togglePenalties(id: string, current: boolean) {
  await prisma.match.update({ where: { id }, data: { penaltiesAllowed: !current } });
  revalidatePath("/admin/partidos");
}
