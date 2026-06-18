import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const now = new Date();
  console.log("Ahora (UTC):", now.toISOString());
  const liveSince = new Date(now.getTime() - 3.5 * 3600 * 1000);

  const live = await prisma.match.findFirst({
    where: { scheduledAt: { lte: now, gte: liveSince }, homeScore: null },
    orderBy: { scheduledAt: "desc" },
    include: { homeTeam: true, awayTeam: true },
  });
  const next = await prisma.match.findFirst({
    where: { scheduledAt: { gt: now } },
    orderBy: { scheduledAt: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });
  const hero = live ?? next;
  console.log("HERO elegido:", hero ? `M${hero.matchNumber} ${hero.homeTeam?.code ?? hero.homeLabel} vs ${hero.awayTeam?.code ?? hero.awayLabel} @ ${hero.scheduledAt.toISOString()} score=${hero.homeScore}-${hero.awayScore} (${live ? "LIVE-slot" : "próximo"})` : "ninguno");

  const from = new Date(now.getTime() - 8 * 3600 * 1000);
  const to = new Date(now.getTime() + 8 * 3600 * 1000);
  const around = await prisma.match.findMany({
    where: { scheduledAt: { gte: from, lte: to } },
    orderBy: { scheduledAt: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });
  console.log(`\nPartidos ±8h (${around.length}):`);
  for (const m of around) {
    const hrsAgo = ((now.getTime() - m.scheduledAt.getTime()) / 3600000).toFixed(1);
    console.log(`  M${m.matchNumber} ${m.homeTeam?.code ?? m.homeLabel} vs ${m.awayTeam?.code ?? m.awayLabel} | ${m.scheduledAt.toISOString()} | hace ${hrsAgo}h | score=${m.homeScore}-${m.awayScore} | ext=${m.externalId}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
