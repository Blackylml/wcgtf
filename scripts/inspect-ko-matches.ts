import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Todos los partidos KO (R16 en adelante) con sus equipos actuales y resultado
  const matches = await prisma.match.findMany({
    where: { stage: { in: ["R32", "R16", "QF", "SF", "FINAL", "THIRD"] } },
    orderBy: { matchNumber: "asc" },
    select: {
      id: true,
      matchNumber: true,
      stage: true,
      externalId: true,
      homeScore: true,
      awayScore: true,
      penaltiesWinner: true,
      scheduledAt: true,
      homeTeam: { select: { code: true, name: true } },
      awayTeam: { select: { code: true, name: true } },
      homeLabel: true,
      awayLabel: true,
    },
  });

  for (const m of matches) {
    const home = m.homeTeam?.code ?? m.homeLabel ?? "TBD";
    const away = m.awayTeam?.code ?? m.awayLabel ?? "TBD";
    const score = m.homeScore !== null ? `${m.homeScore}-${m.awayScore}` : "—";
    const pen = m.penaltiesWinner ? ` (pen:${m.penaltiesWinner})` : "";
    const ext = m.externalId ?? "NO_MAP";
    const date = m.scheduledAt.toISOString().slice(0, 10);
    console.log(`M${m.matchNumber} [${m.stage}] ${date} | ${home} vs ${away} | ${score}${pen} | ext:${ext}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
