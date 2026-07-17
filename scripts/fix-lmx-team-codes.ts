/**
 * Actualiza los 4 códigos de equipo de Liga MX que no coinciden con ESPN.
 * Antes de correr: asegúrate de que no haya otras referencias a los códigos viejos.
 *
 * Mapeo:
 *   NEX  → NCX   (Necaxa)
 *   TIG  → UANL  (Tigres)
 *   ATZ  → ATS   (Atlas)
 *   UNM  → UNAM  (Pumas)
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const REMAP: { old: string; new: string }[] = [
  { old: "NEX", new: "NCX" },
  { old: "TIG", new: "UANL" },
  { old: "ATZ", new: "ATS" },
  { old: "UNM", new: "UNAM" },
];

async function main() {
  for (const { old: oldCode, new: newCode } of REMAP) {
    const team = await prisma.team.findUnique({ where: { code: oldCode }, select: { id: true, name: true } });
    if (!team) { console.log(`[SKIP] ${oldCode} — no encontrado`); continue; }
    await prisma.team.update({ where: { code: oldCode }, data: { code: newCode } });
    console.log(`[OK]   ${oldCode} → ${newCode}  (${team.name})`);
  }
  console.log("\n✓ Códigos actualizados. Los matches existentes no se afectan (usan teamId).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
