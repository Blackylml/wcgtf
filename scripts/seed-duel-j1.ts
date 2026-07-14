/**
 * Crea una DuelSession de prueba para Jornada 1 (LMX_J1).
 * Uso: npx tsx scripts/seed-duel-j1.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.duelSession.findFirst({ where: { module: "LMX_J1" } });
  if (existing) {
    console.log(`⚠  Ya existe una sesión para LMX_J1: ${existing.id} — "${existing.label}"`);
    console.log(`   isOpen: ${existing.isOpen} | pairingDone: ${existing.pairingDone}`);
    return;
  }

  const session = await prisma.duelSession.create({
    data: {
      module: "LMX_J1",
      label: "Jornada 1 — 1v1",
      entryFee: 100,
      houseCutPct: 10,
      isOpen: true,
      pairingDone: false,
    },
  });

  console.log(`✅ DuelSession creada:`);
  console.log(`   ID:       ${session.id}`);
  console.log(`   Módulo:   ${session.module}`);
  console.log(`   Label:    ${session.label}`);
  console.log(`   Entrada:  $${session.entryFee}`);
  console.log(`   Casa:     ${session.houseCutPct}%`);
  console.log(`   Premio:   $${Number(session.entryFee) * 2 * (1 - session.houseCutPct / 100)} al ganador`);
  console.log(`   Estado:   Abierto`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
