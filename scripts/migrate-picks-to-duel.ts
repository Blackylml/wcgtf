import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const session = await prisma.duelSession.findFirst({ where: { module: "LMX_J1" } });
  if (!session) throw new Error("No se encontró sesión de duelo LMX_J1");
  console.log(`Sesión: ${session.label} (${session.id})\n`);

  // ── 1. Gerardo Palacios — crear DuelEntry ────────────────────────────────────
  const gerardoP = await prisma.user.findUnique({
    where: { email: "gerapalacios2010@gmail.com" },
    select: { id: true, name: true, email: true },
  });
  if (!gerardoP) throw new Error("No se encontró Gerardo Palacios");

  const existingEntry = await prisma.duelEntry.findUnique({
    where: { sessionId_userId: { sessionId: session.id, userId: gerardoP.id } },
  });
  if (existingEntry) {
    console.log(`[SKIP] ${gerardoP.name} ya tiene DuelEntry`);
  } else {
    await prisma.duelEntry.create({ data: { sessionId: session.id, userId: gerardoP.id } });
    console.log(`[OK]   DuelEntry creado para ${gerardoP.name} <${gerardoP.email}>`);
  }

  // ── 2. Migrar picks poolModule→duelSessionId para usuarios de duelo ──────────
  // Usuarios con DuelEntry y picks en poolModule:LMX_J1 (arquitectura vieja)
  const duelUserEmails = [
    "andrestrevino0904@gmail.com",   // Andres Treviño — solo tiene picks en poolModule
    "gerapalacios2010@gmail.com",    // Gerardo Palacios — recién inscrito
  ];

  for (const email of duelUserEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (!user) { console.log(`[SKIP] ${email} — no encontrado`); continue; }

    const oldBets = await prisma.matchBet.findMany({
      where: { userId: user.id, poolModule: "LMX_J1" },
      select: { id: true, matchId: true, pick: true },
    });
    if (oldBets.length === 0) {
      console.log(`[SKIP] ${user.name} — sin picks en poolModule LMX_J1`);
      continue;
    }

    let migrated = 0;
    for (const bet of oldBets) {
      // Verificar si ya existe un bet con duelSessionId para este partido
      const already = await prisma.matchBet.findUnique({
        where: { userId_matchId_duelSessionId: { userId: user.id, matchId: bet.matchId, duelSessionId: session.id } },
      });
      if (already) {
        // Ya existe en duelSessionId, borrar el viejo de poolModule
        await prisma.matchBet.delete({ where: { id: bet.id } });
      } else {
        // Migrar: mover de poolModule a duelSessionId
        await prisma.matchBet.update({
          where: { id: bet.id },
          data: { poolModule: null, duelSessionId: session.id },
        });
        migrated++;
      }
    }
    console.log(`[OK]   ${user.name} — ${migrated} picks migrados a duelSessionId, ${oldBets.length - migrated} duplicados eliminados`);
  }

  // ── 3. Limpiar picks duplicados de Gilberto (poolModule sobrante) ────────────
  const gilberto = await prisma.user.findUnique({
    where: { email: "gilbertohardy13@gmail.com" },
    select: { id: true, name: true },
  });
  if (gilberto) {
    const oldGilbertoBets = await prisma.matchBet.findMany({
      where: { userId: gilberto.id, poolModule: "LMX_J1" },
      select: { id: true },
    });
    if (oldGilbertoBets.length > 0) {
      await prisma.matchBet.deleteMany({ where: { id: { in: oldGilbertoBets.map((b) => b.id) } } });
      console.log(`[OK]   ${gilberto.name} — ${oldGilbertoBets.length} picks duplicados (poolModule) eliminados`);
    } else {
      console.log(`[SKIP] ${gilberto.name} — sin picks duplicados`);
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log("\n=== ESTADO FINAL ===");
  const entries = await prisma.duelEntry.findMany({
    where: { sessionId: session.id },
    include: { user: { select: { name: true, email: true } } },
  });
  console.log(`Inscritos en duelo: ${entries.length}`);
  for (const e of entries) {
    const bets = await prisma.matchBet.count({
      where: { userId: e.userId, duelSessionId: session.id },
    });
    console.log(`  ${e.user.name ?? e.user.email} — ${bets} picks en duelSessionId`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
