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
  if (!user) { console.log("No encontrado"); return; }
  console.log(`${user.name} | créditos: $${user.credits}`);

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    select: { id: true, module: true, amount: true, status: true, isCreditTopup: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  for (const p of payments) {
    console.log(`  ${p.module ?? "topup"} | $${p.amount} | ${p.status} | topup:${p.isCreditTopup} | ${p.createdAt.toISOString().slice(0,16)}`);
  }
  if (payments.length === 0) console.log("  Sin pagos.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
