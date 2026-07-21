/**
 * Deshace el emparejamiento forzado de J2:
 *  - Borra los 3 pares creados por el script
 *  - Deja solo los usuarios que pagaron SPEND_ENTRY (se registraron solos)
 *  - Resetea J2 a isOpen=true, pairingDone=false
 * Uso: npx tsx scripts/reset-j2-open.ts
 */
import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2_SESSION_ID = "cmrtt3znn00008cc48iljib0r";

async function main() {
  // 1. Quiénes se registraron solos (tienen SPEND_ENTRY para J2)
  const txns = await prisma.creditTransaction.findMany({
    where: { refId: J2_SESSION_ID, type: "SPEND_ENTRY" },
    select: { userId: true, user: { select: { name: true } } },
  });
  const paidUserIds = new Set(txns.map((t) => t.userId));
  console.log(`Usuarios con SPEND_ENTRY en J2: ${paidUserIds.size}`);
  for (const t of txns) console.log(`  ✅ ${t.user.name}`);

  // 2. Borrar todos los pares de J2
  const deletedPairs = await prisma.duelPair.deleteMany({ where: { sessionId: J2_SESSION_ID } });
  console.log(`\nPares borrados: ${deletedPairs.count}`);

  // 3. Borrar entries de usuarios que NO pagaron (añadidos por script)
  const allEntries = await prisma.duelEntry.findMany({
    where: { sessionId: J2_SESSION_ID },
    select: { id: true, userId: true, user: { select: { name: true } } },
  });
  const toRemove = allEntries.filter((e) => !paidUserIds.has(e.userId));
  const toKeep   = allEntries.filter((e) =>  paidUserIds.has(e.userId));
  console.log(`Entries a eliminar (script): ${toRemove.length}`);
  for (const e of toRemove) console.log(`  🗑 ${e.user.name}`);
  console.log(`Entries a conservar (pagaron): ${toKeep.length}`);
  for (const e of toKeep) console.log(`  ✅ ${e.user.name}`);

  if (toRemove.length > 0) {
    await prisma.duelEntry.deleteMany({ where: { id: { in: toRemove.map((e) => e.id) } } });
  }

  // 4. Reset paired/refunded en los que quedan
  await prisma.duelEntry.updateMany({
    where: { sessionId: J2_SESSION_ID },
    data: { paired: false, refunded: false },
  });

  // 5. Reabrir J2 — autoPairReadySessions lo emparejará cuando arranque el primer partido
  await prisma.duelSession.update({
    where: { id: J2_SESSION_ID },
    data: { isOpen: true, pairingDone: false },
  });

  console.log(`\n✅ J2 reabierta con ${toKeep.length} entradas. El emparejamiento ocurrirá al iniciar el primer partido.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
