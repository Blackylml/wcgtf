"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  toggleMatch,
  setMatchPrice,
  setResult,
  clearResult,
  togglePenalties,
} from "./actions";

type Team = { id: string; name: string; flag: string | null; code: string } | null;

type Match = {
  id: string;
  matchNumber: number;
  homeLabel: string | null;
  awayLabel: string | null;
  homeTeam: Team;
  awayTeam: Team;
  stage: string;
  scheduledAt: Date;
  venue: string | null;
  isOpen: boolean;
  price: string | number;
  homeScore: number | null;
  awayScore: number | null;
  penaltiesWinner: string | null;
  penaltiesAllowed: boolean;
};

export function MatchRow({ match }: { match: Match }) {
  const [priceVal, setPriceVal] = useState(String(match.price));
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ""));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ""));
  const [penWinner, setPenWinner] = useState(match.penaltiesWinner ?? "");
  const [loading, setLoading] = useState(false);

  const homeName = match.homeTeam?.flag
    ? `${match.homeTeam.flag} ${match.homeTeam.name}`
    : (match.homeLabel ?? "—");
  const awayName = match.awayTeam?.flag
    ? `${match.awayTeam.flag} ${match.awayTeam.name}`
    : (match.awayLabel ?? "—");

  const hasResult = match.homeScore !== null && match.awayScore !== null;

  const date = new Date(match.scheduledAt);
  const dateStr = date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  const timeStr = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Monterrey" });

  async function handleToggle() {
    setLoading(true);
    await toggleMatch(match.id, match.isOpen);
    setLoading(false);
  }

  async function handlePrice() {
    setLoading(true);
    await setMatchPrice(match.id, parseFloat(priceVal));
    setLoading(false);
  }

  async function handleResult() {
    setLoading(true);
    await setResult(
      match.id,
      parseInt(homeScore),
      parseInt(awayScore),
      penWinner || null
    );
    setLoading(false);
  }

  async function handleClearResult() {
    setLoading(true);
    setHomeScore("");
    setAwayScore("");
    setPenWinner("");
    await clearResult(match.id);
    setLoading(false);
  }

  async function handleTogglePenalties() {
    setLoading(true);
    await togglePenalties(match.id, match.penaltiesAllowed);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border bg-white p-3">
      {/* Encabezado: equipos + fecha */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-gray-400 shrink-0">M{match.matchNumber}</span>
            <span className="text-sm font-semibold text-gray-900 truncate">{homeName}</span>
          </div>
          <div className="text-xs text-gray-500 ml-7">vs {awayName}</div>
        </div>
        <div className="text-right text-[11px] text-gray-400 shrink-0">{dateStr} {timeStr}</div>
      </div>

      {/* Resultado */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 w-[68px] shrink-0">Resultado</span>
        <Input value={homeScore} onChange={(e) => setHomeScore(e.target.value)} type="number" min="0" inputMode="numeric" placeholder="L" className="h-8 w-11 text-sm px-1 text-center" />
        <span className="text-gray-400">-</span>
        <Input value={awayScore} onChange={(e) => setAwayScore(e.target.value)} type="number" min="0" inputMode="numeric" placeholder="V" className="h-8 w-11 text-sm px-1 text-center" />
        {match.penaltiesAllowed && (
          <select value={penWinner} onChange={(e) => setPenWinner(e.target.value)} className="h-8 text-xs border rounded px-1 w-14" title="Ganador en penales">
            <option value="">—</option>
            <option value={match.homeTeam?.code ?? "L"}>L</option>
            <option value={match.awayTeam?.code ?? "V"}>V</option>
          </select>
        )}
        <button
          onClick={handleResult}
          disabled={loading || homeScore === "" || awayScore === ""}
          className="h-8 px-3 rounded-md text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
        >
          {hasResult ? "Actualizar" : "Guardar"}
        </button>
        {hasResult && (
          <button onClick={handleClearResult} disabled={loading} className="h-8 px-2 text-xs text-red-500 hover:underline disabled:opacity-40" title="Borrar resultado">✕</button>
        )}
        {hasResult && (
          <span className="text-[11px] text-gray-400 ml-auto">Guardado: {match.homeScore}–{match.awayScore}{match.penaltiesWinner ? " (pen)" : ""}</span>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap mt-2.5 pt-2.5 border-t text-xs">
        <Badge className={match.isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
          {match.isOpen ? "Abierto" : "Cerrado"}
        </Badge>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`font-medium hover:underline disabled:opacity-40 ${match.isOpen ? "text-red-500" : "text-green-600"}`}
        >
          {match.isOpen ? "Cerrar" : "Abrir"}
        </button>
        {match.stage !== "GROUP" && (
          <button
            onClick={handleTogglePenalties}
            disabled={loading}
            className={`hover:underline disabled:opacity-40 ${match.penaltiesAllowed ? "text-orange-500" : "text-gray-400"}`}
          >
            {match.penaltiesAllowed ? "Penales ✓" : "Penales +"}
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-gray-400">Precio</span>
          <Input value={priceVal} onChange={(e) => setPriceVal(e.target.value)} type="number" min="0" step="0.01" inputMode="decimal" className="h-7 w-16 text-xs" />
          <button onClick={handlePrice} disabled={loading} className="text-blue-600 hover:underline disabled:opacity-40">✓</button>
        </div>
      </div>
    </div>
  );
}
