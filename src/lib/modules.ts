import type { Module } from "@/generated/prisma/client";

export type ModuleAccent = "green" | "blue" | "amber" | "purple";

export const MODULE_META: Record<Module, { label: string; path: string; accent: ModuleAccent }> = {
  GROUPS: { label: "Fase de Grupos", path: "/grupos", accent: "green" },
  MATCHES_G1: { label: "Jornada 1", path: "/partidos", accent: "blue" },
  MATCHES_G2: { label: "Jornada 2 · $50", path: "/partidos", accent: "blue" },
  MATCHES_G2B: { label: "Jornada 2 · $250", path: "/partidos", accent: "purple" },
  MATCHES_G3: { label: "Jornada 3", path: "/partidos", accent: "blue" },
  MATCHES: { label: "Partidos (eliminatorias)", path: "/partidos", accent: "blue" },
  BRACKET: { label: "Bracket", path: "/bracket", accent: "amber" },
  SPECIALS: { label: "Premios Especiales", path: "/especiales", accent: "purple" },
};

// Orden para el panel de precios y para iterar accesos.
export const ALL_MODULES: Module[] = ["GROUPS", "MATCHES_G1", "MATCHES_G2", "MATCHES_G2B", "MATCHES_G3", "MATCHES", "BRACKET", "SPECIALS"];

/**
 * Bolsas (quinielas) de la fase de grupos. La Jornada 2 tiene DOS bolsas
 * independientes ($50 y $250) que cubren el mismo rango de partidos.
 */
export const GROUP_MATCH_QUINIELAS: { module: Module; label: string; min: number; max: number }[] = [
  { module: "MATCHES_G1", label: "Jornada 1", min: 1, max: 24 },
  { module: "MATCHES_G2", label: "Jornada 2 · $50", min: 25, max: 48 },
  { module: "MATCHES_G2B", label: "Jornada 2 · $250", min: 25, max: 48 },
  { module: "MATCHES_G3", label: "Jornada 3", min: 49, max: 72 },
];

/** Devuelve el rango [min,max] de una bolsa de jornada (para validar partidos). */
export function quinielaRange(module: Module): { min: number; max: number } | null {
  return GROUP_MATCH_QUINIELAS.find((q) => q.module === module) ?? null;
}
