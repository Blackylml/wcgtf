"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MatchPick } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { moduleLockAt, isLocked } from "@/lib/module-access";
import { LMX_JORNADAS } from "@/lib/modules";

export async function saveDuelBets(
  sessionId: string,
  picks: { matchId: string; pick: MatchPick }[]
): Promise<{ success?: boolean; error?: string }> {
  const authSession = await auth();
  if (!authSession?.user?.id) return { error: "No autenticado" };
  const userId = authSession.user.id;

  const duelSession = await prisma.duelSession.findUnique({
    where: { id: sessionId },
    select: { id: true, module: true },
  });
  if (!duelSession) return { error: "Sesión no encontrada" };

  const entry = await prisma.duelEntry.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!entry) return { error: "No estás inscrito en este duelo" };

  if (isLocked(await moduleLockAt(duelSession.module)))
    return { error: "El duelo ya cerró (empezó el primer partido)" };

  const jornada = LMX_JORNADAS.find((j) => j.module === duelSession.module);
  const matches = await prisma.match.findMany({
    where: { id: { in: picks.map((p) => p.matchId) } },
    select: { id: true, stage: true, matchNumber: true },
  });

  const validIds = new Set(
    matches
      .filter((m) => {
        if (!jornada) return m.stage === "JORNADA";
        const inRange =
          m.matchNumber >= jornada.min &&
          m.matchNumber <= jornada.max &&
          !(jornada.exclude?.includes(m.matchNumber));
        const isExtra = jornada.extra?.includes(m.matchNumber) ?? false;
        return inRange || isExtra;
      })
      .map((m) => m.id)
  );

  for (const { matchId, pick } of picks) {
    if (!validIds.has(matchId)) continue;
    await prisma.matchBet.upsert({
      where: { userId_matchId_duelSessionId: { userId, matchId, duelSessionId: sessionId } },
      create: { userId, matchId, pick, duelSessionId: sessionId },
      update: { pick },
    });
  }

  revalidatePath(`/duelos/${sessionId}`);
  return { success: true };
}

export async function saveDuelTiebreakerPick(
  sessionId: string,
  matchIdx: number,
  htPick: MatchPick,
  ftPick: MatchPick,
): Promise<{ success?: boolean; error?: string }> {
  const authSession = await auth();
  if (!authSession?.user?.id) return { error: "No autenticado" };
  const userId = authSession.user.id;

  const duelSession = await prisma.duelSession.findUnique({
    where: { id: sessionId },
    select: { module: true, hasTiebreaker: true },
  });
  if (!duelSession?.hasTiebreaker) return { error: "Desempate no habilitado" };

  const entry = await prisma.duelEntry.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  });
  if (!entry) return { error: "No estás inscrito en este duelo" };

  if (isLocked(await moduleLockAt(duelSession.module)))
    return { error: "El duelo ya cerró" };

  await prisma.duelTiebreakerPick.upsert({
    where: { sessionId_userId_matchIdx: { sessionId, userId, matchIdx } },
    create: { sessionId, userId, matchIdx, htPick, ftPick },
    update: { htPick, ftPick },
  });

  revalidatePath(`/duelos/${sessionId}`);
  return { success: true };
}
