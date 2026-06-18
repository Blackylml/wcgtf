import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const USER_ID = "cmq8t27vb000004jojeenx14q"; // Gerardo Vazquez
const FROM = "MATCHES_G2B" as const; // $250
const TO = "MATCHES_G2" as const; // $50
const APPLY = process.argv.includes("--apply");

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({ where: { id: USER_ID }, select: { name: true, email: true } });
  if (!user) throw new Error("Usuario no encontrado");
  console.log(`Usuario: ${user.name ?? user.email} (${USER_ID})`);

  const source = await prisma.matchBet.findMany({
    where: { userId: USER_ID, poolModule: FROM },
    select: { matchId: true, pick: true, isCorrect: true },
  });
  console.log(`Picks en ${FROM}: ${source.length}`);

  const existing = await prisma.matchBet.findMany({ where: { userId: USER_ID, poolModule: TO }, select: { id: true } });
  if (existing.length > 0) {
    console.log(`⚠ Ya tiene ${existing.length} picks en ${TO}. Abortando para no duplicar.`);
    await prisma.$disconnect();
    return;
  }

  const settings = await prisma.moduleSettings.findUnique({ where: { module: TO }, select: { price: true } });
  const price = settings ? Number(settings.price) : 50;
  console.log(`Precio de entrada ${TO}: $${price}`);

  const existingPay = await prisma.payment.findFirst({ where: { userId: USER_ID, module: TO }, select: { id: true, status: true } });
  console.log(`Pago previo en ${TO}: ${existingPay ? `${existingPay.id} (${existingPay.status})` : "ninguno"}`);

  if (!APPLY) {
    console.log("\n[DRY-RUN] Se crearía 1 pago APPROVED y se copiarían los picks. Ejecuta con --apply para escribir.");
    await prisma.$disconnect();
    return;
  }

  // 1) Entrada $50 aprobada (si no existe una aprobada)
  let paymentId = existingPay?.status === "APPROVED" ? existingPay.id : null;
  if (!paymentId) {
    const pay = await prisma.payment.create({
      data: { userId: USER_ID, module: TO, amount: price, status: "APPROVED" },
      select: { id: true },
    });
    paymentId = pay.id;
    console.log(`Pago creado: ${paymentId} (APPROVED, $${price})`);
  }

  // 2) Copiar los 24 picks
  const created = await prisma.matchBet.createMany({
    data: source.map((b) => ({
      userId: USER_ID,
      matchId: b.matchId,
      pick: b.pick,
      poolModule: TO,
      isCorrect: b.isCorrect,
      paymentId,
    })),
    skipDuplicates: true,
  });
  console.log(`Picks copiados a ${TO}: ${created.count}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
