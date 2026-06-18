import { prisma } from "@/lib/prisma";
import { MODULE_META, GROUP_MATCH_QUINIELAS } from "@/lib/modules";
import { PicksExplorer, type PicksPayload, type Participant } from "./PicksExplorer";
import type { Module } from "@/generated/prisma/client";

const SPECIAL_LABELS: Record<string, string> = {
  TOP_SCORER: "Goleador",
  BEST_PLAYER: "Jugador del torneo",
  BEST_GOALKEEPER: "Mejor portero",
  BEST_YOUNG_PLAYER: "Mejor joven",
};

// Orden de las bolsas de partidos en las pestañas.
const MATCH_POOL_ORDER: { key: string; module: Module | null; label: string }[] = [
  ...GROUP_MATCH_QUINIELAS.map((q) => ({ key: q.module, module: q.module, label: q.label })),
  { key: "MATCHES", module: "MATCHES" as Module, label: MODULE_META.MATCHES.label },
  { key: "INDIVIDUAL", module: null, label: "Apuestas individuales" },
];

function outcomeOf(homeScore: number | null, awayScore: number | null): "HOME" | "DRAW" | "AWAY" | null {
  if (homeScore == null || awayScore == null) return null;
  return homeScore > awayScore ? "HOME" : homeScore < awayScore ? "AWAY" : "DRAW";
}

export default async function AdminPicksPage() {
  const [matchBets, groupBets, specialBets, bracketBets, teams] = await Promise.all([
    prisma.matchBet.findMany({
      select: {
        pick: true, poolModule: true, isCorrect: true,
        user: { select: { id: true, name: true, image: true } },
        match: {
          select: {
            id: true, matchNumber: true, homeScore: true, awayScore: true,
            homeTeam: { select: { code: true, flag: true } },
            awayTeam: { select: { code: true, flag: true } },
            homeLabel: true, awayLabel: true,
          },
        },
      },
    }),
    prisma.groupBet.findMany({
      select: {
        position: true, isCorrect: true,
        user: { select: { id: true, name: true, image: true } },
        groupPool: { select: { name: true } },
        team: { select: { code: true, flag: true, name: true } },
      },
    }),
    prisma.specialBet.findMany({
      select: {
        category: true, isCorrect: true,
        user: { select: { id: true, name: true, image: true } },
        player: { select: { name: true, team: { select: { flag: true } } } },
      },
    }),
    prisma.bracketBet.findMany({
      select: {
        predictions: true, score: true,
        user: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.team.findMany({ select: { code: true, name: true, flag: true } }),
  ]);

  const teamMap = new Map(teams.map((t) => [t.code, t]));
  const part = (u: { id: string; name: string | null; image: string | null }): Participant => ({
    id: u.id,
    name: u.name ?? "—",
    image: u.image ?? null,
  });

  // ── Bolsas de partidos (matriz partidos × usuarios) ──────────────────────
  const matchPools = MATCH_POOL_ORDER.map(({ key, module, label }) => {
    const bets = matchBets.filter((b) => b.poolModule === module);
    if (bets.length === 0) return null;

    const matchMap = new Map<string, (typeof bets)[number]["match"]>();
    const userMap = new Map<string, Participant>();
    const picks: Record<string, { pick: string; isCorrect: boolean | null }> = {};

    for (const b of bets) {
      matchMap.set(b.match.id, b.match);
      userMap.set(b.user.id, part(b.user));
      picks[`${b.user.id}:${b.match.id}`] = { pick: b.pick, isCorrect: b.isCorrect };
    }

    const matches = [...matchMap.values()]
      .sort((a, b) => a.matchNumber - b.matchNumber)
      .map((m) => ({
        id: m.id,
        num: m.matchNumber,
        homeCode: m.homeTeam?.code ?? m.homeLabel ?? "?",
        awayCode: m.awayTeam?.code ?? m.awayLabel ?? "?",
        homeFlag: m.homeTeam?.flag ?? null,
        awayFlag: m.awayTeam?.flag ?? null,
        outcome: outcomeOf(m.homeScore, m.awayScore),
      }));

    const users = [...userMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { key, label, matches, users, picks };
  }).filter(Boolean) as PicksPayload["matchPools"];

  // ── Grupos (por grupo: usuario × 4 posiciones) ───────────────────────────
  const groupNames = [...new Set(groupBets.map((b) => b.groupPool.name))].sort();
  const groups = groupNames.map((name) => {
    const rows = new Map<string, { user: Participant; slots: ({ code: string; flag: string | null; isCorrect: boolean | null } | null)[] }>();
    for (const b of groupBets.filter((x) => x.groupPool.name === name)) {
      let row = rows.get(b.user.id);
      if (!row) { row = { user: part(b.user), slots: [null, null, null, null] }; rows.set(b.user.id, row); }
      if (b.position >= 1 && b.position <= 4) {
        row.slots[b.position - 1] = { code: b.team.code, flag: b.team.flag, isCorrect: b.isCorrect };
      }
    }
    return { name, rows: [...rows.values()].sort((a, b) => a.user.name.localeCompare(b.user.name)) };
  }).filter((g) => g.rows.length > 0);

  // ── Especiales (usuario × 4 categorías) ──────────────────────────────────
  const specialCats = Object.keys(SPECIAL_LABELS);
  const specialUsers = new Map<string, { user: Participant; picks: Record<string, { player: string; flag: string | null; isCorrect: boolean | null }> }>();
  for (const b of specialBets) {
    let row = specialUsers.get(b.user.id);
    if (!row) { row = { user: part(b.user), picks: {} }; specialUsers.set(b.user.id, row); }
    row.picks[b.category] = { player: b.player.name, flag: b.player.team.flag, isCorrect: b.isCorrect };
  }
  const specials = {
    categories: specialCats.map((k) => ({ key: k, label: SPECIAL_LABELS[k] })),
    rows: [...specialUsers.values()].sort((a, b) => a.user.name.localeCompare(b.user.name)),
  };

  // ── Bracket (usuario → campeón / subcampeón / 3er / pts) ──────────────────
  const bracket = bracketBets.map((b) => {
    const p = b.predictions as Record<string, unknown>;
    const code = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : null);
    const name = (c: string | null) => (c ? `${teamMap.get(c)?.flag ?? ""} ${teamMap.get(c)?.name ?? c}`.trim() : "—");
    return {
      user: part(b.user),
      champion: name(code("FINAL")),
      third: name(code("THIRD")),
      score: b.score,
    };
  }).sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));

  const payload: PicksPayload = { matchPools, groups, specials, bracket };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Picks de todos</h1>
      <p className="text-sm text-gray-500 mb-6">Apuestas de cada participante, separadas por quiniela.</p>
      <PicksExplorer payload={payload} />
    </div>
  );
}
