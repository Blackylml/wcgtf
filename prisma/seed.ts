import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const teams = [
  { nombre: "México", codigo: "MEX", bandera: "🇲🇽", grupo: "A" },
  { nombre: "Sudáfrica", codigo: "RSA", bandera: "🇿🇦", grupo: "A" },
  { nombre: "Corea del Sur", codigo: "KOR", bandera: "🇰🇷", grupo: "A" },
  { nombre: "Chequia", codigo: "CZE", bandera: "🇨🇿", grupo: "A" },
  { nombre: "Canadá", codigo: "CAN", bandera: "🇨🇦", grupo: "B" },
  { nombre: "Suiza", codigo: "SUI", bandera: "🇨🇭", grupo: "B" },
  { nombre: "Catar", codigo: "QAT", bandera: "🇶🇦", grupo: "B" },
  { nombre: "Bosnia y Herzegovina", codigo: "BIH", bandera: "🇧🇦", grupo: "B" },
  { nombre: "Brasil", codigo: "BRA", bandera: "🇧🇷", grupo: "C" },
  { nombre: "Marruecos", codigo: "MAR", bandera: "🇲🇦", grupo: "C" },
  { nombre: "Escocia", codigo: "SCO", bandera: "🏴", grupo: "C" },
  { nombre: "Haití", codigo: "HAI", bandera: "🇭🇹", grupo: "C" },
  { nombre: "Estados Unidos", codigo: "USA", bandera: "🇺🇸", grupo: "D" },
  { nombre: "Paraguay", codigo: "PAR", bandera: "🇵🇾", grupo: "D" },
  { nombre: "Australia", codigo: "AUS", bandera: "🇦🇺", grupo: "D" },
  { nombre: "Turquía", codigo: "TUR", bandera: "🇹🇷", grupo: "D" },
  { nombre: "Alemania", codigo: "GER", bandera: "🇩🇪", grupo: "E" },
  { nombre: "Ecuador", codigo: "ECU", bandera: "🇪🇨", grupo: "E" },
  { nombre: "Costa de Marfil", codigo: "CIV", bandera: "🇨🇮", grupo: "E" },
  { nombre: "Curazao", codigo: "CUW", bandera: "🇨🇼", grupo: "E" },
  { nombre: "Países Bajos", codigo: "NED", bandera: "🇳🇱", grupo: "F" },
  { nombre: "Japón", codigo: "JPN", bandera: "🇯🇵", grupo: "F" },
  { nombre: "Túnez", codigo: "TUN", bandera: "🇹🇳", grupo: "F" },
  { nombre: "Suecia", codigo: "SWE", bandera: "🇸🇪", grupo: "F" },
  { nombre: "Bélgica", codigo: "BEL", bandera: "🇧🇪", grupo: "G" },
  { nombre: "Irán", codigo: "IRN", bandera: "🇮🇷", grupo: "G" },
  { nombre: "Egipto", codigo: "EGY", bandera: "🇪🇬", grupo: "G" },
  { nombre: "Nueva Zelanda", codigo: "NZL", bandera: "🇳🇿", grupo: "G" },
  { nombre: "España", codigo: "ESP", bandera: "🇪🇸", grupo: "H" },
  { nombre: "Uruguay", codigo: "URU", bandera: "🇺🇾", grupo: "H" },
  { nombre: "Arabia Saudita", codigo: "KSA", bandera: "🇸🇦", grupo: "H" },
  { nombre: "Cabo Verde", codigo: "CPV", bandera: "🇨🇻", grupo: "H" },
  { nombre: "Francia", codigo: "FRA", bandera: "🇫🇷", grupo: "I" },
  { nombre: "Senegal", codigo: "SEN", bandera: "🇸🇳", grupo: "I" },
  { nombre: "Noruega", codigo: "NOR", bandera: "🇳🇴", grupo: "I" },
  { nombre: "Irak", codigo: "IRQ", bandera: "🇮🇶", grupo: "I" },
  { nombre: "Argentina", codigo: "ARG", bandera: "🇦🇷", grupo: "J" },
  { nombre: "Austria", codigo: "AUT", bandera: "🇦🇹", grupo: "J" },
  { nombre: "Argelia", codigo: "ALG", bandera: "🇩🇿", grupo: "J" },
  { nombre: "Jordania", codigo: "JOR", bandera: "🇯🇴", grupo: "J" },
  { nombre: "Portugal", codigo: "POR", bandera: "🇵🇹", grupo: "K" },
  { nombre: "Colombia", codigo: "COL", bandera: "🇨🇴", grupo: "K" },
  { nombre: "Uzbekistán", codigo: "UZB", bandera: "🇺🇿", grupo: "K" },
  { nombre: "República Democrática del Congo", codigo: "COD", bandera: "🇨🇩", grupo: "K" },
  { nombre: "Inglaterra", codigo: "ENG", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", grupo: "L" },
  { nombre: "Croacia", codigo: "CRO", bandera: "🇭🇷", grupo: "L" },
  { nombre: "Ghana", codigo: "GHA", bandera: "🇬🇭", grupo: "L" },
  { nombre: "Panamá", codigo: "PAN", bandera: "🇵🇦", grupo: "L" },
];

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

async function main() {
  console.log("Insertando 48 equipos...");
  for (const t of teams) {
    await prisma.team.upsert({
      where: { code: t.codigo },
      update: { name: t.nombre, flag: t.bandera, group: t.grupo },
      create: { name: t.nombre, code: t.codigo, flag: t.bandera, group: t.grupo },
    });
  }
  console.log("✓ Equipos insertados");

  console.log("Inicializando 12 grupos...");
  for (const g of GROUPS) {
    await prisma.groupPool.upsert({
      where: { name: g },
      update: {},
      create: { name: g, isOpen: false, price: 0 },
    });
  }
  console.log("✓ Grupos inicializados");

  console.log("✅ Seed completo");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
