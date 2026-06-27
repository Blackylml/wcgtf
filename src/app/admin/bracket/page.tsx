import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initBracketSession, toggleBracket, saveBracketConfig, recalcBracketScores, syncBracketFromMatches } from "./actions";

export default async function BracketAdminPage() {
  const [session, moduleSettings] = await Promise.all([
    prisma.bracketSession.findFirst({
      include: { bets: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.moduleSettings.findUnique({ where: { module: "BRACKET" } }),
  ]);

  const teams = await prisma.team.findMany({
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: { code: true, name: true, flag: true, group: true },
  });

  const config = (session?.config ?? { R32: [] }) as { R32: [string, string][] };

  const entryPrice = Number(moduleSettings?.price ?? 0);
  const entryOpen = moduleSettings?.entryOpen ?? true;

  if (!session) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bracket Eliminatorias</h1>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No hay sesión de bracket creada.</p>
            <form action={initBracketSession}>
              <Button type="submit" className="bg-green-700 hover:bg-green-800">
                Crear sesión de bracket
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bracket Eliminatorias</h1>

      {/* Estado — dos conceptos separados */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* Entrada / pagos (ModuleSettings) */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500 mb-1">Entrada (pagos)</p>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={entryOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                {entryOpen ? "Abierta" : "Cerrada"}
              </Badge>
              {entryPrice > 0
                ? <span className="text-sm font-semibold">${entryPrice}</span>
                : <span className="text-xs text-gray-400">Gratis</span>}
            </div>
            <a href="/admin/precios" className="text-xs text-blue-600 hover:underline">
              Cambiar precio / estado →
            </a>
          </CardContent>
        </Card>

        {/* Formulario de picks (BracketSession) */}
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Formulario (picks)</p>
              <Badge className={session.isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                {session.isOpen ? "Abierto" : "Cerrado"}
              </Badge>
            </div>
            <form action={toggleBracket.bind(null, session.id, session.isOpen)}>
              <Button size="sm" variant="outline"
                className={session.isOpen ? "text-red-600 border-red-300 text-xs" : "text-green-600 border-green-300 text-xs"}>
                {session.isOpen ? "Cerrar" : "Abrir"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Participantes</p>
              <p className="text-2xl font-bold">{session.bets.length}</p>
            </div>
            <form action={recalcBracketScores.bind(null, session.id)}>
              <Button size="sm" variant="outline" className="text-xs">Recalcular pts</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Configurar llaves R32 */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Configurar Ronda de 32 (16 partidos)</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Define las 16 llaves del bracket. Los jugadores verán estos enfrentamientos al hacer sus picks.
              </p>
            </div>
            <form action={syncBracketFromMatches.bind(null, session.id)}>
              <Button type="submit" size="sm" variant="outline" className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50 shrink-0">
                ⚡ Sincronizar desde partidos
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <form action={async (fd) => {
            "use server";
            const pairs: [string, string][] = [];
            for (let i = 0; i < 16; i++) {
              const t1 = fd.get(`r32_${i}_t1`) as string;
              const t2 = fd.get(`r32_${i}_t2`) as string;
              pairs.push([t1 || "", t2 || ""]);
            }
            await saveBracketConfig(session.id, JSON.stringify({ R32: pairs }));
          }}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Array.from({ length: 16 }, (_, i) => {
                const pair = config.R32[i] ?? ["", ""];
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-gray-400 text-xs">R{i + 1}</span>
                    <select name={`r32_${i}_t1`} defaultValue={pair[0]}
                      className="flex-1 border rounded px-1 py-1 text-xs">
                      <option value="">— Local —</option>
                      {teams.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.flag} {t.code} ({t.name})
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400 text-xs">vs</span>
                    <select name={`r32_${i}_t2`} defaultValue={pair[1]}
                      className="flex-1 border rounded px-1 py-1 text-xs">
                      <option value="">— Visitante —</option>
                      {teams.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.flag} {t.code} ({t.name})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
            <Button type="submit" size="sm" className="bg-blue-700 hover:bg-blue-800 text-xs">
              Guardar configuración
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de participantes */}
      {session.bets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Participantes ({session.bets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {session.bets
                .sort((a, b) => b.score - a.score)
                .map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between text-sm py-1 border-b">
                    <span>{bet.user.name ?? bet.user.email}</span>
                    <span className="font-mono font-medium">{bet.score} pts</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
