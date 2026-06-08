"use client";

import { useState, useTransition } from "react";
import { toggleUserRole, deleteUser } from "./actions";
import { Shield, ShieldOff, Trash2 } from "lucide-react";

export function UserActions({
  userId, isAdmin, isSelf, name,
}: {
  userId: string; isAdmin: boolean; isSelf: boolean; name: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function onToggle() {
    setErr("");
    start(async () => {
      const r = await toggleUserRole(userId);
      if (r?.error) setErr(r.error);
    });
  }

  function onDelete() {
    setErr("");
    if (!window.confirm(`¿Eliminar a ${name}? Se borrarán sus apuestas y pagos. Esta acción no se puede deshacer.`)) return;
    start(async () => {
      const r = await deleteUser(userId);
      if (r?.error) setErr(r.error);
    });
  }

  if (isSelf) {
    return <span className="text-xs text-gray-400 italic">tú</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {err && <span className="text-[11px] text-red-600 mr-1">{err}</span>}
      <button
        onClick={onToggle}
        disabled={pending}
        title={isAdmin ? "Quitar admin" : "Hacer admin"}
        className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium border transition-colors disabled:opacity-50 ${
          isAdmin
            ? "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
            : "text-gray-600 border-gray-300 bg-white hover:bg-gray-50"
        }`}
      >
        {isAdmin ? <ShieldOff size={13} /> : <Shield size={13} />}
        {isAdmin ? "Quitar admin" : "Hacer admin"}
      </button>
      <button
        onClick={onDelete}
        disabled={pending}
        title="Eliminar usuario"
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
