import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

async function fetchFixtures() {
  const league = process.env.ESPN_LEAGUE ?? "fifa.world";
  const range = process.env.ESPN_DATE_RANGE ?? "20260611-20260720";
  const url = `${ESPN_BASE}/${league}/scoreboard?dates=${range}&limit=400`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) throw new Error("ESPN " + res.status);
  const json: { events?: { id: string; date: string }[] } = await res.json();
  return (json.events ?? []).map((e) => ({ id: Number(e.id), date: e.date }));
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const fixtures = await fetchFixtures();
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  console.log(`ESPN: ${fixtures.length} fixtures`);

  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true, scheduledAt: true, matchNumber: true },
    orderBy: { matchNumber: "asc" },
  });

  let updated = 0;
  for (const m of matches) {
    const f = byId.get(m.externalId!);
    if (!f?.date) continue;
    const espnAt = new Date(f.date);
    if (Number.isNaN(espnAt.getTime())) continue;
    if (Math.abs(espnAt.getTime() - m.scheduledAt.getTime()) <= 60_000) continue;
    await prisma.match.update({ where: { id: m.id }, data: { scheduledAt: espnAt } });
    console.log(`M${m.matchNumber}: ${m.scheduledAt.toISOString()} -> ${espnAt.toISOString()}`);
    updated++;
  }

  console.log(`\nRevisados ${matches.length} mapeados, corregidos ${updated}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
