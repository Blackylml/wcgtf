import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWorldCupFixtures } from "@/lib/football-api";

export const dynamic = "force-dynamic";

/** YYYYMMDD en UTC. */
function ymd(d: Date) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Marcador semi-vivo de un partido. Consulta ESPN para el día del partido y
 * orienta los goles por CÓDIGO de equipo (abreviatura ESPN = Team.code), nunca
 * por la posición local/visitante (ESPN a veces los invierte).
 */
export async function GET(req: Request) {
  const matchId = new URL(req.url).searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ available: false }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      externalId: true, scheduledAt: true,
      homeTeam: { select: { code: true } },
      awayTeam: { select: { code: true } },
    },
  });
  if (!match) return NextResponse.json({ available: false }, { status: 404 });

  const ourHome = match.homeTeam?.code ?? null;
  const ourAway = match.awayTeam?.code ?? null;

  try {
    // Ventana de ±1 día para cubrir desfases de huso horario.
    const day = match.scheduledAt;
    const prev = new Date(day.getTime() - 24 * 3600 * 1000);
    const next = new Date(day.getTime() + 24 * 3600 * 1000);
    const fixtures = await fetchWorldCupFixtures(`${ymd(prev)}-${ymd(next)}`);

    let f = match.externalId ? fixtures.find((x) => x.id === match.externalId) : undefined;
    if (!f && ourHome && ourAway) {
      f = fixtures.find(
        (x) =>
          (x.homeAbbr === ourHome && x.awayAbbr === ourAway) ||
          (x.homeAbbr === ourAway && x.awayAbbr === ourHome),
      );
    }
    if (!f) return NextResponse.json({ available: false });

    const reversed = !!ourHome && !!ourAway && f.homeAbbr === ourAway && f.awayAbbr === ourHome;
    const homeGoals = reversed ? f.awayGoals : f.homeGoals;
    const awayGoals = reversed ? f.homeGoals : f.awayGoals;

    return NextResponse.json({
      available: true,
      state: f.state, // pre | in | post
      detail: f.detail, // "45'", "HT", "FT", ...
      statusShort: f.statusShort,
      homeGoals,
      awayGoals,
    });
  } catch {
    return NextResponse.json({ available: false });
  }
}
