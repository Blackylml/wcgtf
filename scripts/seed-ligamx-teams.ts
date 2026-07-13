/**
 * Inserta los 18 equipos de Liga MX Apertura 2026.
 * Uso: npx tsx scripts/seed-ligamx-teams.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Equipos Liga MX Apertura 2026 (18 equipos)
// flag: emoji representativo del equipo
const TEAMS: { code: string; name: string; flag: string }[] = [
  { code: "AME", name: "Club América",         flag: "🦅" },
  { code: "ATL", name: "Atlante FC",            flag: "⚓" },
  { code: "ATZ", name: "Atlas FC",              flag: "🌐" },
  { code: "ASL", name: "Atlético San Luis",     flag: "🦁" },
  { code: "CAZ", name: "Cruz Azul",             flag: "⛏️" },
  { code: "GDL", name: "Guadalajara (Chivas)",  flag: "🐐" },
  { code: "JUA", name: "FC Juárez",             flag: "🐂" },
  { code: "LEO", name: "Club León",             flag: "🦁" },
  { code: "MTY", name: "CF Monterrey",          flag: "💙" },
  { code: "NEX", name: "Club Necaxa",           flag: "⚡" },
  { code: "PAC", name: "CF Pachuca",            flag: "🔷" },
  { code: "PUE", name: "Club Puebla",           flag: "🔴" },
  { code: "UNM", name: "Pumas UNAM",            flag: "🐆" },
  { code: "QRO", name: "Querétaro FC",          flag: "🦅" },
  { code: "SAN", name: "Santos Laguna",         flag: "🌵" },
  { code: "TIG", name: "Tigres UANL",           flag: "🐯" },
  { code: "TIJ", name: "Club Tijuana (Xolos)",  flag: "🐕" },
  { code: "TOL", name: "Toluca FC",             flag: "⛔" },
];

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const team of TEAMS) {
    const result = await prisma.team.upsert({
      where: { code: team.code },
      create: { name: team.name, code: team.code, flag: team.flag },
      update: { name: team.name, flag: team.flag },
    });

    const isNew = result.name === team.name && !result.group;
    console.log(`${inserted + updated === 0 ? "" : ""}✅ ${team.code}: ${team.name} ${team.flag}`);
    inserted++;
  }

  console.log(`\n${inserted} equipos de Liga MX procesados (upsert).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
