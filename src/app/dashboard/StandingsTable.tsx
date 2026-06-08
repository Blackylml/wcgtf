"use client";

import { useState } from "react";

export type Standing = {
  id: string;
  name: string;
  total: number;
  groupScore: number;
  matchScore: number;
  specialScore: number;
  bracketScore: number;
};

const TABS = [
  { key: "total", label: "General", metric: (r: Standing) => r.total },
  { key: "group", label: "Grupos", metric: (r: Standing) => r.groupScore },
  { key: "match", label: "Partidos", metric: (r: Standing) => r.matchScore },
  { key: "special", label: "Especiales", metric: (r: Standing) => r.specialScore },
  { key: "bracket", label: "Bracket", metric: (r: Standing) => r.bracketScore },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const RANK_COLOR = ["text-amber-300", "text-slate-200", "text-orange-300"];

export function StandingsTable({ standings, currentUserId }: { standings: Standing[]; currentUserId: string }) {
  const [tab, setTab] = useState<TabKey>("total");
  const active = TABS.find((t) => t.key === tab)!;
  const isTotal = tab === "total";

  const sorted = [...standings].sort((a, b) => active.metric(b) - active.metric(a) || b.total - a.total);

  return (
    <div className="animate-rise mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden" style={{ animationDelay: "140ms" }}>
      <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.06]">
        <h2 className="font-display text-sm font-bold mb-3">Ranking</h2>
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-[0_6px_18px_-8px_rgba(34,224,122,0.9)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-white border border-white/10"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-slate-500">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Jugador</th>
              {isTotal ? (
                <>
                  <th className="px-3 py-2 text-right" title="Grupos">G</th>
                  <th className="px-3 py-2 text-right" title="Partidos">P</th>
                  <th className="px-3 py-2 text-right" title="Especiales">E</th>
                  <th className="px-3 py-2 text-right" title="Bracket">B</th>
                  <th className="px-3 py-2 text-right font-bold text-white">Tot</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2 text-right font-bold text-white">Pts</th>
                  <th className="px-3 py-2 text-right text-slate-600">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((u, i) => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-b border-white/[0.05] ${isMe ? "bg-green-400/[0.08]" : "hover:bg-white/[0.03]"}`}>
                  <td className={`px-3 py-2.5 font-mono font-bold ${i < 3 ? RANK_COLOR[i] : "text-slate-500"}`}>{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-white">
                    {u.name.split(" ")[0]}
                    {isMe && <span className="ml-1 text-[10px] font-semibold text-green-400">tú</span>}
                  </td>
                  {isTotal ? (
                    <>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.groupScore}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.matchScore}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.specialScore}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400 tabular-nums">{u.bracketScore}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">{u.total}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">{active.metric(u)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{u.total}</td>
                    </>
                  )}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={isTotal ? 7 : 4} className="px-3 py-8 text-center text-slate-600">Sin participantes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
