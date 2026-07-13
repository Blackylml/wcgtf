"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { initCreditTopup } from "./actions";

const PRESETS = [100, 200, 500];

export function TopupForm() {
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true); setError("");
    const r = await initCreditTopup(amount);
    setLoading(false);
    if (r?.error) { setError(r.error); return; }
    if (r.redirectUrl) window.location.href = r.redirectUrl;
  }

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
              amount === p
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      {/* Input personalizado */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm">$</span>
        <input
          type="number"
          min={50}
          step={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400/50"
        />
        <span className="text-slate-400 text-sm">MXN</span>
      </div>

      <button
        onClick={handlePay}
        disabled={loading || amount < 50}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
      >
        <CreditCard size={15} />
        {loading ? "Procesando…" : `Recargar $${amount} con tarjeta`}
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
