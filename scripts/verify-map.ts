import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720&limit=400";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const res = await fetch(ESPN, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  const json = await res.json();
  const fx = new Map<number, { h: string; a: string }>();
  for (const e of json.events ?? []) {
    const c = e.competitions?.[0];
    const h = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "home");
    const a = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "away");
    fx.set(Number(e.id), { h: h?.team?.abbreviation, a: a?.team?.abbreviation });
  }

  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: "asc" },
  });

  let bad = 0;
  for (const m of matches) {
    const f = fx.get(m.externalId!);
    const hc = m.homeTeam?.code, ac = m.awayTeam?.code;
    if (!f) { console.log(`M${m.matchNumber}: ext=${m.externalId} NO está en ESPN`); bad++; continue; }
    if (!hc || !ac) continue; // sin equipos definidos (KO TBD)
    const ok = (f.h === hc && f.a === ac) || (f.h === ac && f.a === hc);
    if (!ok) { console.log(`M${m.matchNumber}: BD ${hc} vs ${ac} ≠ ESPN ${f.h} vs ${f.a} (ext=${m.externalId}) ⚠`); bad++; }
  }
  console.log(bad === 0 ? `\nOK: los ${matches.length} mapeos son correctos.` : `\n${bad} mapeos con problema.`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
