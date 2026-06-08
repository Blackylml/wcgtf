"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { SpecialCategory } from "@/generated/prisma/client";
import { submitSpecialBet } from "./actions";
import { Check, Search, Lock } from "lucide-react";

type Player = { id: string; name: string; team: { name: string; flag: string | null } };

export function SpecialCard({
  category, label, icon: Icon, price, isOpen, players, existingBet,
}: {
  category: SpecialCategory; label: string; icon: ElementType; price: number; isOpen: boolean;
  players: Player[];
  existingBet: { player: { name: string; team: { name: string; flag: string | null } } } | null;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bet, setBet] = useState(existingBet);

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true); setError("");
    const result = await submitSpecialBet(category, selected);
    setLoading(false);
    if (result?.error) setError(result.error);
    else if (result?.redirectUrl) window.location.href = result.redirectUrl;
    else setBet({ player: players.find((p) => p.id === selected)! });
  }

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full ${!isOpen && !bet ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-purple-400/10 ring-1 ring-purple-400/30 halo-purple shrink-0">
            <Icon size={17} className="text-purple-400" strokeWidth={2} />
          </span>
          <h3 className="font-display font-bold text-sm text-white leading-tight">{label}</h3>
        </div>
        {price > 0 && (
          <span className="text-amber-300 text-[11px] font-semibold bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5 shrink-0">
            ${price}
          </span>
        )}
      </div>

      {bet ? (
        <div className="bg-green-400/[0.1] border border-green-400/25 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Check size={12} className="text-green-400" />
            <p className="text-[11px] text-green-300 font-semibold uppercase tracking-wide">Tu apuesta</p>
          </div>
          <p className="font-semibold text-white text-sm">{bet.player.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{bet.player.team.flag} {bet.player.team.name}</p>
        </div>
      ) : !isOpen ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-600"><Lock size={11} /> Cerrado — sin apuesta</p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar jugador o equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/15 focus:outline-none"
            />
          </div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            size={6}
            className="w-full bg-black/30 border border-white/10 rounded-lg text-sm text-slate-200 overflow-auto focus:border-purple-400/50 focus:outline-none p-1"
          >
            <option value="">— Seleccionar —</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.team.flag} {p.name} · {p.team.name}
              </option>
            ))}
          </select>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading || !selected}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-40 active:scale-[0.98] shadow-[0_8px_24px_-10px_rgba(168,123,255,0.7)]"
          >
            {loading ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
