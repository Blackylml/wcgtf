import type { Module } from "@/generated/prisma/client";

export type ModuleAccent = "green" | "blue" | "amber" | "purple";

export const MODULE_META: Record<Module, { label: string; path: string; accent: ModuleAccent }> = {
  GROUPS: { label: "Fase de Grupos", path: "/grupos", accent: "green" },
  MATCHES_G1: { label: "Jornada 1 (1–24)", path: "/partidos", accent: "blue" },
  MATCHES_G2: { label: "Jornada 2 (25–48)", path: "/partidos", accent: "blue" },
  MATCHES_G3: { label: "Jornada 3 (49–72)", path: "/partidos", accent: "blue" },
  MATCHES: { label: "Partidos (eliminatorias)", path: "/partidos", accent: "blue" },
  BRACKET: { label: "Bracket", path: "/bracket", accent: "amber" },
  SPECIALS: { label: "Premios Especiales", path: "/especiales", accent: "purple" },
};

// Orden para el panel de precios y para iterar accesos.
export const ALL_MODULES: Module[] = ["GROUPS", "MATCHES_G1", "MATCHES_G2", "MATCHES_G3", "MATCHES", "BRACKET", "SPECIALS"];

/** Las 3 quinielas de fase de grupos (partidos divididos por jornada). */
export const GROUP_MATCH_QUINIELAS: { module: Module; label: string; min: number; max: number }[] = [
  { module: "MATCHES_G1", label: "Jornada 1", min: 1, max: 24 },
  { module: "MATCHES_G2", label: "Jornada 2", min: 25, max: 48 },
  { module: "MATCHES_G3", label: "Jornada 3", min: 49, max: 72 },
];

/** Devuelve el módulo (quiniela) al que pertenece un partido. */
export function matchModule(stage: string, matchNumber: number): Module {
  if (stage === "GROUP") {
    if (matchNumber <= 24) return "MATCHES_G1";
    if (matchNumber <= 48) return "MATCHES_G2";
    return "MATCHES_G3";
  }
  return "MATCHES";
}
