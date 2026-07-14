import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const ranges = ["20260701-20260720"];
  for (const r of ranges) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${r}&limit=400`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    for (const e of json.events ?? []) {
      const c = e.competitions?.[0];
      const h = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "home");
      const a = c?.competitors?.find((x: { homeAway: string }) => x.homeAway === "away");
      const state = e.status?.type?.state;
      const detail = e.status?.type?.shortDetail;
      const completed = e.status?.type?.completed;
      const penH = h?.shootoutScore;
      const penA = a?.shootoutScore;
      console.log(
        `id:${e.id} | ${e.date.slice(0, 10)} | ${h?.team?.abbreviation} ${h?.score ?? "?"}-${a?.score ?? "?"} ${a?.team?.abbreviation}` +
        (penH || penA ? ` (pen ${penH}-${penA})` : "") +
        ` | state=${state} done=${completed} | ${detail}`
      );
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
