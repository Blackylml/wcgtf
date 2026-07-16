"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Swords, Users, Clock, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { enterDuelSession } from "./actions";

// ── Types ───────────────────────────────────────────────────────────────────────

type SessionInfo = {
  id: string;
  module: string;
  label: string;
  entryFee: number;
  houseCutPct: number;
  isOpen: boolean;
  pairingDone: boolean;
  participantCount: number;
};

type UserPairInfo = {
  id: string;
  prizePool: number;
  myScore: number | null;
  rivalScore: number | null;
  iWon: boolean;
  iLost: boolean;
  isTie: boolean;
  prizeGiven: boolean;
};

type PersonInfo = { id: string; name: string; image: string | null };
type SimpleUser = { name: string; image: string | null };

interface DuelCardProps {
  session: SessionInfo;
  userEntry: { paired: boolean; refunded: boolean } | null;
  userPair: UserPairInfo | null;
  rival: PersonInfo | null;
  participants: SimpleUser[];
  userCredits: number;
  currentUser: SimpleUser;
}

// ── Avatar ──────────────────────────────────────────────────────────────────────

function Avatar({ name, image, size = 48 }: { name: string; image: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.34 };

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        style={style}
        className="rounded-full object-cover ring-2 ring-white/15 shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      style={style}
      className="rounded-full bg-white/[0.08] ring-2 ring-white/15 grid place-items-center font-bold text-slate-300 shrink-0"
    >
      {initials || "?"}
    </span>
  );
}

// ── Roulette Slot ───────────────────────────────────────────────────────────────

function RouletteSlot({ name, image }: { name: string; image: string | null }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.22em]">
        Ruleta — buscando rival
      </p>
      <div className="w-full max-w-xs mx-auto rounded-2xl border border-amber-400/50 bg-black/50 shadow-[0_0_28px_-6px_rgba(240,165,0,0.35)] h-16 flex items-center gap-3 px-5">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-1 ring-amber-400/40 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="w-9 h-9 rounded-full bg-white/[0.06] ring-1 ring-amber-400/30 grid place-items-center text-sm font-bold text-amber-400/60 shrink-0">
            {name[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="font-display font-extrabold text-white text-lg truncate">{name}</span>
      </div>
      <p className="text-[11px] text-slate-500">⚡ Emparejando participantes...</p>
    </div>
  );
}

// ── Rival Reveal ────────────────────────────────────────────────────────────────

function RivalReveal({
  rival,
  prize,
  onContinue,
}: {
  rival: PersonInfo;
  prize: number;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-5 text-center">
      <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.22em]">
        ¡Tu rival es!
      </p>
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-2xl bg-red-500/25 scale-[1.8]" />
        <Avatar name={rival.name} image={rival.image} size={80} />
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold text-white">{rival.name}</p>
        <p className="text-xs text-amber-400/80 mt-1">
          Premio: <span className="font-bold text-amber-300">${prize.toFixed(0)}</span> créditos al ganador
        </p>
      </div>
      <button
        onClick={onContinue}
        className="px-7 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold shadow-[0_6px_20px_-8px_rgba(232,55,74,0.65)] active:scale-95 transition-transform"
      >
        Ver duelo ⚔
      </button>
    </div>
  );
}

// ── Head to Head ────────────────────────────────────────────────────────────────

function HeadToHead({
  pair,
  rival,
  currentUser,
  prize,
}: {
  pair: UserPairInfo;
  rival: PersonInfo;
  currentUser: SimpleUser;
  prize: number;
}) {
  const hasScores = pair.myScore != null && pair.rivalScore != null;

  let statusText: string;
  let statusCls: string;

  if (pair.iWon) {
    statusText = `🏆 Ganaste · +$${pair.prizePool.toFixed(0)} créditos`;
    statusCls = "bg-green-400/10 text-green-400 border border-green-400/20";
  } else if (pair.iLost) {
    statusText = "Ganó el rival · Suerte la próxima";
    statusCls = "bg-red-400/[0.08] text-red-400 border border-red-400/20";
  } else if (pair.isTie) {
    statusText = `⚖ Empate · +$${(pair.prizePool / 2).toFixed(0)} créditos devueltos`;
    statusCls = "bg-amber-400/10 text-amber-400 border border-amber-400/20";
  } else {
    statusText = `Premio: $${prize.toFixed(0)} · En juego`;
    statusCls = "bg-white/[0.04] text-slate-400 border border-white/[0.06]";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 py-2">
        {/* Me */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Avatar name={currentUser.name} image={currentUser.image} size={56} />
          <span className="text-xs font-bold text-amber-400">Tú</span>
          {hasScores && (
            <span
              className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
                pair.iWon ? "text-green-400" : "text-white"
              }`}
            >
              {pair.myScore}
            </span>
          )}
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Swords size={22} className="text-red-400 opacity-60" />
          <span className="text-[9px] font-bold text-slate-600 tracking-[0.18em]">VS</span>
        </div>

        {/* Rival */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Avatar name={rival.name} image={rival.image} size={56} />
          <span className="text-xs font-medium text-slate-300 truncate max-w-[80px] text-center">
            {rival.name.split(" ")[0]}
          </span>
          {hasScores && (
            <span
              className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
                pair.iLost ? "text-red-400" : "text-white"
              }`}
            >
              {pair.rivalScore}
            </span>
          )}
        </div>
      </div>

      <div className={`rounded-xl px-4 py-2.5 text-center text-xs font-semibold ${statusCls}`}>
        {statusText}
      </div>
    </div>
  );
}

// ── Picks Link ──────────────────────────────────────────────────────────────────

function PicksLink({ module, label, highlight = false }: { module: string; label: string; highlight?: boolean }) {
  return (
    <Link
      href={`/partidos/${module}`}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
        highlight
          ? "bg-amber-400/[0.08] border-amber-400/25 hover:bg-amber-400/[0.14]"
          : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]"
      }`}
    >
      <span className={`text-sm font-semibold ${highlight ? "text-amber-300" : "text-slate-400"}`}>
        {label}
      </span>
      <ArrowRight size={15} className={highlight ? "text-amber-400" : "text-slate-600"} />
    </Link>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function DuelCard({
  session,
  userEntry,
  userPair,
  rival,
  participants,
  userCredits,
  currentUser,
}: DuelCardProps) {
  const [phase, setPhase] = useState<"check" | "spin" | "reveal" | "normal">("check");
  const [spinName, setSpinName] = useState(participants[0]?.name ?? "—");
  const [spinImage, setSpinImage] = useState<string | null>(participants[0]?.image ?? null);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prize = session.entryFee * 2 * (1 - session.houseCutPct / 100);

  useEffect(() => {
    if (!userPair || !rival) {
      setPhase("normal");
      return;
    }
    const key = `duel-reveal-${userPair.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(key)) {
      setPhase("normal");
      return;
    }

    setPhase("spin");
    let idx = 0;
    let count = 0;
    const TOTAL = 32;
    const pool = participants.length > 0 ? participants : [{ name: rival.name, image: rival.image }];

    function tick() {
      const p = pool[idx % pool.length];
      setSpinName(p.name);
      setSpinImage(p.image);
      idx++;
      count++;

      if (count >= TOTAL) {
        setSpinName(rival!.name);
        setSpinImage(rival!.image);
        timerRef.current = setTimeout(() => {
          setPhase("reveal");
          if (typeof window !== "undefined") localStorage.setItem(key, "1");
        }, 600);
      } else {
        const rem = TOTAL - count;
        const delay = rem > 18 ? 60 : rem > 10 ? 100 : 80 + (10 - rem) * 55;
        timerRef.current = setTimeout(tick, delay);
      }
    }

    timerRef.current = setTimeout(tick, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userPair?.id, rival?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEnter() {
    setEnterError(null);
    startTransition(async () => {
      const r = await enterDuelSession(session.id);
      if (r.error) setEnterError(r.error);
    });
  }

  // ── normal state content ──────────────────────────────────────────────────────

  function renderNormal() {
    if (userEntry?.refunded) {
      return (
        <p className="text-xs text-center text-slate-500 py-3">
          Reembolsado — quedaste sin pareja.{" "}
          <span className="text-amber-400">${session.entryFee.toFixed(0)} créditos devueltos.</span>
        </p>
      );
    }

    if (userPair && rival) {
      return (
        <div className="space-y-3">
          <HeadToHead pair={userPair} rival={rival} currentUser={currentUser} prize={prize} />
          {userPair.myScore == null && (
            <PicksLink module={session.module} label="Ver / cambiar mis picks" />
          )}
        </div>
      );
    }

    if (userEntry) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Clock size={15} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Inscrito · Esperando ruleta</p>
              <p className="text-xs text-slate-500 mt-0.5">
                La ruleta asigna tu rival al iniciar el primer partido
              </p>
            </div>
          </div>
          <PicksLink module={session.module} label="Hacer mis picks ahora" highlight />
        </div>
      );
    }

    const canAfford = userCredits >= session.entryFee;
    return (
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Entrada</span>
          <span className="font-bold text-amber-300">${session.entryFee.toFixed(0)} créditos</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Premio al ganador</span>
          <span className="font-bold text-green-400">${prize.toFixed(0)} créditos</span>
        </div>
        {session.houseCutPct > 0 && (
          <div className="flex justify-between text-xs text-slate-600">
            <span>Corte plataforma</span>
            <span>{session.houseCutPct}%</span>
          </div>
        )}
        {session.isOpen ? (
          <>
            <button
              onClick={handleEnter}
              disabled={!canAfford || isPending}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                canAfford
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_6px_20px_-8px_rgba(232,55,74,0.6)] hover:brightness-110 disabled:opacity-50"
                  : "bg-white/[0.04] text-slate-600 border border-white/[0.06] cursor-not-allowed"
              }`}
            >
              {isPending ? (
                <Loader2 size={15} className="animate-spin mx-auto" />
              ) : canAfford ? (
                "⚔ Inscribirme"
              ) : (
                `Sin créditos — necesitas $${session.entryFee.toFixed(0)}`
              )}
            </button>
            {enterError && <p className="text-xs text-red-400 text-center">{enterError}</p>}
          </>
        ) : (
          <p className="text-xs text-center text-slate-600 py-1">Inscripción cerrada</p>
        )}
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Swords size={14} className="text-red-400 shrink-0" />
          <span className="font-display font-bold text-sm truncate">{session.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
          <Users size={11} />
          <span>{session.participantCount}</span>
          {session.isOpen ? (
            <span className="text-green-400/80 font-medium">Abierto</span>
          ) : (
            <span className="text-slate-600">Cerrado</span>
          )}
          {session.pairingDone && (
            <span className="text-amber-400/70 font-medium">Emparejado</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {phase === "check" && (
          <div className="h-12 flex items-center justify-center">
            <Loader2 size={15} className="animate-spin text-slate-700" />
          </div>
        )}

        {phase === "spin" && <RouletteSlot name={spinName} image={spinImage} />}

        {phase === "reveal" && rival && (
          <RivalReveal rival={rival} prize={prize} onContinue={() => setPhase("normal")} />
        )}

        {phase === "normal" && renderNormal()}
      </div>
    </div>
  );
}
