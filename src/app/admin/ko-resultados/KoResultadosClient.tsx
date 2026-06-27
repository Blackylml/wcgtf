"use client";

import { useState } from "react";
import { saveKoRoundResult } from "./actions";
import type { Module } from "@/generated/prisma/client";

type RoundData = {
  module: string;
  label: string;
  topScorerTeam: string | null;
  firstHalfGoals: number | null;
  earliestGoalTeam: string | null;
};

export function KoResultadosClient({ initialData }: { initialData: RoundData[] }) {
  const [rounds, setRounds] = useState<RoundData[]>(initialData);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (module: string, field: keyof RoundData, value: string) => {
    setRounds((prev) => prev.map((r) => r.module !== module ? r : {
      ...r,
      [field]: field === "firstHalfGoals" ? (value === "" ? null : Number(value)) : (value.trim() === "" ? null : value.trim().toUpperCase()),
    }));
    setSaved((prev) => ({ ...prev, [module]: false }));
  };

  const save = async (module: string) => {
    setSaving(module);
    setErrors((prev) => ({ ...prev, [module]: "" }));
    const r = rounds.find((x) => x.module === module)!;
    try {
      await saveKoRoundResult(module as Module, {
        topScorerTeam: r.topScorerTeam,
        firstHalfGoals: r.firstHalfGoals,
        earliestGoalTeam: r.earliestGoalTeam,
      });
      setSaved((prev) => ({ ...prev, [module]: true }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, [module]: e instanceof Error ? e.message : "Error al guardar" }));
    }
    setSaving(null);
  };

  const inp = "block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400";

  if (initialData.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No hay rondas KO habilitadas todavía.</p>;
  }

  return (
    <div className="space-y-4">
      {rounds.map((r) => {
        const isSaving = saving === r.module;
        const isSaved = saved[r.module];
        const err = errors[r.module];
        return (
          <div key={r.module} className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">{r.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Equipo más goleador (código)</label>
                <input
                  type="text" placeholder="Ej. BRA" maxLength={4}
                  value={r.topScorerTeam ?? ""}
                  onChange={(e) => update(r.module, "topScorerTeam", e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Goles totales en 1er tiempo</label>
                <input
                  type="number" min={0} max={99} placeholder="Ej. 14"
                  value={r.firstHalfGoals ?? ""}
                  onChange={(e) => update(r.module, "firstHalfGoals", e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Equipo con gol más tempranero</label>
                <input
                  type="text" placeholder="Ej. MEX" maxLength={4}
                  value={r.earliestGoalTeam ?? ""}
                  onChange={(e) => update(r.module, "earliestGoalTeam", e.target.value)}
                  className={inp}
                />
              </div>
            </div>
            {err && <p className="text-red-500 text-xs mb-2">{err}</p>}
            <button
              onClick={() => save(r.module)}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isSaved ? "bg-green-100 text-green-700" : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              {isSaving ? "Guardando..." : isSaved ? "✓ Guardado" : "Guardar"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
