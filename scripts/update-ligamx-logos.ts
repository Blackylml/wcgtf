/**
 * Actualiza el campo `flag` de los 18 equipos Liga MX con logos del CDN de ESPN.
 * Uso: npx tsx scripts/update-ligamx-logos.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const espn = (id: number) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const LOGOS: { code: string; name: string; url: string }[] = [
  { code: "AME", name: "Club América",         url: espn(227)   },
  { code: "ATL", name: "Atlante FC",            url: espn(226)   },
  { code: "ATZ", name: "Atlas FC",              url: espn(216)   },
  { code: "ASL", name: "Atlético San Luis",     url: espn(15720) },
  { code: "CAZ", name: "Cruz Azul",             url: espn(218)   },
  { code: "GDL", name: "Guadalajara (Chivas)",  url: espn(219)   },
  { code: "JUA", name: "FC Juárez",             url: espn(17851) },
  { code: "LEO", name: "Club León",             url: espn(228)   },
  { code: "MTY", name: "CF Monterrey",          url: espn(220)   },
  { code: "NEX", name: "Club Necaxa",           url: espn(229)   },
  { code: "PAC", name: "CF Pachuca",            url: espn(234)   },
  { code: "PUE", name: "Club Puebla",           url: espn(231)   },
  { code: "UNM", name: "Pumas UNAM",            url: espn(233)   },
  { code: "QRO", name: "Querétaro FC",          url: espn(222)   },
  { code: "SAN", name: "Santos Laguna",         url: espn(225)   },
  { code: "TIG", name: "Tigres UANL",           url: espn(232)   },
  { code: "TIJ", name: "Club Tijuana (Xolos)",  url: espn(10125) },
  { code: "TOL", name: "Toluca FC",             url: espn(223)   },
];

async function main() {
  let ok = 0;
  let miss = 0;

  for (const { code, name, url } of LOGOS) {
    const result = await prisma.team.updateMany({
      where: { code },
      data: { flag: url },
    });

    if (result.count > 0) {
      console.log(`✅ ${code} — ${name}`);
      ok++;
    } else {
      console.warn(`⚠  ${code} no encontrado en DB`);
      miss++;
    }
  }

  console.log(`\n${ok} logos actualizados, ${miss} no encontrados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
