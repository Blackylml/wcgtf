import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createDuelSession, toggleDuelSession, pairDuelEntries, settleDuelPrizes, configureTiebreaker, setTiebreakerResults } from "./actions";

// Sólo los módulos Liga MX disponibles para duelos
const LMX_MODULES = [
  "LMX_J1","LMX_J2","LMX_J3","LMX_J4","LMX_J5","LMX_J6","LMX_J7","LMX_J8","LMX_J9",
  "LMX_J10","LMX_J11","LMX_J12","LMX_J13","LMX_J14","LMX_J15","LMX_J16","LMX_J17",
  "LMX_QF","LMX_SF","LMX_FINAL",
] as const;

export default async function DuelosAdminPage() {
  const sessions = await prisma.duelSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      entries: { include: { user: { select: { name: true, email: true } } } },
      pairs: {
        include: {
          user1: { select: { name: true, email: true } },
          user2: { select: { name: true, email: true } },
          winner: { select: { name: true, email: true } },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Duelos 1v1</h1>

      {/* Crear sesión */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nueva sesión de duelos</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              "use server";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const module = fd.get("module") as any;
              const label = fd.get("label") as string;
              const entryFee = Number(fd.get("entryFee"));
              const houseCutPct = Number(fd.get("houseCutPct"));
              await createDuelSession(module, label, entryFee, houseCutPct);
            }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="space-y-1">
              <Label className="text-xs">Módulo</Label>
              <select name="module" className="w-full border rounded px-2 py-1.5 text-xs">
                {LMX_MODULES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Input name="label" placeholder="Jornada 1 — 1v1" className="text-xs h-8" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entrada (MXN / créditos)</Label>
              <Input name="entryFee" type="number" min="1" step="0.01" placeholder="100" className="text-xs h-8" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Corte casa (%)</Label>
              <Input name="houseCutPct" type="number" min="0" max="50" defaultValue="10" className="text-xs h-8" required />
            </div>
            <div className="col-span-2">
              <Button type="submit" className="bg-blue-700 hover:bg-blue-800 text-xs">
                Crear sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sesiones existentes */}
      <div className="space-y-4">
        {sessions.map((s) => {
          const paired = s.entries.filter((e) => e.paired).length;
          const unpaired = s.entries.filter((e) => !e.paired && !e.refunded).length;
          const refunded = s.entries.filter((e) => e.refunded).length;

          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{s.label}</CardTitle>
                    <p className="text-xs text-gray-400">
                      {s.module} · Entrada ${Number(s.entryFee).toFixed(2)} · Casa {s.houseCutPct}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={s.isOpen ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
                      {s.isOpen ? "Abierto" : "Cerrado"}
                    </Badge>
                    {s.pairingDone && <Badge className="bg-blue-100 text-blue-800 text-xs">Emparejado</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 text-xs text-gray-500 mb-3">
                  <span>{s.entries.length} inscritos</span>
                  <span>· {paired} emparejados</span>
                  {unpaired > 0 && <span>· {unpaired} en espera</span>}
                  {refunded > 0 && <span>· {refunded} reembolsados</span>}
                  <span>· {s.pairs.length} pares</span>
                </div>

                <div className="flex gap-2 mb-4">
                  <form action={toggleDuelSession.bind(null, s.id, s.isOpen)}>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      {s.isOpen ? "Cerrar inscripción" : "Abrir inscripción"}
                    </Button>
                  </form>
                  {!s.pairingDone && s.entries.length >= 2 && (
                    <form action={pairDuelEntries.bind(null, s.id)}>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-blue-600 border-blue-300">
                        ⚡ Emparejar aleatoriamente
                      </Button>
                    </form>
                  )}
                  {s.pairingDone && (
                    <form action={settleDuelPrizes.bind(null, s.id)}>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-300">
                        🏆 Liquidar premios
                      </Button>
                    </form>
                  )}
                </div>

                {/* Desempate */}
                <details className="mb-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    {s.hasTiebreaker ? "🏆 Desempate configurado" : "⚙ Configurar desempate"}
                  </summary>
                  <div className="mt-2 space-y-2 border rounded p-3 bg-amber-50/30">
                    <form
                      action={async (fd) => {
                        "use server";
                        await configureTiebreaker(
                          s.id,
                          fd.get("hasTiebreaker") === "on",
                          fd.get("homeLabel") as string,
                          fd.get("awayLabel") as string,
                          fd.get("dateLabel") as string,
                          fd.get("home2Label") as string,
                          fd.get("away2Label") as string,
                          fd.get("date2Label") as string,
                        );
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input name="hasTiebreaker" type="checkbox" defaultChecked={s.hasTiebreaker} className="w-4 h-4" />
                        <Label className="text-xs">Activar desempate</Label>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold">Partido 1</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Local</Label>
                          <Input name="homeLabel" defaultValue={s.tbHomeLabel ?? ""} placeholder="España" className="text-xs h-7" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Visitante</Label>
                          <Input name="awayLabel" defaultValue={s.tbAwayLabel ?? ""} placeholder="Argentina" className="text-xs h-7" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Fecha</Label>
                          <Input name="dateLabel" defaultValue={s.tbDateLabel ?? ""} placeholder="Final · 19 jul" className="text-xs h-7" />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold">Partido 2</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Local</Label>
                          <Input name="home2Label" defaultValue={s.tb2HomeLabel ?? ""} placeholder="Chivas" className="text-xs h-7" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Visitante</Label>
                          <Input name="away2Label" defaultValue={s.tb2AwayLabel ?? ""} placeholder="Toluca" className="text-xs h-7" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] text-gray-500">Fecha</Label>
                          <Input name="date2Label" defaultValue={s.tb2DateLabel ?? ""} placeholder="J1 · xx jul" className="text-xs h-7" />
                        </div>
                      </div>
                      <Button type="submit" size="sm" variant="outline" className="text-xs h-7">
                        Guardar config
                      </Button>
                    </form>

                    {[
                      { idx: 0, label: "Partido 1", ht: s.tbHtResult, ft: s.tbFtResult },
                      { idx: 1, label: "Partido 2", ht: s.tb2HtResult, ft: s.tb2FtResult },
                    ].map(({ idx, label, ht, ft }) => (
                      <form
                        key={idx}
                        action={async (fd) => {
                          "use server";
                          await setTiebreakerResults(s.id, idx, fd.get("htResult") as string, fd.get("ftResult") as string);
                        }}
                        className="space-y-2 border-t pt-2"
                      >
                        <p className="text-[10px] font-semibold text-gray-500">Resultados {label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-500">Medio tiempo</Label>
                            <select name="htResult" defaultValue={ht ?? ""} className="w-full border rounded px-2 py-1 text-xs">
                              <option value="">— sin resultado —</option>
                              <option value="HOME">Local</option>
                              <option value="DRAW">Empate</option>
                              <option value="AWAY">Visitante</option>
                            </select>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-gray-500">Tiempo completo</Label>
                            <select name="ftResult" defaultValue={ft ?? ""} className="w-full border rounded px-2 py-1 text-xs">
                              <option value="">— sin resultado —</option>
                              <option value="HOME">Local</option>
                              <option value="DRAW">Empate</option>
                              <option value="AWAY">Visitante</option>
                            </select>
                          </div>
                        </div>
                        <Button type="submit" size="sm" variant="outline" className="text-xs h-7 text-amber-700 border-amber-300">
                          Registrar resultados {label}
                        </Button>
                      </form>
                    ))}
                  </div>
                </details>

                {/* Pares */}
                {s.pairs.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Pares</p>
                    {s.pairs.map((pair) => (
                      <div key={pair.id} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
                        <span className="flex-1 truncate">{pair.user1.name ?? pair.user1.email}</span>
                        {pair.score1 != null ? (
                          <span className={`font-mono font-bold ${pair.winnerId === pair.user1Id ? "text-emerald-600" : "text-gray-400"}`}>
                            {pair.score1}
                          </span>
                        ) : null}
                        <span className="text-gray-300">vs</span>
                        {pair.score2 != null ? (
                          <span className={`font-mono font-bold ${pair.winnerId === pair.user2Id ? "text-emerald-600" : "text-gray-400"}`}>
                            {pair.score2}
                          </span>
                        ) : null}
                        <span className="flex-1 truncate text-right">{pair.user2.name ?? pair.user2.email}</span>
                        {pair.prizeGiven && <Badge className="bg-amber-100 text-amber-800 text-xs">+${Number(pair.prizePool).toFixed(0)}</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {sessions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No hay sesiones de duelos aún. Crea la primera arriba.
          </p>
        )}
      </div>
    </div>
  );
}
