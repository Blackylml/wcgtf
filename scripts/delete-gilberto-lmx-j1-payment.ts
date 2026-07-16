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
  console.log(`Usuario: ${user.name} | Créditos actuales: $${user.credits}`);

  const payments = await prisma.payment.findMany({
    where: { userId: user.id, module: "LMX_J1" },
    select: { id: true, amount: true, status: true, isCreditTopup: true, createdAt: true },
  });

  console.log(`\nPagos LMX_J1 encontrados: ${payments.length}`);
  for (const p of payments) {
    console.log(`  ${p.id} | $${p.amount} | ${p.status} | creditTopup: ${p.isCreditTopup} | ${p.createdAt.toISOString()}`);
  }

  if (payments.length === 0) { console.log("Nada que borrar."); return; }

  // Borrar y devolver créditos
  for (const p of payments) {
    await prisma.payment.delete({ where: { id: p.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: p.amount } },
    });
    console.log(`\n  Pago ${p.id} eliminado. Devueltos $${p.amount} créditos a ${user.name}.`);
  }

  const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
  console.log(`  Créditos finales: $${updated?.credits}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
