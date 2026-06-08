import type { Module } from "@/generated/prisma/client";

export type ModuleAccent = "green" | "blue" | "amber" | "purple";

export const MODULE_META: Record<Module, { label: string; path: string; accent: ModuleAccent }> = {
  GROUPS: { label: "Fase de Grupos", path: "/grupos", accent: "green" },
  MATCHES: { label: "Partidos", path: "/partidos", accent: "blue" },
  BRACKET: { label: "Bracket", path: "/bracket", accent: "amber" },
  SPECIALS: { label: "Premios Especiales", path: "/especiales", accent: "purple" },
};

export const ALL_MODULES: Module[] = ["GROUPS", "MATCHES", "BRACKET", "SPECIALS"];
