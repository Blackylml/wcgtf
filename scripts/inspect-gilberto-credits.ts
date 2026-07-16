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
  console.log(`${user.name} | créditos: $${user.credits}\n`);

  const txs = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  for (const t of txs) {
    console.log(`  ${t.type} | $${t.amount} | ${t.description} | ${t.createdAt.toISOString().slice(0,16)}`);
  }
  if (txs.length === 0) console.log("  Sin transacciones.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
