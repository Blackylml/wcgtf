"use server";

import { prisma } from "@/lib/prisma";
import { Stage } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { applyResult } from "@/lib/result-sync";

function revalidateResults() {
  revalidatePath("/admin/partidos");
  revalidatePath("/admin/usuarios");
  revalidatePath("/dashboard");
  revalidatePath("/partidos");
}


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
  await applyResult(id, homeScore, awayScore, penaltiesWinner || null);
  revalidateResults();
}

export async function clearResult(id: string) {
  await prisma.match.update({
    where: { id },
    data: { homeScore: null, awayScore: null, penaltiesWinner: null },
  });
  // Des-calificar las apuestas de este partido (vuelven a "sin calificar").
  await prisma.matchBet.updateMany({ where: { matchId: id }, data: { isCorrect: null } });
  revalidateResults();
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
