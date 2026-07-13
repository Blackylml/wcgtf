import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { TopupForm } from "./TopupForm";
import { Wallet, ArrowDownLeft, ArrowUpRight, Gift, Trophy } from "lucide-react";

const TX_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT_MP:    <ArrowDownLeft size={13} className="text-emerald-400" />,
  DEPOSIT_ADMIN: <Gift size={13} className="text-blue-400" />,
  SPEND_ENTRY:   <ArrowUpRight size={13} className="text-slate-500" />,
  REFUND:        <ArrowDownLeft size={13} className="text-amber-400" />,
  PRIZE_WIN:     <Trophy size={13} className="text-amber-400" />,
};

const TX_LABELS: Record<string, string> = {
  DEPOSIT_MP:    "Recarga",
  DEPOSIT_ADMIN: "Bono admin",
  SPEND_ENTRY:   "Entrada pagada",
  REFUND:        "Reembolso",
  PRIZE_WIN:     "Premio 1v1",
};

export default async function CreditosPage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { amount: true, type: true, description: true, createdAt: true },
      },
    },
  });

  const balance = Number(user?.credits ?? 0);
  const txs = user?.creditTransactions ?? [];

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">

        {/* Balance */}
        <div className="animate-rise rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6 mb-4 text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-emerald-400/10 ring-1 ring-emerald-400/20 mb-3 mx-auto">
            <Wallet size={24} className="text-emerald-400" strokeWidth={1.5} />
          </span>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Saldo disponible</p>
          <p className="font-display text-4xl font-extrabold text-emerald-300 tabular-nums">
            ${balance.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">MXN</p>
        </div>

        {/* Recargar */}
        <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 mb-4">
          <p className="text-sm font-semibold text-white mb-4">Recargar créditos</p>
          <TopupForm />
          <p className="text-xs text-slate-600 text-center mt-3">
            Los créditos se acreditan automáticamente tras el pago.
          </p>
        </div>

        {/* Historial */}
        {txs.length > 0 && (
          <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
            <p className="text-sm font-semibold text-white mb-3">Movimientos</p>
            <div className="space-y-2.5">
              {txs.map((tx, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center w-7 h-7 rounded-lg bg-white/[0.05] shrink-0">
                      {TX_ICONS[tx.type] ?? <Wallet size={13} className="text-slate-500" />}
                    </span>
                    <div>
                      <p className="text-xs text-slate-200">{tx.description ?? TX_LABELS[tx.type] ?? tx.type}</p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(tx.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-semibold tabular-nums ${Number(tx.amount) >= 0 ? "text-emerald-400" : "text-slate-500"}`}>
                    {Number(tx.amount) >= 0 ? "+" : ""}${Number(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
