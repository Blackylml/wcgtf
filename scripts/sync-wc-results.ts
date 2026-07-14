/**
 * Sincroniza resultados del Mundial 2026 desde ESPN.
 * Corre: npx tsx scripts/sync-wc-results.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const FINISHED = new Set(["FT", "AET", "PEN"]);

type ApiFixture = {
  id: number;
  date: string;
  statusShort: string;
  home: string;
  away: string;
  homeAbbr: string;
  awayAbbr: string;
  homeGoals: number | null;
  awayGoals: number | null;
  penHome: number | null;
  penAway: number | null;
};

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

async function fetchFixtures(dates: string): Promise<ApiFixture[]> {
  const league = process.env.ESPN_LEAGUE ?? "fifa.world";
  const url = `${ESPN_BASE}/${league}/scoreboard?dates=${dates}&limit=400`;
  console.log(`  → GET ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const json = await res.json();
  const events = Array.isArray(json?.events) ? json.events : [];
  const fixtures: ApiFixture[] = [];
  for (const e of events) {
    const comp = e.competitions?.[0];
    const home = comp?.competitors?.find((c: { homeAway: string }) => c.homeAway === "home");
    const away = comp?.competitors?.find((c: { homeAway: string }) => c.homeAway === "away");
    if (!home || !away) continue;
    const completed = !!e.status?.type?.completed;
    const state = e.status?.type?.state ?? "pre";
    const penHome = home.shootoutScore != null ? Number(home.shootoutScore) : null;
    const penAway = away.shootoutScore != null ? Number(away.shootoutScore) : null;
    const hasPens = penHome != null && penAway != null && (penHome > 0 || penAway > 0);
    const statusShort = completed ? (hasPens ? "PEN" : "FT") : state === "in" ? "LIVE" : "NS";
    fixtures.push({
      id: Number(e.id),
      date: e.date,
      statusShort,
      home: home.team?.displayName ?? "",
      away: away.team?.displayName ?? "",
      homeAbbr: home.team?.abbreviation ?? "",
      awayAbbr: away.team?.abbreviation ?? "",
      homeGoals: toNum(home.score),
      awayGoals: toNum(away.score),
      penHome,
      penAway,
    });
  }
  return fixtures;
}

async function main() {
  console.log("🔄  Sincronizando resultados del Mundial 2026...\n");

  // ESPN acepta rangos de hasta 30 días — dividimos en 2 tramos para cubrir todo el torneo
  const ranges = ["20260611-20260630", "20260701-20260720"];
  const allFixtures: ApiFixture[] = [];
  for (const r of ranges) {
    console.log(`Fetching rango ${r}...`);
    const fx = await fetchFixtures(r);
    allFixtures.push(...fx);
    console.log(`  ${fx.length} partidos devueltos\n`);
  }

  const finished = allFixtures.filter(
    (f) => FINISHED.has(f.statusShort) && f.homeGoals !== null && f.awayGoals !== null,
  );
  console.log(`Total terminados en ESPN: ${finished.length} de ${allFixtures.length}`);

  const byId = new Map(finished.map((f) => [f.id, f]));

  const matches = await prisma.match.findMany({
    where: { externalId: { not: null } },
    select: {
      id: true, externalId: true, matchNumber: true, homeScore: true, awayScore: true, penaltiesWinner: true,
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
    },
  });
  console.log(`Partidos en BD con externalId: ${matches.length}\n`);

  let updated = 0;
  let skipped = 0;
  let noResult = 0;

  for (const m of matches) {
    const f = byId.get(m.externalId!);
    if (!f || f.homeGoals === null || f.awayGoals === null) { noResult++; continue; }

    const ourHome = m.homeTeam?.code ?? null;
    const ourAway = m.awayTeam?.code ?? null;

    if (ourHome && ourAway) {
      const sameTeams =
        (f.homeAbbr === ourHome && f.awayAbbr === ourAway) ||
        (f.homeAbbr === ourAway && f.awayAbbr === ourHome);
      if (!sameTeams) {
        console.log(`  ⚠️  M${m.matchNumber}: externalId ${m.externalId} → ${f.homeAbbr} vs ${f.awayAbbr} no coincide con ${ourHome} vs ${ourAway} — skip`);
        skipped++;
        continue;
      }
    }

    const reversed = !!ourHome && !!ourAway && f.homeAbbr === ourAway && f.awayAbbr === ourHome;
    const hs = reversed ? f.awayGoals : f.homeGoals;
    const as = reversed ? f.homeGoals : f.awayGoals;

    let penWinner: string | null = null;
    if (f.statusShort === "PEN" && f.penHome !== null && f.penAway !== null) {
      penWinner = f.penHome > f.penAway ? f.homeAbbr : f.awayAbbr;
    }

    if (m.homeScore === hs && m.awayScore === as && m.penaltiesWinner === penWinner) {
      skipped++;
      continue;
    }

    // Apply result
    await prisma.match.update({
      where: { id: m.id },
      data: { homeScore: hs, awayScore: as, penaltiesWinner: penWinner },
    });
    const outcome = hs > as ? "HOME" : hs < as ? "AWAY" : "DRAW";
    await prisma.matchBet.updateMany({ where: { matchId: m.id, pick: outcome }, data: { isCorrect: true } });
    await prisma.matchBet.updateMany({ where: { matchId: m.id, pick: { not: outcome } }, data: { isCorrect: false } });

    const penStr = penWinner ? ` (pen: ${penWinner})` : "";
    console.log(`  ✅  M${m.matchNumber}: ${ourHome ?? f.homeAbbr} ${hs}-${as} ${ourAway ?? f.awayAbbr}${penStr}`);
    updated++;
  }

  console.log(`\n✨ Listo: ${updated} actualizados, ${skipped} sin cambios, ${noResult} sin resultado aún.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
