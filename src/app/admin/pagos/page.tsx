import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@/generated/prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};
const STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

async function approvePayment(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.payment.update({ where: { id }, data: { status: "APPROVED" } });
  revalidatePath("/admin/pagos");
}

async function rejectPayment(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.payment.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/admin/pagos");
}

export default async function PagosAdminPage() {
  const payments = await prisma.payment.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totals = payments.reduce(
    (acc, p) => {
      if (p.status === "APPROVED") acc.approved += Number(p.amount);
      if (p.status === "PENDING") acc.pending += Number(p.amount);
      return acc;
    },
    { approved: 0, pending: 0 }
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pagos</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total cobrado</p>
            <p className="text-2xl font-bold text-green-700">${totals.approved.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Pendiente</p>
            <p className="text-2xl font-bold text-yellow-600">${totals.pending.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Transacciones</p>
            <p className="text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {payments.length === 0 && (
          <p className="text-center text-gray-400 py-8">Sin pagos registrados.</p>
        )}
        {payments.map((p) => (
          <div key={p.id}
            className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              <div>
                <p className="text-sm font-medium">{p.user.name ?? p.user.email}</p>
                <p className="text-xs text-gray-400">
                  {p.mpPaymentId ? `MP: ${p.mpPaymentId}` : "Sin ID de MP"} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold">${Number(p.amount).toFixed(2)}</span>
              {p.status === "PENDING" && (
                <div className="flex gap-2">
                  <form action={approvePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" size="sm"
                      className="h-7 text-xs bg-green-700 hover:bg-green-800">
                      Aprobar
                    </Button>
                  </form>
                  <form action={rejectPayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" size="sm" variant="outline"
                      className="h-7 text-xs text-red-600 border-red-300">
                      Rechazar
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
