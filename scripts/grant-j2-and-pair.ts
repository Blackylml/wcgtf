/**
 * 1. Crea DuelEntry en J2 para todos los usuarios que no estén (gratis — sin cobro).
 * 2. Empareja J2 de inmediato (executePairing).
 * Uso: npx tsx scripts/grant-j2-and-pair.ts
 */
import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";

async function main() {
  // 1. Todos los usuarios
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  console.log(`Total usuarios: ${users.length}`);

  // 2. Entradas existentes en J2
  const existing = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((e) => e.userId));
  console.log(`Entradas previas: ${existing.length}`);

  // 3. Crear entradas para los que faltan (gratis, sin cobrar créditos)
  const missing = users.filter((u) => !existingIds.has(u.id));
  console.log(`Usuarios por agregar: ${missing.length}`);

  for (const u of missing) {
    await prisma.duelEntry.create({
      data: { sessionId: J2_SESSION_ID, userId: u.id },
    });
    console.log(`  ✅ Entry creada: ${u.name ?? u.email}`);
  }

  // 4. Emparejar ahora — atomico, sólo un caller gana
  const session = await prisma.duelSession.findUnique({ where: { id: J2_SESSION_ID } });
  if (!session) { console.error("Sesión J2 no encontrada"); return; }

  const claim = await prisma.duelSession.updateMany({
    where: { id: J2_SESSION_ID, pairingDone: false },
    data: { isOpen: false, pairingDone: true },
  });
  if (claim.count === 0) { console.log("⚠ J2 ya estaba emparejada"); return; }

  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID, paired: false, refunded: false },
  });

  // Fisher-Yates shuffle
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const pairCount = Math.floor(shuffled.length / 2);
  const prize = Number(session.entryFee) * 2 * (1 - session.houseCutPct / 100);
  // Dado que las entradas son gratis, el prizePool es simbólico (0)
  // El usuario pidió "regalar" el acceso, así que prize = 0
  const actualPrize = 0;

  console.log(`\nEmparejando ${entries.length} entradas → ${pairCount} pares (prize=${actualPrize})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  for (let i = 0; i < pairCount; i++) {
    const u1 = shuffled[i * 2];
    const u2 = shuffled[i * 2 + 1];
    ops.push(
      prisma.duelPair.create({
        data: {
          sessionId: J2_SESSION_ID,
          user1Id: u1.userId,
          user2Id: u2.userId,
          prizePool: actualPrize,
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
    );
    console.log(`⚠ Sin pareja (impar): ${leftover.userId}`);
  }

  if (ops.length > 0) await prisma.$transaction(ops);

  console.log(`\n✅ J2 emparejada: ${pairCount} pares${leftover ? " + 1 sin pareja" : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
