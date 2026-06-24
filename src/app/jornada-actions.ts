"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ReactionState = { counts: { boo: number; cheer: number }; myReaction: string | null };

async function readState(jornadaKey: string, userId: string): Promise<ReactionState> {
  const rows = await prisma.jornadaReaction.findMany({
    where: { jornadaKey },
    select: { type: true, userId: true },
  });
  const counts = { boo: 0, cheer: 0 };
  let myReaction: string | null = null;
  for (const r of rows) {
    if (r.type === "boo") counts.boo++;
    else if (r.type === "cheer") counts.cheer++;
    if (r.userId === userId) myReaction = r.type;
  }
  return { counts, myReaction };
}

/** Estado de reacciones de una jornada (contadores + la mía). */
export async function getJornadaReactions(jornadaKey: string): Promise<ReactionState> {
  const session = await auth();
  return readState(jornadaKey, session?.user?.id ?? "");
}

/** Reacciona (o cambia tu reacción) al ganador de una jornada. */
export async function reactToJornada(jornadaKey: string, type: "boo" | "cheer"): Promise<ReactionState | { error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "no-auth" };
  if (type !== "boo" && type !== "cheer") return { error: "bad-type" };

  await prisma.jornadaReaction.upsert({
    where: { jornadaKey_userId: { jornadaKey, userId } },
    update: { type },
    create: { jornadaKey, userId, type },
  });
  return readState(jornadaKey, userId);
}
