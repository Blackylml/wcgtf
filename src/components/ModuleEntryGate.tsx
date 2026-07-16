"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Module } from "@/generated/prisma/client";
import type { ModuleAccent } from "@/lib/modules";
import { createModuleEntry, getModuleEntryMPUrl, deleteModuleEntry, payModuleWithCredits } from "@/app/entryActions";
import { CreditCard, Banknote, Trash2, Check, Clock, Ticket, Lock, Coins } from "lucide-react";

type Phase = "gate" | "pay" | "pending" | "paid";

const ICON_TINT: Record<ModuleAccent, string> = {
  green: "text-green-400 bg-green-400/10 ring-green-400/30 halo-green",
  blue: "text-blue-400 bg-blue-400/10 ring-blue-400/30 halo-blue",
  amber: "text-amber-400 bg-amber-400/10 ring-amber-400/30 halo-amber",
  purple: "text-purple-400 bg-purple-400/10 ring-purple-400/30 halo-purple",
};

function initPhase(paymentStatus: string | null, price: number): Phase {
  if (price <= 0 || paymentStatus === "APPROVED") return "paid";
  if (paymentStatus === "PENDING") return "pay";
  return "gate";
}

export function ModuleEntryGate({
  module, label, accent, price, paymentStatus, entryOpen, userCredits,
}: {
  module: Module;
  label: string;
  accent: ModuleAccent;
  price: number;
  paymentStatus: string | null;
  entryOpen: boolean;
  userCredits?: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() => initPhase(paymentStatus, price));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (price <= 0) return null; // módulo gratis → sin gate

  async function ensureEntry() {
    const r = await createModuleEntry(module);
    if (r?.error && !r.error.includes("Ya tienes")) { setError(r.error); return false; }
    return true;
  }

  async function payCard() {
    setLoading(true); setError("");
    if (phase === "gate") {
      const ok = await ensureEntry();
      if (!ok) { setLoading(false); return; }
    }
    const r = await getModuleEntryMPUrl(module);
    setLoading(false);
    if (r?.error) { setError(r.error); return; }
    if (r.redirectUrl) window.location.href = r.redirectUrl;
  }

  async function payManual() {
    setLoading(true); setError("");
    const ok = await ensureEntry();
    setLoading(false);
    if (!ok) return;
    setPhase("pending");
    router.refresh();
  }

  async function payCredits() {
    setLoading(true); setError("");
    const r = await payModuleWithCredits(module);
    setLoading(false);
    if (r?.error) { setError(r.error); return; }
    setPhase("paid");
    router.refresh();
  }

  async function cancel() {
    setLoading(true); setError("");
    const r = await deleteModuleEntry(module);
    setLoading(false);
    if (r?.error) { setError(r.error); return; }
    setPhase("gate");
    router.refresh();
  }

  const card = "animate-rise rounded-2xl border p-4 mb-4";
  const mpBtn = "flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]";
  const neutralBtn = "flex items-center justify-center gap-2 w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 text-slate-200 font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]";
  const cancelBtn = "flex items-center justify-center gap-1.5 w-full text-xs text-slate-600 hover:text-red-400 transition-colors pt-1";

  if (phase === "paid") {
    return (
      <div className={`${card} border-green-400/25 bg-green-400/[0.07]`}>
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-400/10 ring-1 ring-green-400/30 shrink-0">
            <Check size={17} className="text-green-400" strokeWidth={2.4} />
          </span>
          <div>
            <p className="font-display font-bold text-sm text-white">Participando en {label}</p>
            <p className="text-xs text-slate-400">Entrada pagada · tus apuestas suman puntos</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "gate") {
    return (
      <div className={`${card} border-white/[0.1] bg-white/[0.03]`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`grid place-items-center w-9 h-9 rounded-xl ring-1 shrink-0 ${ICON_TINT[accent]}`}>
              <Ticket size={17} strokeWidth={2} />
            </span>
            <p className="font-display font-bold text-sm text-white leading-tight">Entrada · {label}</p>
          </div>
          <span className="text-amber-300 text-sm font-bold tabular-nums shrink-0">${price}</span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Paga tu entrada para participar. Puedes apostar de una vez — tus predicciones suman al aprobarse el pago.
        </p>
        {entryOpen ? (
          <div className="grid grid-cols-1 gap-2">
            {userCredits !== undefined && (
              <button
                onClick={payCredits}
                disabled={loading || userCredits < price}
                className={neutralBtn}
                title={userCredits < price ? `Solo tienes $${userCredits} créditos` : undefined}
              >
                <Coins size={15} />
                {userCredits >= price
                  ? `Pagar con créditos · $${price}`
                  : `Créditos insuficientes ($${userCredits}/$${price})`}
              </button>
            )}
            <button onClick={payCard} disabled={loading} className={mpBtn}><CreditCard size={15} /> Pagar con tarjeta · ${price}</button>
            <button onClick={payManual} disabled={loading} className={neutralBtn}><Banknote size={15} /> Pago manual · ${price}</button>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock size={12} /> La entrada a este módulo está cerrada.</p>
        )}
        {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
      </div>
    );
  }

  // pay / pending (entrada PENDING)
  return (
    <div className={`${card} border-amber-400/25 bg-amber-400/[0.06]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-amber-300" />
          <p className="font-display font-bold text-sm text-amber-200">Entrada pendiente · {label}</p>
        </div>
        <span className="text-amber-300 text-sm font-bold tabular-nums">${price}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        {phase === "pending"
          ? "Realiza tu pago y el admin lo verificará. Tus apuestas ya están guardadas y sumarán al aprobarse."
          : "Elige cómo pagar tu entrada. Tus apuestas ya están guardadas y sumarán al aprobarse."}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <button onClick={payCard} disabled={loading} className={mpBtn}><CreditCard size={15} /> Pagar con tarjeta</button>
        {phase === "pay" && (
          <button onClick={() => setPhase("pending")} disabled={loading} className={neutralBtn}><Banknote size={15} /> Pago manual</button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
      <button onClick={cancel} disabled={loading} className={`${cancelBtn} mt-2`}>
        <Trash2 size={11} /> {loading ? "..." : "Cancelar entrada"}
      </button>
    </div>
  );
}
