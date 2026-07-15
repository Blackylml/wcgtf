import type { Module, Stage } from "@/generated/prisma/client";

export type ModuleAccent = "green" | "blue" | "amber" | "purple";

export const MODULE_META: Record<Module, { label: string; path: string; accent: ModuleAccent }> = {
  GROUPS:     { label: "Fase de Grupos",            path: "/grupos",          accent: "green"  },
  MATCHES_G1: { label: "Jornada 1",                 path: "/partidos",        accent: "blue"   },
  MATCHES_G2: { label: "Jornada 2 · $50",           path: "/partidos",        accent: "blue"   },
  MATCHES_G2B:{ label: "Jornada 2 · Premio $250",   path: "/partidos",        accent: "purple" },
  MATCHES_G3: { label: "Jornada 3",                 path: "/partidos",        accent: "blue"   },
  MATCHES:    { label: "Partidos (eliminatorias)",  path: "/partidos",        accent: "blue"   },
  KO_R32:     { label: "Dieciseisavos",             path: "/partidos/KO_R32", accent: "amber"  },
  KO_R16:     { label: "Octavos de Final",          path: "/partidos/KO_R16", accent: "amber"  },
  KO_QF:      { label: "Cuartos de Final",          path: "/partidos/KO_QF",  accent: "amber"  },
  KO_SF:      { label: "Semifinales",               path: "/partidos/KO_SF",  accent: "amber"  },
  KO_FINAL:   { label: "Final",                     path: "/partidos/KO_FINAL",accent: "amber" },
  BRACKET:    { label: "Bracket",                   path: "/bracket",         accent: "amber"  },
  SPECIALS:   { label: "Premios Especiales",        path: "/especiales",      accent: "purple" },
  // Liga MX Apertura 2026 — Jornadas regulares
  LMX_J1:    { label: "Jornada 1",    path: "/partidos/LMX_J1",    accent: "amber"  },
  LMX_J2:    { label: "Jornada 2",    path: "/partidos/LMX_J2",    accent: "amber"  },
  LMX_J3:    { label: "Jornada 3",    path: "/partidos/LMX_J3",    accent: "amber"  },
  LMX_J4:    { label: "Jornada 4",    path: "/partidos/LMX_J4",    accent: "amber"  },
  LMX_J5:    { label: "Jornada 5",    path: "/partidos/LMX_J5",    accent: "amber"  },
  LMX_J6:    { label: "Jornada 6",    path: "/partidos/LMX_J6",    accent: "amber"  },
  LMX_J7:    { label: "Jornada 7",    path: "/partidos/LMX_J7",    accent: "amber"  },
  LMX_J8:    { label: "Jornada 8",    path: "/partidos/LMX_J8",    accent: "amber"  },
  LMX_J9:    { label: "Jornada 9",    path: "/partidos/LMX_J9",    accent: "amber"  },
  LMX_J10:   { label: "Jornada 10",   path: "/partidos/LMX_J10",   accent: "amber"  },
  LMX_J11:   { label: "Jornada 11",   path: "/partidos/LMX_J11",   accent: "amber"  },
  LMX_J12:   { label: "Jornada 12",   path: "/partidos/LMX_J12",   accent: "amber"  },
  LMX_J13:   { label: "Jornada 13",   path: "/partidos/LMX_J13",   accent: "amber"  },
  LMX_J14:   { label: "Jornada 14",   path: "/partidos/LMX_J14",   accent: "amber"  },
  LMX_J15:   { label: "Jornada 15",   path: "/partidos/LMX_J15",   accent: "amber"  },
  LMX_J16:   { label: "Jornada 16",   path: "/partidos/LMX_J16",   accent: "amber"  },
  LMX_J17:   { label: "Jornada 17",   path: "/partidos/LMX_J17",   accent: "amber"  },
  // Liga MX — Liguilla
  LMX_QF:    { label: "Liguilla — Cuartos",   path: "/partidos/LMX_QF",    accent: "amber"  },
  LMX_SF:    { label: "Liguilla — Semis",     path: "/partidos/LMX_SF",    accent: "amber"  },
  LMX_FINAL: { label: "Liguilla — Final",     path: "/partidos/LMX_FINAL", accent: "amber"  },
};

// Orden para el panel de precios y para iterar accesos.
export const ALL_MODULES: Module[] = [
  "GROUPS", "MATCHES_G1", "MATCHES_G2", "MATCHES_G2B", "MATCHES_G3", "MATCHES",
  "KO_R32", "KO_R16", "KO_QF", "KO_SF", "KO_FINAL",
  "BRACKET", "SPECIALS",
  "LMX_J1","LMX_J2","LMX_J3","LMX_J4","LMX_J5","LMX_J6","LMX_J7","LMX_J8","LMX_J9",
  "LMX_J10","LMX_J11","LMX_J12","LMX_J13","LMX_J14","LMX_J15","LMX_J16","LMX_J17",
  "LMX_QF","LMX_SF","LMX_FINAL",
];

/** Bolsas (quinielas) de la fase de grupos. */
export const GROUP_MATCH_QUINIELAS: { module: Module; label: string; min: number; max: number }[] = [
  { module: "MATCHES_G1",  label: "Jornada 1",            min: 1,  max: 24 },
  { module: "MATCHES_G2",  label: "Jornada 2 · $50",      min: 25, max: 48 },
  { module: "MATCHES_G2B", label: "Jornada 2 · Premio $250", min: 25, max: 48 },
  { module: "MATCHES_G3",  label: "Jornada 3",            min: 49, max: 72 },
];

/** Quinielas por ronda eliminatoria. `available` controla si la ronda está abierta al público. */
export const KO_QUINIELAS: { module: Module; label: string; stages: Stage[]; available: boolean }[] = [
  { module: "KO_R32",   label: "Dieciseisavos",   stages: ["R32"],            available: true  },
  { module: "KO_R16",   label: "Octavos de Final", stages: ["R16"],           available: false },
  { module: "KO_QF",    label: "Cuartos de Final", stages: ["QF"],            available: false },
  { module: "KO_SF",    label: "Semifinales",      stages: ["SF"],            available: false },
  { module: "KO_FINAL", label: "Final",            stages: ["THIRD", "FINAL"],available: false },
];

/** Rango [min,max] de partidos de una bolsa de jornada (grupos). */
export function quinielaRange(module: Module): { min: number; max: number } | null {
  return GROUP_MATCH_QUINIELAS.find((q) => q.module === module) ?? null;
}

/** Stages que cubre un módulo KO. Null si no es KO. */
export function koQuinielaStages(module: Module): Stage[] | null {
  return KO_QUINIELAS.find((q) => q.module === module)?.stages ?? null;
}

/** Jornadas de Liga MX Apertura 2026 (J1–J17). 9 partidos cada una, matchNumber 1001+.
 * `extra` permite añadir matchNumbers fuera del rango min-max (ej. picks de desempate). */
export const LMX_JORNADAS: { module: Module; label: string; min: number; max: number; extra?: number[]; exclude?: number[] }[] = [
  { module: "LMX_J1",  label: "Jornada 1",  min: 1001, max: 1009, extra: [9001, 9002, 9003, 9004], exclude: [1008] },
  { module: "LMX_J2",  label: "Jornada 2",  min: 1010, max: 1018 },
  { module: "LMX_J3",  label: "Jornada 3",  min: 1019, max: 1027 },
  { module: "LMX_J4",  label: "Jornada 4",  min: 1028, max: 1036 },
  { module: "LMX_J5",  label: "Jornada 5",  min: 1037, max: 1045 },
  { module: "LMX_J6",  label: "Jornada 6",  min: 1046, max: 1054 },
  { module: "LMX_J7",  label: "Jornada 7",  min: 1055, max: 1063 },
  { module: "LMX_J8",  label: "Jornada 8",  min: 1064, max: 1072 },
  { module: "LMX_J9",  label: "Jornada 9",  min: 1073, max: 1081 },
  { module: "LMX_J10", label: "Jornada 10", min: 1082, max: 1090 },
  { module: "LMX_J11", label: "Jornada 11", min: 1091, max: 1099 },
  { module: "LMX_J12", label: "Jornada 12", min: 1100, max: 1108 },
  { module: "LMX_J13", label: "Jornada 13", min: 1109, max: 1117 },
  { module: "LMX_J14", label: "Jornada 14", min: 1118, max: 1126 },
  { module: "LMX_J15", label: "Jornada 15", min: 1127, max: 1135 },
  { module: "LMX_J16", label: "Jornada 16", min: 1136, max: 1144 },
  { module: "LMX_J17", label: "Jornada 17", min: 1145, max: 1153 },
];

/** Quinielas de Liguilla. Stages Liga MX: LIG_QF, LIG_SF, LIG_FINAL. */
export const LMX_LIGUILLA: { module: Module; label: string; stages: Stage[]; available: boolean }[] = [
  { module: "LMX_QF",    label: "Liguilla — Cuartos", stages: ["LIG_QF"],    available: false },
  { module: "LMX_SF",    label: "Liguilla — Semis",   stages: ["LIG_SF"],    available: false },
  { module: "LMX_FINAL", label: "Liguilla — Final",   stages: ["LIG_FINAL"], available: false },
];
