import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Gilberto" } },
    select: { id: true, name: true, credits: true },
  });
  if (!user) { console.log("Usuario no encontrado."); return; }
  console.log(`${user.name} | créditos: $${user.credits}`);

  const existing = await prisma.payment.findFirst({
    where: { userId: user.id, module: "LMX_J1", status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) {
    console.log(`Ya tiene entrada LMX_J1 con status: ${existing.status}`);
    return;
  }

  const settings = await prisma.moduleSettings.findUnique({ where: { module: "LMX_J1" } });
  const price = Number(settings?.price ?? 100);

  await prisma.payment.create({
    data: { userId: user.id, module: "LMX_J1", amount: price, status: "APPROVED" },
  });

  console.log(`✓ Acceso LMX_J1 otorgado a ${user.name} (sin cobrar créditos — entrada administrativa)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
