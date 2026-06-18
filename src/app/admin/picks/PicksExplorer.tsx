"use client";

import { useState, createContext, useContext } from "react";
import { WinnerStar } from "@/components/WinnerStar";

export type Participant = { id: string; name: string; image: string | null };

const WinnersContext = createContext<Set<string>>(new Set());

/** Nombre + estrella si ganó la jornada pasada. */
function UserName({ id, name }: { id: string; name: string }) {
  const winners = useContext(WinnersContext);
  return (
    <span className="inline-flex items-center gap-1">
      {firstName(name)}
      {winners.has(id) && <WinnerStar size={11} />}
    </span>
  );
}

type MatchCol = {
  id: string;
  num: number;
  homeCode: string;
  awayCode: string;
  homeFlag: string | null;
  awayFlag: string | null;
  outcome: "HOME" | "DRAW" | "AWAY" | null;
};

type MatchPool = {
  key: string;
  label: string;
  matches: MatchCol[];
  users: Participant[];
  picks: Record<string, { pick: string; isCorrect: boolean | null }>;
};

type GroupSlot = { code: string; flag: string | null; isCorrect: boolean | null } | null;
type GroupTab = { name: string; rows: { user: Participant; slots: GroupSlot[] }[] };

type SpecialTab = {
  categories: { key: string; label: string }[];
  rows: { user: Participant; picks: Record<string, { player: string; flag: string | null; isCorrect: boolean | null }> }[];
};

type BracketRow = { user: Participant; champion: string; third: string; score: number };

export type PicksPayload = {
  matchPools: MatchPool[];
  groups: GroupTab[];
  specials: SpecialTab;
  bracket: BracketRow[];
};

function firstName(name: string) {
  return name.split(" ").slice(0, 2).join(" ");
}

function cellTone(isCorrect: boolean | null) {
  if (isCorrect === true) return "bg-green-100 text-green-800";
  if (isCorrect === false) return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-700";
}

function pickLabel(pick: string, m: MatchCol) {
  if (pick === "HOME") return m.homeCode;
  if (pick === "AWAY") return m.awayCode;
  return "E";
}

function MatchMatrix({ pool }: { pool: MatchPool }) {
  if (pool.users.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">Nadie ha apostado en esta quiniela.</p>;
  }
  return (
    <div className="overflow-auto border rounded-lg max-h-[70vh]">
      <table className="text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-20 bg-gray-50 border-b border-r px-3 py-2 text-left font-semibold text-gray-600 min-w-[150px]">
              Partido
            </th>
            {pool.users.map((u) => (
              <th key={u.id} className="border-b border-r px-2 py-2 font-medium text-gray-600 whitespace-nowrap align-bottom" title={u.name}>
                <span className="block max-w-[80px]"><UserName id={u.id} name={u.name} /></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pool.matches.map((m) => (
            <tr key={m.id} className="even:bg-gray-50/40">
              <td className="sticky left-0 z-10 bg-white even:bg-gray-50 border-b border-r px-3 py-1.5 whitespace-nowrap">
                <span className="text-gray-400 mr-1.5">M{m.num}</span>
                <span className="font-medium text-gray-800">
                  {m.homeFlag ?? ""} {m.homeCode} <span className="text-gray-400">vs</span> {m.awayCode} {m.awayFlag ?? ""}
                </span>
                {m.outcome && (
                  <span className="ml-2 text-[10px] font-semibold text-blue-600">
                    ← {m.outcome === "HOME" ? m.homeCode : m.outcome === "AWAY" ? m.awayCode : "Empate"}
                  </span>
                )}
              </td>
              {pool.users.map((u) => {
                const p = pool.picks[`${u.id}:${m.id}`];
                return (
                  <td key={u.id} className="border-b border-r px-1 py-1 text-center">
                    {p ? (
                      <span className={`inline-block min-w-[34px] rounded px-1.5 py-0.5 font-semibold ${cellTone(p.isCorrect)}`}>
                        {pickLabel(p.pick, m)}
                      </span>
                    ) : (
                      <span className="text-gray-300">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupsView({ groups }: { groups: GroupTab[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.name} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b px-3 py-2 text-sm font-semibold text-gray-700">Grupo {g.name}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="px-3 py-2 text-left font-medium">Usuario</th>
                  {[1, 2, 3, 4].map((p) => <th key={p} className="px-2 py-2 font-medium">{p}°</th>)}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.user.id} className="border-b last:border-0">
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-800"><UserName id={r.user.id} name={r.user.name} /></td>
                    {r.slots.map((s, i) => (
                      <td key={i} className="px-2 py-1.5 text-center">
                        {s ? (
                          <span className={`inline-block rounded px-1.5 py-0.5 font-semibold ${cellTone(s.isCorrect)}`}>
                            {s.flag ?? ""} {s.code}
                          </span>
                        ) : <span className="text-gray-300">·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpecialsView({ specials }: { specials: SpecialTab }) {
  return (
    <div className="overflow-auto border rounded-lg max-h-[70vh]">
      <table className="text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 border-b border-r px-3 py-2 text-left font-semibold text-gray-600">Usuario</th>
            {specials.categories.map((c) => (
              <th key={c.key} className="border-b border-r px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specials.rows.map((r) => (
            <tr key={r.user.id} className="even:bg-gray-50/40">
              <td className="sticky left-0 z-10 bg-white even:bg-gray-50 border-b border-r px-3 py-1.5 whitespace-nowrap text-gray-800">
                <UserName id={r.user.id} name={r.user.name} />
              </td>
              {specials.categories.map((c) => {
                const p = r.picks[c.key];
                return (
                  <td key={c.key} className="border-b border-r px-3 py-1.5 whitespace-nowrap">
                    {p ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 ${cellTone(p.isCorrect)}`}>
                        {p.flag ?? ""} {p.player}
                      </span>
                    ) : <span className="text-gray-300">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BracketView({ rows }: { rows: BracketRow[] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 border-b">
            <th className="px-3 py-2 text-left font-medium">Usuario</th>
            <th className="px-3 py-2 text-left font-medium">Campeón</th>
            <th className="px-3 py-2 text-left font-medium">3er lugar</th>
            <th className="px-3 py-2 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user.id} className="border-b last:border-0">
              <td className="px-3 py-1.5 whitespace-nowrap text-gray-800"><UserName id={r.user.id} name={r.user.name} /></td>
              <td className="px-3 py-1.5 whitespace-nowrap font-medium text-amber-700">{r.champion}</td>
              <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">{r.third}</td>
              <td className="px-3 py-1.5 text-right font-semibold">{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PicksExplorer({ payload, winnerIds }: { payload: PicksPayload; winnerIds?: string[] }) {
  const winners = new Set(winnerIds ?? []);
  const tabs: { key: string; label: string; count: number }[] = [
    ...payload.matchPools.map((p) => ({ key: p.key, label: p.label, count: p.users.length })),
    ...(payload.groups.length ? [{ key: "GROUPS", label: "Fase de Grupos", count: new Set(payload.groups.flatMap((g) => g.rows.map((r) => r.user.id))).size }] : []),
    ...(payload.specials.rows.length ? [{ key: "SPECIALS", label: "Especiales", count: payload.specials.rows.length }] : []),
    ...(payload.bracket.length ? [{ key: "BRACKET", label: "Bracket", count: payload.bracket.length }] : []),
  ];

  const [tab, setTab] = useState(tabs[0]?.key);

  if (tabs.length === 0) {
    return <p className="text-sm text-gray-400 py-10 text-center">Aún no hay apuestas registradas.</p>;
  }

  const activePool = payload.matchPools.find((p) => p.key === tab);

  return (
    <WinnersContext.Provider value={winners}>
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                active ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 ${active ? "text-gray-300" : "text-gray-400"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {activePool && <MatchMatrix pool={activePool} />}
      {tab === "GROUPS" && <GroupsView groups={payload.groups} />}
      {tab === "SPECIALS" && <SpecialsView specials={payload.specials} />}
      {tab === "BRACKET" && <BracketView rows={payload.bracket} />}

      <p className="mt-3 text-[11px] text-gray-400">
        <span className="inline-block w-3 h-3 rounded bg-green-100 align-middle mr-1" /> acertado
        <span className="inline-block w-3 h-3 rounded bg-red-50 align-middle ml-3 mr-1" /> fallado
        <span className="inline-block w-3 h-3 rounded bg-gray-100 align-middle ml-3 mr-1" /> sin calificar
      </p>
    </div>
    </WinnersContext.Provider>
  );
}
