"use client";

import type { ReactNode } from "react";
import { CreditCard, Banknote, Trash2, Check, Clock } from "lucide-react";

/**
 * Fases de pago para una apuesta INDIVIDUAL ya creada (partido con precio propio).
 * La fase "pick" es específica de cada tarjeta; aquí van pay / pending / paid.
 */
export function BetPayPhases({
  phase, price, recap, onMP, onChoosePending, onChoosePay, onDelete, loading, error, isOpen,
}: {
  phase: "pay" | "pending" | "paid";
  price: number;
  recap: ReactNode;
  onMP: () => void;
  onChoosePending: () => void;
  onChoosePay: () => void;
  onDelete: () => void;
  loading: boolean;
  error?: string;
  isOpen: boolean;
}) {
  const cancelBtn = (
    <button
      onClick={onDelete}
      disabled={loading}
      className="flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors pt-1"
    >
      <Trash2 size={11} />
      {loading ? "Cancelando..." : "Cancelar apuesta"}
    </button>
  );

  if (phase === "pay") {
    return (
      <div className="space-y-3 flex-1 flex flex-col">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">{recap}</div>
          <span className="text-amber-300 font-bold text-sm tabular-nums shrink-0">${price}</span>
        </div>
        <p className="text-[11px] text-slate-400 text-center">Apuesta individual — elige cómo pagar</p>
        <div className="grid grid-cols-1 gap-2">
          <button onClick={onMP} disabled={loading} className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]">
            <CreditCard size={15} /> Pagar con tarjeta
          </button>
          <button onClick={onChoosePending} disabled={loading} className="flex items-center justify-center gap-2 w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 text-slate-200 font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]">
            <Banknote size={15} /> Pago manual
          </button>
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        {cancelBtn}
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="space-y-3 flex-1 flex flex-col">
        <div className="bg-amber-400/[0.08] border border-amber-400/25 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-amber-300" />
            <p className="text-[11px] text-amber-300 font-semibold uppercase tracking-wide">Pendiente de pago</p>
          </div>
          {recap}
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Paga <span className="text-amber-300 font-semibold">${price}</span> y el admin lo verifica. Suma al aprobarse.
          </p>
        </div>
        <button onClick={onChoosePay} className="flex items-center justify-center gap-2 w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 text-slate-300 font-semibold rounded-xl py-2.5 text-sm transition-all">
          <CreditCard size={13} /> Pagar con tarjeta en su lugar
        </button>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        {cancelBtn}
      </div>
    );
  }

  // paid
  return (
    <div className="space-y-2 flex-1 flex flex-col">
      <div className="bg-green-400/[0.1] border border-green-400/25 rounded-xl p-3 flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <Check size={12} className="text-green-400" />
          <p className="text-[11px] text-green-300 font-semibold uppercase tracking-wide">Apuesta confirmada</p>
        </div>
        {recap}
      </div>
      {isOpen && cancelBtn}
    </div>
  );
}
