/**
 * Restaura a Gerardo Vazquez en J2:
 *  1. Crea su DuelEntry en J2 (sin cobrar — se registró antes de los cambios)
 *  2. Actualiza sus matchBets de pool LMX_J2 → duelSessionId J2
 * Uso: npx tsx scripts/restore-gerardo-j2.ts
 */
import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";
const GERARDO_VAZQUEZ_ID = "cmq8t27vb000004jojeenx14q";
const J2_MATCH_NUMS = [1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018];

async function main() {
  // 1. Crear DuelEntry para Gerardo en J2 (si no existe)
  const existing = await prisma.duelEntry.findUnique({
    where: { sessionId_userId: { sessionId: J2_SESSION_ID, userId: GERARDO_VAZQUEZ_ID } },
  });

  if (existing) {
    console.log("DuelEntry ya existe para Gerardo Vazquez en J2");
  } else {
    await prisma.duelEntry.create({
      data: { sessionId: J2_SESSION_ID, userId: GERARDO_VAZQUEZ_ID },
    });
    console.log("✅ DuelEntry creada para Gerardo Vazquez en J2");
  }

  // 2. Actualizar sus picks de pool → duel
  const j2matches = await prisma.match.findMany({
    where: { matchNumber: { in: J2_MATCH_NUMS } },
    select: { id: true, matchNumber: true },
  });
  const j2matchIds = j2matches.map((m) => m.id);

  const updated = await prisma.matchBet.updateMany({
    where: {
      userId: GERARDO_VAZQUEZ_ID,
      matchId: { in: j2matchIds },
      duelSessionId: null,
      poolModule: "LMX_J2",
    },
    data: { duelSessionId: J2_SESSION_ID },
  });
  console.log(`✅ ${updated.count} picks actualizados a duelSessionId J2`);

  // Verificar
  const bets = await prisma.matchBet.findMany({
    where: { userId: GERARDO_VAZQUEZ_ID, duelSessionId: J2_SESSION_ID },
    select: { matchId: true, pick: true },
  });
  console.log(`\nGerardo Vazquez tiene ${bets.length}/9 picks en J2 duel session`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
