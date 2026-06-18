import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "./UserActions";
import { getLastJornadaWinners } from "@/lib/module-access";
import { WinnerStar } from "@/components/WinnerStar";

export default async function UsuariosAdminPage() {
  const session = await auth();
  const myId = session?.user?.id;

  const [users, moduleSettings] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        groupBets: { select: { isCorrect: true, groupPoolId: true } },
        matchBets: { select: { isCorrect: true, paymentId: true, poolModule: true, payment: { select: { status: true } } } },
        specialBets: { select: { isCorrect: true } },
        bracketBets: { select: { score: true } },
        payments: { select: { amount: true, status: true, module: true } },
      },
    }),
    prisma.moduleSettings.findMany(),
  ]);
  const winners = await getLastJornadaWinners();

  // Un módulo con precio > 0 solo cuenta si el usuario tiene su entrada APROBADA.
  const pricedModules = new Set(moduleSettings.filter((s) => Number(s.price) > 0).map((s) => String(s.module)));

  const rows = users.map((u) => {
    const approvedModules = new Set(
      u.payments.filter((p) => p.module && p.status === "APPROVED").map((p) => String(p.module))
    );
    const valid = (m: string) => !pricedModules.has(m) || approvedModules.has(m);

    const points =
      u.matchBets.filter((b) => b.isCorrect === true && b.poolModule != null && valid(b.poolModule)).length +
      (valid("GROUPS") ? u.groupBets.filter((b) => b.isCorrect === true).length : 0) +
      (valid("SPECIALS") ? u.specialBets.filter((b) => b.isCorrect === true).length : 0) +
      (valid("BRACKET") ? u.bracketBets.reduce((s, b) => s + b.score, 0) : 0);

    const paid = u.payments.filter((p) => p.status === "APPROVED").reduce((s, p) => s + Number(p.amount), 0);
    const pending = u.payments.filter((p) => p.status === "PENDING").reduce((s, p) => s + Number(p.amount), 0);

    const groupsBet = new Set(u.groupBets.map((b) => b.groupPoolId)).size;

    return {
      id: u.id, name: u.name ?? "—", email: u.email, role: u.role, points, paid, pending,
      groups: groupsBet, matches: u.matchBets.length, specials: u.specialBets.length, bracket: u.bracketBets.length,
    };
  });

  const totalUsers = rows.length;
  const totalAdmins = rows.filter((r) => r.role === "ADMIN").length;
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usuarios</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="py-4"><p className="text-sm text-gray-500">Usuarios</p><p className="text-2xl font-bold">{totalUsers}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-sm text-gray-500">Admins</p><p className="text-2xl font-bold">{totalAdmins}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-sm text-gray-500">Recaudado</p><p className="text-2xl font-bold text-green-700">${totalPaid.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-sm text-gray-500">Pendiente</p><p className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-3 py-3 font-medium text-center">Rol</th>
                <th className="px-3 py-3 font-medium text-right">Puntos</th>
                <th className="px-3 py-3 font-medium text-right">Pagado</th>
                <th className="px-3 py-3 font-medium text-right">Pendiente</th>
                <th className="px-3 py-3 font-medium text-center" title="Grupos · Partidos · Especiales · Bracket">Apuestas (G/P/E/B)</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 flex items-center gap-1.5">{r.name}{winners.has(r.id) && <WinnerStar />}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.role === "ADMIN"
                      ? <Badge className="bg-amber-100 text-amber-800">Admin</Badge>
                      : <Badge variant="outline" className="text-gray-500">Usuario</Badge>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900">{r.points}</td>
                  <td className="px-3 py-3 text-right text-green-700 font-medium">${r.paid.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-yellow-600 font-medium">{r.pending > 0 ? `$${r.pending.toFixed(0)}` : "—"}</td>
                  <td className="px-3 py-3 text-center text-xs text-gray-500 font-mono whitespace-nowrap">
                    {r.groups}/{r.matches}/{r.specials}/{r.bracket}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions userId={r.id} isAdmin={r.role === "ADMIN"} isSelf={r.id === myId} name={r.name} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Sin usuarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
