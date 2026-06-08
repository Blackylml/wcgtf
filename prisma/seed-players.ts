import { PrismaClient, SpecialCategory } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type RawPlayer = { pos: string; nombre: string; club: string; edad?: number; caps?: number; capitan?: boolean };
type RawTeam = { codigo: string; nombre: string; bandera: string; grupo: string; entrenador: string; jugadores: RawPlayer[] };

async function main() {
  const jsonPath = path.resolve("C:/xampp/htdocs/web/WCGTF/squads_mundial_2026.json");
  const raw: RawTeam[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Cargar mapa de equipos por código
  const teams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamMap = new Map(teams.map((t) => [t.code, t.id]));

  let inserted = 0;
  let skipped = 0;

  console.log(`Procesando ${raw.length} equipos...`);

  for (const squad of raw) {
    const teamId = teamMap.get(squad.codigo);
    if (!teamId) {
      console.warn(`⚠ Equipo no encontrado en DB: ${squad.codigo}`);
      skipped++;
      continue;
    }

    for (const p of squad.jugadores) {
      await prisma.player.upsert({
        where: {
          // upsert por nombre + teamId para evitar duplicados
          name_teamId: { name: p.nombre, teamId },
        },
        update: {},
        create: { name: p.nombre, teamId },
      });
      inserted++;
    }
  }

  console.log(`✓ ${inserted} jugadores insertados (${skipped} equipos sin match)`);

  // Crear los 4 SpecialPools si no existen
  console.log("Inicializando Special Pools...");
  const categories: SpecialCategory[] = [
    SpecialCategory.TOP_SCORER,
    SpecialCategory.BEST_PLAYER,
    SpecialCategory.BEST_GOALKEEPER,
    SpecialCategory.BEST_YOUNG_PLAYER,
  ];

  for (const category of categories) {
    await prisma.specialPool.upsert({
      where: { category },
      update: {},
      create: { category, isOpen: false, price: 0 },
    });
  }
  console.log("✓ Special Pools inicializados");
  console.log("✅ Seed de jugadores completo");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
