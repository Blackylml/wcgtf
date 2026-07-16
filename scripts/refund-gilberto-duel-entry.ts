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
  console.log(`${user.name} | créditos actuales: $${user.credits}`);

  const entry = await prisma.duelEntry.findFirst({
    where: { userId: user.id },
    include: { session: { select: { id: true, label: true, entryFee: true } } },
  });
  if (!entry) { console.log("Sin entrada de duelo."); return; }
  console.log(`Duelo: ${entry.session.label} | entrada: $${entry.session.entryFee}`);

  const fee = Number(entry.session.entryFee);

  await prisma.$transaction([
    prisma.duelEntry.delete({ where: { id: entry.id } }),
    prisma.user.update({ where: { id: user.id }, data: { credits: { increment: fee } } }),
    prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: fee,
        type: "DEPOSIT_ADMIN",
        description: `Reembolso entrada duelo: ${entry.session.label}`,
      },
    }),
  ]);

  const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { credits: true } });
  console.log(`Listo. Créditos de ${user.name}: $${updated?.credits}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
