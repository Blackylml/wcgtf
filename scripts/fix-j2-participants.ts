/**
 * Limpia J2: borra entries y pares de usuarios que no estaban en J1.
 * Luego re-empareja solo a los participantes de J1.
 * Uso: npx tsx scripts/fix-j2-participants.ts
 */
import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J1_SESSION_ID = "cmrjwbuaq0000a0c4h0d0yqnd";
const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";

async function main() {
  // 1. Obtener usuarios de J1
  const j1entries = await prisma.duelEntry.findMany({
    where: { sessionId: J1_SESSION_ID },
    select: { userId: true },
  });
  const j1UserIds = new Set(j1entries.map((e) => e.userId));
  console.log(`Participantes J1: ${j1UserIds.size}`);
  for (const uid of j1UserIds) {
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { name: true } });
    console.log(`  ${u?.name ?? uid}`);
  }

  // 2. Borrar TODOS los pares de J2 (los vamos a re-crear)
  const deleted = await prisma.duelPair.deleteMany({ where: { sessionId: J2_SESSION_ID } });
  console.log(`\nPares J2 borrados: ${deleted.count}`);

  // 3. Borrar entries de J2 que NO estaban en J1
  const j2entries = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID },
    select: { id: true, userId: true },
  });
  const toRemove = j2entries.filter((e) => !j1UserIds.has(e.userId));
  console.log(`Entries J2 a eliminar (no estaban en J1): ${toRemove.length}`);
  if (toRemove.length > 0) {
    await prisma.duelEntry.deleteMany({ where: { id: { in: toRemove.map((e) => e.id) } } });
  }

  // 4. Reset entries J1 — quitar paired/refunded para re-emparejar
  await prisma.duelEntry.updateMany({
    where: { sessionId: J2_SESSION_ID },
    data: { paired: false, refunded: false },
  });

  // 5. Re-abrir J2 para re-emparejar
  await prisma.duelSession.update({
    where: { id: J2_SESSION_ID },
    data: { isOpen: false, pairingDone: false },
  });

  // 6. Emparejar solo los J1 participantes
  const session = await prisma.duelSession.findUnique({ where: { id: J2_SESSION_ID } });
  if (!session) { console.error("Sesión J2 no encontrada"); return; }

  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID, paired: false, refunded: false },
  });
  console.log(`\nEntradas J1 en J2: ${entries.length}`);

  // Fisher-Yates shuffle
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const pairCount = Math.floor(shuffled.length / 2);
  console.log(`Pares a crear: ${pairCount}`);

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
          prizePool: 180, // 100 * 2 * 0.9 — los 6 de J1 sí pagaron entrada en J1
        },
      }),
    );
    console.log(`  Par ${i+1}: usuario1=${u1.userId.slice(-6)} vs usuario2=${u2.userId.slice(-6)}`);
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
    const u = await prisma.user.findUnique({ where: { id: leftover.userId }, select: { name: true } });
    ops.push(
      prisma.duelEntry.update({ where: { id: leftover.id }, data: { refunded: true } }),
    );
    console.log(`⚠ Sin pareja: ${u?.name ?? leftover.userId}`);
  }

  // Marcar J2 como emparejada
  ops.push(
    prisma.duelSession.update({
      where: { id: J2_SESSION_ID },
      data: { pairingDone: true, isOpen: false },
    }),
  );

  await prisma.$transaction(ops);

  const j2final = await prisma.duelEntry.count({ where: { sessionId: J2_SESSION_ID } });
  console.log(`\n✅ J2 re-emparejada: ${pairCount} pares, ${j2final} entries totales`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
