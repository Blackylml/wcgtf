import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const [users, teams, matches, payments] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.match.count(),
    prisma.payment.groupBy({ by: ["status"], _count: true }),
  ]);

  const approved = payments.find((p) => p.status === "APPROVED")?._count ?? 0;
  const pending = payments.find((p) => p.status === "PENDING")?._count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Usuarios" value={users} icon="👤" />
        <StatCard title="Equipos" value={teams} icon="🏳️" />
        <StatCard title="Partidos" value={matches} icon="⚽" />
        <StatCard title="Pagos aprobados" value={approved} icon="✅" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de módulos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ModuleStatus label="Fase de Grupos" href="/admin/grupos" />
            <ModuleStatus label="Partidos" href="/admin/partidos" />
            <ModuleStatus label="Bracket Eliminatorias" href="/admin/bracket" />
            <ModuleStatus label="Premios Especiales" href="/admin/especiales" />
            <ModuleStatus label="Desempate KO" href="/admin/ko-resultados" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pendientes</span>
              <Badge variant="outline">{pending}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Aprobados</span>
              <Badge className="bg-green-100 text-green-800">{approved}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleStatus({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-700">{label}</span>
      <a href={href} className="text-blue-600 hover:underline text-xs">
        Gestionar →
      </a>
    </div>
  );
}
