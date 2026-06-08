import { PrismaClient, Stage } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseStage(fase: string): Stage {
  if (fase.startsWith("Grupo")) return Stage.GROUP;
  if (fase === "Ronda de 32") return Stage.R32;
  if (fase === "Ronda de 16") return Stage.R16;
  if (fase === "Cuartos de Final") return Stage.QF;
  if (fase === "Semifinal") return Stage.SF;
  if (fase === "Tercer lugar") return Stage.THIRD;
  if (fase === "Final") return Stage.FINAL;
  return Stage.GROUP;
}

function parseDate(fecha: string, hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  const d = new Date(`${fecha}T00:00:00-06:00`); // Monterrey = UTC-6
  d.setHours(h, m, 0, 0);
  return d;
}

const partidos = [
  { partido: 1, fase: "Grupo A", local: "MEX", visitante: "RSA", fecha: "2026-06-11", hora_mty: "14:00", sede: "Estadio Azteca, Ciudad de México" },
  { partido: 2, fase: "Grupo A", local: "KOR", visitante: "CZE", fecha: "2026-06-11", hora_mty: "21:00", sede: "Estadio Akron, Zapopan (Guadalajara)" },
  { partido: 3, fase: "Grupo B", local: "CAN", visitante: "BIH", fecha: "2026-06-12", hora_mty: "14:00", sede: "BMO Field, Toronto" },
  { partido: 4, fase: "Grupo D", local: "USA", visitante: "PAR", fecha: "2026-06-12", hora_mty: "20:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 5, fase: "Grupo B", local: "QAT", visitante: "SUI", fecha: "2026-06-13", hora_mty: "14:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 6, fase: "Grupo C", local: "BRA", visitante: "MAR", fecha: "2026-06-13", hora_mty: "17:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 7, fase: "Grupo C", local: "HAI", visitante: "SCO", fecha: "2026-06-13", hora_mty: "20:00", sede: "Gillette Stadium, Boston" },
  { partido: 8, fase: "Grupo D", local: "AUS", visitante: "TUR", fecha: "2026-06-13", hora_mty: "23:00", sede: "BC Place, Vancouver" },
  { partido: 9, fase: "Grupo E", local: "GER", visitante: "CUW", fecha: "2026-06-14", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 10, fase: "Grupo F", local: "NED", visitante: "JPN", fecha: "2026-06-14", hora_mty: "15:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 11, fase: "Grupo E", local: "CIV", visitante: "ECU", fecha: "2026-06-14", hora_mty: "18:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 12, fase: "Grupo F", local: "TUN", visitante: "SWE", fecha: "2026-06-14", hora_mty: "21:00", sede: "Estadio BBVA, Guadalupe (Monterrey)" },
  { partido: 13, fase: "Grupo H", local: "ESP", visitante: "CPV", fecha: "2026-06-15", hora_mty: "11:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 14, fase: "Grupo G", local: "BEL", visitante: "EGY", fecha: "2026-06-15", hora_mty: "14:00", sede: "Lumen Field, Seattle" },
  { partido: 15, fase: "Grupo H", local: "KSA", visitante: "URU", fecha: "2026-06-15", hora_mty: "17:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 16, fase: "Grupo G", local: "IRN", visitante: "NZL", fecha: "2026-06-15", hora_mty: "20:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 17, fase: "Grupo I", local: "FRA", visitante: "SEN", fecha: "2026-06-16", hora_mty: "14:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 18, fase: "Grupo I", local: "NOR", visitante: "IRQ", fecha: "2026-06-16", hora_mty: "17:00", sede: "Gillette Stadium, Boston" },
  { partido: 19, fase: "Grupo J", local: "ARG", visitante: "ALG", fecha: "2026-06-16", hora_mty: "20:00", sede: "Arrowhead Stadium, Kansas City" },
  { partido: 20, fase: "Grupo J", local: "AUT", visitante: "JOR", fecha: "2026-06-16", hora_mty: "23:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 21, fase: "Grupo K", local: "POR", visitante: "COD", fecha: "2026-06-17", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 22, fase: "Grupo L", local: "ENG", visitante: "CRO", fecha: "2026-06-17", hora_mty: "15:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 23, fase: "Grupo L", local: "GHA", visitante: "PAN", fecha: "2026-06-17", hora_mty: "18:00", sede: "BMO Field, Toronto" },
  { partido: 24, fase: "Grupo K", local: "UZB", visitante: "COL", fecha: "2026-06-17", hora_mty: "21:00", sede: "Estadio Azteca, Ciudad de México" },
  { partido: 25, fase: "Grupo A", local: "RSA", visitante: "CZE", fecha: "2026-06-18", hora_mty: "11:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 26, fase: "Grupo B", local: "SUI", visitante: "BIH", fecha: "2026-06-18", hora_mty: "14:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 27, fase: "Grupo B", local: "CAN", visitante: "QAT", fecha: "2026-06-18", hora_mty: "17:00", sede: "BC Place, Vancouver" },
  { partido: 28, fase: "Grupo A", local: "MEX", visitante: "KOR", fecha: "2026-06-18", hora_mty: "20:00", sede: "Estadio Akron, Zapopan (Guadalajara)" },
  { partido: 29, fase: "Grupo D", local: "USA", visitante: "AUS", fecha: "2026-06-19", hora_mty: "14:00", sede: "Lumen Field, Seattle" },
  { partido: 30, fase: "Grupo C", local: "SCO", visitante: "MAR", fecha: "2026-06-19", hora_mty: "14:00", sede: "Gillette Stadium, Boston" },
  { partido: 31, fase: "Grupo C", local: "BRA", visitante: "HAI", fecha: "2026-06-19", hora_mty: "20:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 32, fase: "Grupo D", local: "PAR", visitante: "TUR", fecha: "2026-06-19", hora_mty: "23:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 33, fase: "Grupo F", local: "NED", visitante: "SWE", fecha: "2026-06-20", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 34, fase: "Grupo E", local: "GER", visitante: "CIV", fecha: "2026-06-20", hora_mty: "15:00", sede: "BMO Field, Toronto" },
  { partido: 35, fase: "Grupo E", local: "ECU", visitante: "CUW", fecha: "2026-06-20", hora_mty: "19:00", sede: "Arrowhead Stadium, Kansas City" },
  { partido: 36, fase: "Grupo F", local: "TUN", visitante: "JPN", fecha: "2026-06-20", hora_mty: "23:00", sede: "Estadio BBVA, Guadalupe (Monterrey)" },
  { partido: 37, fase: "Grupo H", local: "ESP", visitante: "KSA", fecha: "2026-06-21", hora_mty: "11:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 38, fase: "Grupo G", local: "BEL", visitante: "IRN", fecha: "2026-06-21", hora_mty: "14:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 39, fase: "Grupo H", local: "URU", visitante: "CPV", fecha: "2026-06-21", hora_mty: "17:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 40, fase: "Grupo G", local: "NZL", visitante: "EGY", fecha: "2026-06-21", hora_mty: "20:00", sede: "BC Place, Vancouver" },
  { partido: 41, fase: "Grupo J", local: "ARG", visitante: "AUT", fecha: "2026-06-22", hora_mty: "12:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 42, fase: "Grupo I", local: "FRA", visitante: "IRQ", fecha: "2026-06-22", hora_mty: "16:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 43, fase: "Grupo I", local: "NOR", visitante: "SEN", fecha: "2026-06-22", hora_mty: "19:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 44, fase: "Grupo J", local: "JOR", visitante: "ALG", fecha: "2026-06-22", hora_mty: "22:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 45, fase: "Grupo K", local: "POR", visitante: "UZB", fecha: "2026-06-23", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 46, fase: "Grupo L", local: "ENG", visitante: "GHA", fecha: "2026-06-23", hora_mty: "15:00", sede: "Gillette Stadium, Boston" },
  { partido: 47, fase: "Grupo L", local: "PAN", visitante: "CRO", fecha: "2026-06-23", hora_mty: "18:00", sede: "BMO Field, Toronto" },
  { partido: 48, fase: "Grupo K", local: "COL", visitante: "COD", fecha: "2026-06-23", hora_mty: "21:00", sede: "Estadio Akron, Zapopan (Guadalajara)" },
  { partido: 49, fase: "Grupo B", local: "CAN", visitante: "SUI", fecha: "2026-06-24", hora_mty: "14:00", sede: "BC Place, Vancouver" },
  { partido: 50, fase: "Grupo B", local: "QAT", visitante: "BIH", fecha: "2026-06-24", hora_mty: "14:00", sede: "Lumen Field, Seattle" },
  { partido: 51, fase: "Grupo C", local: "SCO", visitante: "BRA", fecha: "2026-06-24", hora_mty: "17:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 52, fase: "Grupo C", local: "MAR", visitante: "HAI", fecha: "2026-06-24", hora_mty: "17:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 53, fase: "Grupo A", local: "MEX", visitante: "CZE", fecha: "2026-06-24", hora_mty: "20:00", sede: "Estadio Azteca, Ciudad de México" },
  { partido: 54, fase: "Grupo A", local: "KOR", visitante: "RSA", fecha: "2026-06-24", hora_mty: "20:00", sede: "Estadio BBVA, Guadalupe (Monterrey)" },
  { partido: 55, fase: "Grupo E", local: "ECU", visitante: "GER", fecha: "2026-06-25", hora_mty: "15:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 56, fase: "Grupo E", local: "CUW", visitante: "CIV", fecha: "2026-06-25", hora_mty: "15:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 57, fase: "Grupo F", local: "TUN", visitante: "NED", fecha: "2026-06-25", hora_mty: "18:00", sede: "Arrowhead Stadium, Kansas City" },
  { partido: 58, fase: "Grupo F", local: "JPN", visitante: "SWE", fecha: "2026-06-25", hora_mty: "18:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 59, fase: "Grupo D", local: "USA", visitante: "TUR", fecha: "2026-06-25", hora_mty: "21:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 60, fase: "Grupo D", local: "PAR", visitante: "AUS", fecha: "2026-06-25", hora_mty: "21:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 61, fase: "Grupo I", local: "NOR", visitante: "FRA", fecha: "2026-06-26", hora_mty: "14:00", sede: "Gillette Stadium, Boston" },
  { partido: 62, fase: "Grupo I", local: "SEN", visitante: "IRQ", fecha: "2026-06-26", hora_mty: "14:00", sede: "BMO Field, Toronto" },
  { partido: 63, fase: "Grupo H", local: "URU", visitante: "ESP", fecha: "2026-06-26", hora_mty: "19:00", sede: "Estadio Akron, Zapopan (Guadalajara)" },
  { partido: 64, fase: "Grupo H", local: "CPV", visitante: "KSA", fecha: "2026-06-26", hora_mty: "19:00", sede: "NRG Stadium, Houston" },
  { partido: 65, fase: "Grupo G", local: "NZL", visitante: "BEL", fecha: "2026-06-26", hora_mty: "22:00", sede: "BC Place, Vancouver" },
  { partido: 66, fase: "Grupo G", local: "EGY", visitante: "IRN", fecha: "2026-06-26", hora_mty: "22:00", sede: "Lumen Field, Seattle" },
  { partido: 67, fase: "Grupo L", local: "PAN", visitante: "ENG", fecha: "2026-06-27", hora_mty: "16:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 68, fase: "Grupo L", local: "CRO", visitante: "GHA", fecha: "2026-06-27", hora_mty: "16:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 69, fase: "Grupo K", local: "COL", visitante: "POR", fecha: "2026-06-27", hora_mty: "18:30", sede: "Hard Rock Stadium, Miami" },
  { partido: 70, fase: "Grupo K", local: "UZB", visitante: "COD", fecha: "2026-06-27", hora_mty: "18:30", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 71, fase: "Grupo J", local: "JOR", visitante: "ARG", fecha: "2026-06-27", hora_mty: "21:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 72, fase: "Grupo J", local: "ALG", visitante: "AUT", fecha: "2026-06-27", hora_mty: "21:00", sede: "Arrowhead Stadium, Kansas City" },
  // Eliminatorias
  { partido: 73, fase: "Ronda de 32", local: "2o Grupo A", visitante: "2o Grupo B", fecha: "2026-06-28", hora_mty: "14:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 74, fase: "Ronda de 32", local: "1o Grupo E", visitante: "3o Grupo A/B/C/D/F", fecha: "2026-06-29", hora_mty: "15:30", sede: "Gillette Stadium, Boston" },
  { partido: 75, fase: "Ronda de 32", local: "1o Grupo F", visitante: "2o Grupo C", fecha: "2026-06-29", hora_mty: "20:00", sede: "Estadio BBVA, Guadalupe (Monterrey)" },
  { partido: 76, fase: "Ronda de 32", local: "1o Grupo C", visitante: "2o Grupo F", fecha: "2026-06-29", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 77, fase: "Ronda de 32", local: "1o Grupo I", visitante: "3o Grupo C/D/F/G/H", fecha: "2026-06-30", hora_mty: "16:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 78, fase: "Ronda de 32", local: "2o Grupo E", visitante: "2o Grupo I", fecha: "2026-06-30", hora_mty: "12:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 79, fase: "Ronda de 32", local: "1o Grupo A", visitante: "3o Grupo C/E/F/H/I", fecha: "2026-06-30", hora_mty: "20:00", sede: "Estadio Azteca, Ciudad de México" },
  { partido: 80, fase: "Ronda de 32", local: "1o Grupo L", visitante: "3o Grupo E/H/I/J/K", fecha: "2026-07-01", hora_mty: "11:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 81, fase: "Ronda de 32", local: "1o Grupo D", visitante: "3o Grupo B/E/F/I/J", fecha: "2026-07-01", hora_mty: "19:00", sede: "Levi's Stadium, Santa Clara" },
  { partido: 82, fase: "Ronda de 32", local: "1o Grupo G", visitante: "3o Grupo A/E/H/I/J", fecha: "2026-07-01", hora_mty: "15:00", sede: "Lumen Field, Seattle" },
  { partido: 83, fase: "Ronda de 32", local: "2o Grupo K", visitante: "2o Grupo L", fecha: "2026-07-02", hora_mty: "18:00", sede: "BMO Field, Toronto" },
  { partido: 84, fase: "Ronda de 32", local: "1o Grupo H", visitante: "2o Grupo J", fecha: "2026-07-02", hora_mty: "14:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 85, fase: "Ronda de 32", local: "1o Grupo B", visitante: "3o Grupo E/F/G/I/J", fecha: "2026-07-02", hora_mty: "22:00", sede: "BC Place, Vancouver" },
  { partido: 86, fase: "Ronda de 32", local: "1o Grupo J", visitante: "2o Grupo H", fecha: "2026-07-03", hora_mty: "17:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 87, fase: "Ronda de 32", local: "1o Grupo K", visitante: "3o Grupo D/E/I/J/L", fecha: "2026-07-03", hora_mty: "20:30", sede: "Arrowhead Stadium, Kansas City" },
  { partido: 88, fase: "Ronda de 32", local: "2o Grupo D", visitante: "2o Grupo G", fecha: "2026-07-03", hora_mty: "13:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 89, fase: "Ronda de 16", local: "Ganador M74", visitante: "Ganador M77", fecha: "2026-07-04", hora_mty: "16:00", sede: "Lincoln Financial Field, Filadelfia" },
  { partido: 90, fase: "Ronda de 16", local: "Ganador M73", visitante: "Ganador M75", fecha: "2026-07-04", hora_mty: "12:00", sede: "NRG Stadium, Houston" },
  { partido: 91, fase: "Ronda de 16", local: "Ganador M76", visitante: "Ganador M78", fecha: "2026-07-05", hora_mty: "15:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
  { partido: 92, fase: "Ronda de 16", local: "Ganador M79", visitante: "Ganador M80", fecha: "2026-07-05", hora_mty: "19:00", sede: "Estadio Azteca, Ciudad de México" },
  { partido: 93, fase: "Ronda de 16", local: "Ganador M83", visitante: "Ganador M84", fecha: "2026-07-06", hora_mty: "14:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 94, fase: "Ronda de 16", local: "Ganador M81", visitante: "Ganador M82", fecha: "2026-07-06", hora_mty: "19:00", sede: "Lumen Field, Seattle" },
  { partido: 95, fase: "Ronda de 16", local: "Ganador M86", visitante: "Ganador M88", fecha: "2026-07-07", hora_mty: "11:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 96, fase: "Ronda de 16", local: "Ganador M85", visitante: "Ganador M87", fecha: "2026-07-07", hora_mty: "15:00", sede: "BC Place, Vancouver" },
  { partido: 97, fase: "Cuartos de Final", local: "Ganador M89", visitante: "Ganador M90", fecha: "2026-07-09", hora_mty: "15:00", sede: "Gillette Stadium, Boston" },
  { partido: 98, fase: "Cuartos de Final", local: "Ganador M93", visitante: "Ganador M94", fecha: "2026-07-10", hora_mty: "14:00", sede: "SoFi Stadium, Los Ángeles" },
  { partido: 99, fase: "Cuartos de Final", local: "Ganador M91", visitante: "Ganador M92", fecha: "2026-07-11", hora_mty: "16:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 100, fase: "Cuartos de Final", local: "Ganador M95", visitante: "Ganador M96", fecha: "2026-07-11", hora_mty: "20:00", sede: "Arrowhead Stadium, Kansas City" },
  { partido: 101, fase: "Semifinal", local: "Ganador M97", visitante: "Ganador M98", fecha: "2026-07-14", hora_mty: "14:00", sede: "AT&T Stadium, Arlington (Dallas)" },
  { partido: 102, fase: "Semifinal", local: "Ganador M99", visitante: "Ganador M100", fecha: "2026-07-15", hora_mty: "14:00", sede: "Mercedes-Benz Stadium, Atlanta" },
  { partido: 103, fase: "Tercer lugar", local: "Perdedor M101", visitante: "Perdedor M102", fecha: "2026-07-18", hora_mty: "16:00", sede: "Hard Rock Stadium, Miami" },
  { partido: 104, fase: "Final", local: "Ganador M101", visitante: "Ganador M102", fecha: "2026-07-19", hora_mty: "14:00", sede: "MetLife Stadium, Nueva York/Nueva Jersey" },
];

async function main() {
  // Cargar todos los equipos en un mapa código → id
  const teams = await prisma.team.findMany({ select: { id: true, code: true } });
  const teamMap = new Map(teams.map((t) => [t.code, t.id]));

  console.log(`Insertando ${partidos.length} partidos...`);

  for (const p of partidos) {
    const stage = parseStage(p.fase);
    const scheduledAt = parseDate(p.fecha, p.hora_mty);
    const isGroupStage = stage === Stage.GROUP;

    const homeTeamId = isGroupStage ? (teamMap.get(p.local) ?? null) : null;
    const awayTeamId = isGroupStage ? (teamMap.get(p.visitante) ?? null) : null;

    if (isGroupStage && (!homeTeamId || !awayTeamId)) {
      console.warn(`⚠ Equipo no encontrado en partido ${p.partido}: ${p.local} vs ${p.visitante}`);
    }

    await prisma.match.upsert({
      where: { matchNumber: p.partido },
      update: {
        homeTeamId,
        awayTeamId,
        homeLabel: p.local,
        awayLabel: p.visitante,
        stage,
        scheduledAt,
        venue: p.sede,
      },
      create: {
        matchNumber: p.partido,
        homeTeamId,
        awayTeamId,
        homeLabel: p.local,
        awayLabel: p.visitante,
        stage,
        scheduledAt,
        venue: p.sede,
      },
    });
  }

  console.log("✅ Partidos insertados");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
