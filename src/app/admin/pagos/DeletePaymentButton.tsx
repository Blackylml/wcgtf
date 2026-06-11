"use client";

import { useState, useTransition } from "react";
import { deletePayment } from "./actions";
import { Trash2 } from "lucide-react";

export function DeletePaymentButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function onClick() {
    setErr("");
    if (!window.confirm(`¿Eliminar este pago de ${label}? No se puede deshacer.`)) return;
    start(async () => {
      const r = await deletePayment(id);
      if (r?.error) setErr(r.error);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      title={err || "Eliminar pago"}
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      <Trash2 size={13} />
    </button>
  );
}
