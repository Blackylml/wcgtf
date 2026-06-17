import type { Participant } from "@/lib/module-access";
import { Users } from "lucide-react";

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- foto de perfil de Google
      <img src={image} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover ring-1 ring-white/15 shrink-0" />
    );
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span className="grid place-items-center w-5 h-5 rounded-full bg-white/[0.08] ring-1 ring-white/10 text-[8px] font-bold text-slate-300 shrink-0">
      {initials || "?"}
    </span>
  );
}

/** Lista de participantes confirmados de una quiniela. */
export function Participants({ participants }: { participants: Participant[] }) {
  return (
    <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="text-slate-400" />
        <h3 className="font-display text-sm font-bold text-white">Participantes</h3>
        <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.05] border border-white/10 rounded-full px-2 py-0.5">{participants.length}</span>
      </div>
      {participants.length === 0 ? (
        <p className="text-xs text-slate-500">Aún nadie con pago confirmado.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-full pl-1 pr-2.5 py-1">
              <Avatar name={p.name} image={p.image} />
              <span className="text-xs text-slate-200">{p.name.split(" ").slice(0, 2).join(" ")}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
