import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260618-20260619&limit=400";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  const json = await res.json();
  for (const e of json.events ?? []) {
    const c = e.competitions?.[0];
    const h = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "home");
    const a = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "away");
    console.log(`${e.id} | ${h?.team?.abbreviation} ${h?.score}-${a?.score} ${a?.team?.abbreviation} | state=${e.status?.type?.state} | ${e.status?.type?.shortDetail}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
