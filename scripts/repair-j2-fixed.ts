/**
 * Rehace los pares de J2 con los emparejamientos "predestinados":
 *  - Gerardo Palacios  vs  Erick F. Perez (empataron 7-7 en J1)
 *  - Gerardo Vazquez   vs  Kevin Mendiola (empataron 8-8 en J1)
 *  - Gilberto Treviño  vs  Andres Treviño (J1 rematch)
 * Uso: npx tsx scripts/repair-j2-fixed.ts
 */
import { config } from "dotenv";
config({ path: ".env" }); config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const J2 = "cmrtt3znn00008cc48iljib0r";

// IDs de usuarios
const GILBERTO    = "cmq2tdiuh0000rkc49ooxqc3n";
const ANDRES      = "cmq4oz8dh000004jjf9quq8dg";
const GERARDO_P   = "cmq9kufib000004l4m8fo6mpq";
const ERICK       = "cmrmy2ej9000004kwc4tixv76";
const GERARDO_V   = "cmq8t27vb000004jojeenx14q";
const KEVIN       = "cmq8zx5l7000004jlvv7p4mgx";

const PRIZE = 180; // 100 * 2 * 0.9

const FIXED_PAIRS: [string, string][] = [
  [GERARDO_P, ERICK],     // empate 7-7 J1
  [GERARDO_V, KEVIN],     // empate 8-8 J1
  [GILBERTO,  ANDRES],    // J1 rematch
];

async function main() {
  // 1. Borrar pares actuales
  const del = await prisma.duelPair.deleteMany({ where: { sessionId: J2 } });
  console.log(`Pares anteriores borrados: ${del.count}`);

  // 2. Reset entries
  await prisma.duelEntry.updateMany({
    where: { sessionId: J2 },
    data: { paired: false, refunded: false },
  });

  // 3. Crear pares fijos
  for (const [u1, u2] of FIXED_PAIRS) {
    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({ where: { id: u1 }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: u2 }, select: { name: true } }),
    ]);
    await prisma.duelPair.create({
      data: { sessionId: J2, user1Id: u1, user2Id: u2, prizePool: PRIZE },
    });
    console.log(`✅ Par: ${user1?.name}  vs  ${user2?.name}`);
  }

  // 4. Marcar entries como paired
  const allUsers = FIXED_PAIRS.flat();
  await prisma.duelEntry.updateMany({
    where: { sessionId: J2, userId: { in: allUsers } },
    data: { paired: true },
  });

  // 5. Asegurarse de que J2 quede cerrada
  await prisma.duelSession.update({
    where: { id: J2 },
    data: { isOpen: false, pairingDone: true },
  });

  console.log("\n✅ J2 re-emparejada con los pares predestinados.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
