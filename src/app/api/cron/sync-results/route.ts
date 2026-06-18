import { NextRequest, NextResponse } from "next/server";
import { syncResults, syncKickoffs } from "@/lib/result-sync";

/**
 * Sincroniza resultados desde la API de fútbol.
 * Lo llama el Vercel Cron (con Authorization: Bearer CRON_SECRET) o un cron externo.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    const qs = req.nextUrl.searchParams.get("secret");
    if (header !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // Corrige horarios desviados (seed con TZ incorrecta) y luego sincroniza resultados.
    const kickoffs = await syncKickoffs();
    const result = await syncResults();
    return NextResponse.json({ ok: true, kickoffs, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-results error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
