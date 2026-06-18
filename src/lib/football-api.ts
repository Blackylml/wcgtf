// Cliente de resultados usando los endpoints públicos de ESPN (sin API key).
// Scoreboard del Mundial por rango de fechas. La abreviatura de ESPN coincide con
// el `code` FIFA de nuestros equipos, así que el mapeo es por código.
// Config opcional: ESPN_LEAGUE (default fifa.world), ESPN_DATE_RANGE (default torneo 2026).

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export type ApiFixture = {
  id: number;
  date: string;
  statusShort: string;   // FT, PEN, LIVE, NS
  state: string;         // pre | in | post
  detail: string;        // "45'", "HT", "FT", etc.
  home: string;
  away: string;
  homeAbbr: string;      // = code FIFA (MEX, RSA, ...)
  awayAbbr: string;
  homeGoals: number | null;
  awayGoals: number | null;
  penHome: number | null;
  penAway: number | null;
};

const FINISHED = new Set(["FT", "AET", "PEN"]);
export const isFinished = (statusShort: string) => FINISHED.has(statusShort);

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

type EspnCompetitor = {
  homeAway: string;
  score?: string | number;
  shootoutScore?: number;
  team?: { displayName?: string; name?: string; abbreviation?: string };
};
type EspnEvent = {
  id: string;
  date: string;
  status?: { type?: { state?: string; completed?: boolean; shortDetail?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
};

function parseEvent(e: EspnEvent): ApiFixture | null {
  const comp = e.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const completed = !!e.status?.type?.completed;
  const state = e.status?.type?.state ?? "pre"; // pre | in | post
  const penHome = home.shootoutScore != null ? Number(home.shootoutScore) : null;
  const penAway = away.shootoutScore != null ? Number(away.shootoutScore) : null;
  const hasPens = penHome != null && penAway != null && (penHome > 0 || penAway > 0);
  const statusShort = completed ? (hasPens ? "PEN" : "FT") : state === "in" ? "LIVE" : "NS";

  return {
    id: Number(e.id),
    date: e.date,
    statusShort,
    state,
    detail: e.status?.type?.shortDetail ?? "",
    home: home.team?.displayName ?? home.team?.name ?? "",
    away: away.team?.displayName ?? away.team?.name ?? "",
    homeAbbr: home.team?.abbreviation ?? "",
    awayAbbr: away.team?.abbreviation ?? "",
    homeGoals: toNum(home.score),
    awayGoals: toNum(away.score),
    penHome,
    penAway,
  };
}

export async function fetchWorldCupFixtures(dates?: string): Promise<ApiFixture[]> {
  const league = process.env.ESPN_LEAGUE ?? "fifa.world";
  const range = dates ?? process.env.ESPN_DATE_RANGE ?? "20260611-20260720";
  const url = `${ESPN_BASE}/${league}/scoreboard?dates=${range}&limit=400`;

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);

  const json = await res.json();
  const events: EspnEvent[] = Array.isArray(json?.events) ? json.events : [];
  return events.map(parseEvent).filter((f): f is ApiFixture => f !== null);
}
