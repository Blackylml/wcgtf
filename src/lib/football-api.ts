// Cliente mínimo de API-Football (api-sports.io) para traer fixtures del Mundial.
// Requiere FOOTBALL_API_KEY. Opcional: FOOTBALL_LEAGUE_ID (default 1 = World Cup),
// FOOTBALL_SEASON (default 2026).

const BASE = "https://v3.football.api-sports.io";

export type ApiFixture = {
  id: number;
  date: string;          // ISO
  statusShort: string;   // NS, 1H, HT, 2H, FT, AET, PEN, PST, CANC...
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  penHome: number | null;
  penAway: number | null;
};

const FINISHED = new Set(["FT", "AET", "PEN"]);
export const isFinished = (statusShort: string) => FINISHED.has(statusShort);

export async function fetchWorldCupFixtures(): Promise<ApiFixture[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY no está configurada");

  const league = process.env.FOOTBALL_LEAGUE_ID ?? "1";
  const season = process.env.FOOTBALL_SEASON ?? "2026";

  const res = await fetch(`${BASE}/fixtures?league=${league}&season=${season}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`);

  const json = await res.json();
  const rows = Array.isArray(json?.response) ? json.response : [];
  return rows.map((f: Record<string, unknown>) => {
    const fixture = f.fixture as { id: number; date: string; status: { short: string } };
    const teams = f.teams as { home: { name: string }; away: { name: string } };
    const goals = f.goals as { home: number | null; away: number | null };
    const score = f.score as { penalty?: { home: number | null; away: number | null } };
    return {
      id: fixture.id,
      date: fixture.date,
      statusShort: fixture.status.short,
      home: teams.home.name,
      away: teams.away.name,
      homeGoals: goals.home,
      awayGoals: goals.away,
      penHome: score?.penalty?.home ?? null,
      penAway: score?.penalty?.away ?? null,
    } satisfies ApiFixture;
  });
}
