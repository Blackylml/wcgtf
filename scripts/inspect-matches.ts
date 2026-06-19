import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260618-20260620&limit=400";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const res = await fetch(ESPN, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  const json = await res.json();
  const espn = new Map<number, string>();
  for (const e of json.events ?? []) {
    const c = e.competitions?.[0];
    const h = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "home");
    const a = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "away");
    espn.set(Number(e.id), `${h?.team?.abbreviation} ${h?.score}-${a?.score} ${a?.team?.abbreviation} [${e.status?.type?.state} ${e.status?.type?.shortDetail}]`);
  }

  const matches = await prisma.match.findMany({
    where: { matchNumber: { gte: 26, lte: 32 } },
    orderBy: { matchNumber: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });

  console.log("Now UTC:", new Date().toISOString(), "\n");
  for (const m of matches) {
    const espnStr = m.externalId ? (espn.get(m.externalId) ?? "(externalId no está en ESPN hoy)") : "(sin externalId)";
    console.log(`M${m.matchNumber} ${m.homeTeam?.code ?? m.homeLabel} vs ${m.awayTeam?.code ?? m.awayLabel}`);
    console.log(`   sched=${m.scheduledAt.toISOString()} score=${m.homeScore}-${m.awayScore} pen=${m.penaltiesWinner} ext=${m.externalId}`);
    console.log(`   ESPN[ext]=${espnStr}`);
  }

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
