import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { grantCredits, deductCredits } from "./actions";

export default async function CreditosAdminPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ credits: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { amount: true, type: true, description: true, createdAt: true },
      },
    },
  });

  const totalCredits = users.reduce((sum, u) => sum + Number(u.credits), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Créditos</h1>
      <p className="text-sm text-gray-500 mb-6">
        Saldo total en circulación: <strong>${totalCredits.toFixed(2)} MXN</strong>
      </p>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{user.name ?? user.email}</CardTitle>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-sm font-mono">
                  ${Number(user.credits).toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Abonar */}
                <form
                  action={async (fd) => {
                    "use server";
                    const amount = Number(fd.get("amount"));
                    const desc = fd.get("desc") as string;
                    await grantCredits(user.id, amount, desc);
                  }}
                  className="flex flex-col gap-1.5"
                >
                  <Label className="text-xs text-gray-600">Abonar créditos</Label>
                  <div className="flex gap-1.5">
                    <Input name="amount" type="number" min="1" step="0.01" placeholder="100" className="text-xs h-8" required />
                    <Input name="desc" placeholder="motivo" className="text-xs h-8 flex-1" />
                    <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs px-2">
                      +
                    </Button>
                  </div>
                </form>

                {/* Descontar */}
                <form
                  action={async (fd) => {
                    "use server";
                    const amount = Number(fd.get("amount"));
                    const desc = fd.get("desc") as string;
                    await deductCredits(user.id, amount, desc);
                  }}
                  className="flex flex-col gap-1.5"
                >
                  <Label className="text-xs text-gray-600">Descontar créditos</Label>
                  <div className="flex gap-1.5">
                    <Input name="amount" type="number" min="1" step="0.01" placeholder="100" className="text-xs h-8" required />
                    <Input name="desc" placeholder="motivo" className="text-xs h-8 flex-1" />
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-red-600 border-red-300 text-xs px-2">
                      −
                    </Button>
                  </div>
                </form>
              </div>

              {/* Historial */}
              {user.creditTransactions.length > 0 && (
                <div className="border-t pt-2 space-y-1">
                  {user.creditTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-500">
                      <span className="truncate max-w-[200px]">{tx.description ?? tx.type}</span>
                      <span className={Number(tx.amount) >= 0 ? "text-emerald-600 font-mono" : "text-red-500 font-mono"}>
                        {Number(tx.amount) >= 0 ? "+" : ""}${Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
