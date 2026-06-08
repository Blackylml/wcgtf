"use client";

import { useState } from "react";
import type { ElementType } from "react";
import { SpecialCategory } from "@/generated/prisma/client";
import { createSpecialBet, deleteSpecialBet } from "./actions";
import { Check, Search, Lock, Trash2, Trophy, Star, Shield, Award } from "lucide-react";

const ICON_MAP: Record<string, ElementType> = { Trophy, Star, Shield, Award };

type Player = { id: string; name: string; team: { name: string; flag: string | null } };
type ExistingBet = { player: { name: string; team: { name: string; flag: string | null } } };

export function SpecialCard({
  category, label, iconName, isOpen, enabled, players, existingBet,
}: {
  category: SpecialCategory;
  label: string;
  iconName: string;
  isOpen: boolean;
  enabled: boolean;
  players: Player[];
  existingBet: ExistingBet | null;
}) {
  const Icon = ICON_MAP[iconName] ?? Trophy;

  const [bet, setBet] = useState<ExistingBet | null>(existingBet);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true); setError("");
    const result = await createSpecialBet(category, selected);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    const p = players.find((p) => p.id === selected);
    if (p) setBet({ player: p });
  }

  async function handleDelete() {
    setLoading(true); setError("");
    const result = await deleteSpecialBet(category);
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    setBet(null);
    setSelected("");
    setSearch("");
  }

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 h-full flex flex-col ${!isOpen && !bet ? "opacity-50" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5 min-w-0">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-purple-400/10 ring-1 ring-purple-400/30 halo-purple shrink-0">
          <Icon size={17} className="text-purple-400" strokeWidth={2} />
        </span>
        <h3 className="font-display font-bold text-sm text-white leading-tight">{label}</h3>
      </div>

      {bet ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-green-400/[0.1] border border-green-400/25 rounded-xl p-3 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Check size={12} className="text-green-400" />
              <p className="text-[11px] text-green-300 font-semibold uppercase tracking-wide">Tu apuesta</p>
            </div>
            <p className="font-semibold text-white text-sm">{bet.player.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{bet.player.team.flag} {bet.player.team.name}</p>
          </div>
          {isOpen && (
            <button onClick={handleDelete} disabled={loading} className="mt-2 flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={11} /> {loading ? "..." : "Cambiar apuesta"}
            </button>
          )}
          {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
        </div>
      ) : !isOpen ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-auto"><Lock size={11} /> Cerrado — sin apuesta</p>
      ) : !enabled ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-auto leading-relaxed"><Lock size={11} /> Paga la entrada arriba para apostar.</p>
      ) : (
        <div className="space-y-2 flex-1 flex flex-col">
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
          <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 divide-y divide-white/[0.06] max-h-52">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-600 py-4">Sin resultados</p>
            ) : filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  selected === p.id ? "bg-purple-400/15 border-l-2 border-purple-400" : "hover:bg-white/[0.04] border-l-2 border-transparent"
                }`}
              >
                <span className="text-lg leading-none shrink-0">{p.team.flag}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{p.team.name}</p>
                </div>
                {selected === p.id && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-purple-400 grid place-items-center">
                    <Check size={11} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleConfirm}
            disabled={loading || !selected}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-40 active:scale-[0.98]"
          >
            {loading ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      )}
    </div>
  );
}
