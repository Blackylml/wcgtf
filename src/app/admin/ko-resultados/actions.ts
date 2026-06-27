"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Module } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado");
}

export async function saveKoRoundResult(
  module: Module,
  data: { topScorerTeam: string | null; firstHalfGoals: number | null; earliestGoalTeam: string | null },
) {
  await requireAdmin();
  await prisma.koRoundResult.upsert({
    where: { module },
    create: { module, ...data },
    update: data,
  });
  revalidatePath("/admin/ko-resultados");
  revalidatePath(`/partidos/${module}`);
}
