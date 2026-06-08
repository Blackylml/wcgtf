"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBracketMPUrl, deleteBracketBet } from "./actions";
import { BetPayPhases } from "@/components/BetPayPhases";

type Phase = "pay" | "pending" | "paid";

function initPhase(paymentStatus: string | null, price: number): Phase {
  if (price === 0 || paymentStatus === "APPROVED") return "paid";
  if (paymentStatus === "PENDING") return "pay";
  return "paid";
}

export function BracketBetStatus({
  price, paymentStatus, championLabel, isOpen,
}: {
  price: number;
  paymentStatus: string | null;
  championLabel: string;
  isOpen: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() => initPhase(paymentStatus, price));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleMP() {
    setLoading(true); setError("");
    const result = await getBracketMPUrl();
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    if (result.redirectUrl) window.location.href = result.redirectUrl;
  }

  async function handleDelete() {
    setLoading(true); setError("");
    const result = await deleteBracketBet();
    setLoading(false);
    if (result?.error) { setError(result.error); return; }
    router.refresh();
  }

  const recap = (
    <p className="font-semibold text-white text-sm leading-tight">
      Bracket completo · Campeón: <span className="text-amber-300">{championLabel}</span>
    </p>
  );

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 flex flex-col mb-3">
      <BetPayPhases
        phase={phase}
        price={price}
        recap={recap}
        onMP={handleMP}
        onChoosePending={() => setPhase("pending")}
        onChoosePay={() => setPhase("pay")}
        onDelete={handleDelete}
        loading={loading}
        error={error}
        isOpen={isOpen}
      />
    </div>
  );
}
