"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { FlagCircle } from "@/components/FlagCircle";

export type Person = { id: string; name: string; image: string | null };
export type PickPeople = { HOME: Person[]; DRAW: Person[]; AWAY: Person[] };

type LiveState = {
  available: boolean;
  state?: string; // pre | in | post
  detail?: string;
  statusShort?: string;
  homeGoals?: number | null;
  awayGoals?: number | null;
};

const POLL_MS = 30_000;

function firstName(name: string) {
  return name.split(" ")[0];
}

function Avatar({ person }: { person: Person }) {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span title={firstName(person.name)} className="block">
      {person.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de perfil de Google
        <img
          src={person.image}
          alt={person.name}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.8)]"
        />
      ) : (
        <span className="w-8 h-8 rounded-full bg-white/[0.1] ring-2 ring-white/20 grid place-items-center text-[10px] font-bold text-slate-200 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.8)]">
          {initials || "?"}
        </span>
      )}
    </span>
  );
}

/** Racimo de avatares flotantes; muestra hasta `max` y un "+N". */
function PickCluster({ people, align }: { people: Person[]; align: "left" | "center" | "right" }) {
  const max = 5;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const justify = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  if (people.length === 0) {
    return <div className={`flex ${justify} min-h-[2rem]`} />;
  }

  return (
    <div className={`flex flex-wrap ${justify} gap-1.5 min-h-[2rem]`}>
      {shown.map((p, i) => (
        <span key={p.id} className="animate-floaty" style={{ animationDelay: `${i * 240}ms` }}>
          <Avatar person={p} />
        </span>
      ))}
      {extra > 0 && (
        <span className="w-8 h-8 rounded-full bg-white/[0.06] ring-2 ring-white/15 grid place-items-center text-[10px] font-bold text-slate-300">
          +{extra}
        </span>
      )}
    </div>
  );
}

export function NextMatchHero({
  matchId,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
  homeCode,
  awayCode,
  scheduledAt,
  initialHomeScore,
  initialAwayScore,
  people,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeCode: string | null;
  awayCode: string | null;
  scheduledAt: string;
  initialHomeScore: number | null;
  initialAwayScore: number | null;
  people: PickPeople;
}) {
  const kickoff = new Date(scheduledAt).getTime();
  const [started, setStarted] = useState(false);
  const [live, setLive] = useState<LiveState | null>(null);
  const router = useRouter();
  const refreshedRef = useRef<string | null>(null);

  // ¿Ya empezó? (evita Date.now() en el render por las reglas de pureza)
  useEffect(() => {
    const tick = () => setStarted(Date.now() >= kickoff);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [kickoff]);

  // Polling del marcador en vivo cada 30 s, una vez que el partido arrancó.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/match-live?matchId=${matchId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data: LiveState = await res.json();
        if (!cancelled) setLive(data);
      } catch {
        /* ignora errores de red transitorios */
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [started, matchId]);

  // Cuando ESPN marca el partido como FINALIZADO, el endpoint ya guardó el
  // resultado; refrescamos (una sola vez por partido) para que el servidor
  // re-seleccione el héroe y avance al siguiente sin recargar a mano.
  useEffect(() => {
    if (live?.available && live.state === "post" && refreshedRef.current !== matchId) {
      refreshedRef.current = matchId;
      const t = setTimeout(() => router.refresh(), 2500);
      return () => clearTimeout(t);
    }
  }, [live, matchId, router]);

  // Marcador a mostrar: el de la API si está disponible, si no el guardado en BD.
  const hasApiScore = live?.available && live.homeGoals != null && live.awayGoals != null;
  const homeScore = hasApiScore ? live!.homeGoals! : initialHomeScore;
  const awayScore = hasApiScore ? live!.awayGoals! : initialAwayScore;
  const showScore = homeScore != null && awayScore != null;

  const isLive = live?.available && live.state === "in";
  const isFinal = (live?.available && live.state === "post") || (!isLive && initialHomeScore != null);

  const label = isLive ? "En vivo" : isFinal ? "Finalizado" : started ? "En juego" : "Próximo partido";
  const labelColor = isLive ? "text-red-400" : isFinal ? "text-slate-400" : "text-green-400";

  return (
    <section className="animate-rise relative rounded-3xl overflow-hidden border border-white/10 stadium-bg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 stadium-lines" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <p className={`text-[11px] font-bold uppercase tracking-[0.22em] flex items-center gap-2 ${labelColor}`}>
            {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-live-dot" />}
            {label}
          </p>
          {isLive && live?.detail && (
            <span className="text-[11px] font-mono font-bold text-red-300 tabular-nums">{live.detail}</span>
          )}
        </div>

        {/* Teams + score/avatars */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mb-4">
          {/* Home */}
          <div className="flex flex-col items-center gap-2">
            <FlagCircle flag={homeFlag} code={homeCode} size={62} ring="ring-green-400/40" />
            <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">{homeName}</span>
            <PickCluster people={people.HOME} align="center" />
          </div>

          {/* Center: score or VS */}
          <div className="flex flex-col items-center gap-2 px-1 pt-2">
            {showScore ? (
              <div className="flex items-center gap-2 font-display font-extrabold text-3xl sm:text-4xl text-white tabular-nums leading-none">
                <span>{homeScore}</span>
                <span className="text-slate-500 text-xl">-</span>
                <span>{awayScore}</span>
              </div>
            ) : (
              <span className="grid place-items-center w-11 h-11 rounded-full bg-[#0b1424] ring-1 ring-green-400/60 animate-halo-pulse">
                <span className="font-display font-extrabold text-xs text-green-400 tracking-wide">VS</span>
              </span>
            )}
            <PickCluster people={people.DRAW} align="center" />
            {people.DRAW.length > 0 && (
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Empate</span>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2">
            <FlagCircle flag={awayFlag} code={awayCode} size={62} ring="ring-blue-400/40" />
            <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">{awayName}</span>
            <PickCluster people={people.AWAY} align="center" />
          </div>
        </div>

        {/* Countdown only before kickoff */}
        {!started && (
          <div className="flex justify-center pt-1">
            <Countdown target={scheduledAt} />
          </div>
        )}
      </div>
    </section>
  );
}
