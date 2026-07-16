import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const target = await prisma.user.findFirst({
    where: { name: { contains: "Gilberto" } },
    select: { id: true, name: true },
  });
  if (!target) { console.log("Usuario Gilberto no encontrado."); return; }

  const bets = await prisma.matchBet.findMany({
    where: { poolModule: "LMX_J1", userId: target.id },
    select: { pick: true, match: { select: { matchNumber: true } } },
  });

  console.log(`Picks de ${target.name}: ${bets.length}`);
  for (const b of bets) {
    console.log(`  M${b.match.matchNumber} | ${b.pick}`);
  }

  if (bets.length === 0) { console.log("Nada que borrar."); return; }

  const { count } = await prisma.matchBet.deleteMany({ where: { poolModule: "LMX_J1", userId: target.id } });
  console.log(`\nEliminados: ${count} picks.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
