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
  setMatchExternalId,
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
  externalId: number | null;
};

export function MatchRow({ match }: { match: Match }) {
  const [priceVal, setPriceVal] = useState(String(match.price));
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? ""));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? ""));
  const [penWinner, setPenWinner] = useState(match.penaltiesWinner ?? "");
  const [extId, setExtId] = useState(String(match.externalId ?? ""));
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

  async function handleExternalId() {
    setLoading(true);
    const v = extId.trim();
    await setMatchExternalId(match.id, v === "" ? null : parseInt(v, 10));
    setLoading(false);
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-3 py-3 text-xs text-gray-400 w-8">M{match.matchNumber}</td>

      <td className="px-3 py-3">
        <div className="text-sm font-medium">{homeName}</div>
        <div className="text-xs text-gray-400">vs {awayName}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-400">API</span>
          <Input
            value={extId}
            onChange={(e) => setExtId(e.target.value)}
            type="number"
            placeholder="id"
            title="ID del fixture en API-Football (resultados automáticos)"
            className={`h-6 w-20 text-[11px] px-1 ${match.externalId ? "border-green-300" : ""}`}
          />
          <button onClick={handleExternalId} disabled={loading} className="text-[11px] text-blue-600 hover:underline disabled:opacity-40">✓</button>
        </div>
      </td>

      <td className="px-3 py-3 text-xs text-gray-500 hidden md:table-cell">
        <div>{dateStr} {timeStr}</div>
        <div className="text-gray-400 truncate max-w-[160px]">{match.venue}</div>
      </td>

      <td className="px-3 py-3 w-36">
        <div className="flex items-center gap-1">
          <Input
            value={priceVal}
            onChange={(e) => setPriceVal(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            className="h-7 w-20 text-xs"
          />
          <button
            onClick={handlePrice}
            disabled={loading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-40"
          >
            ✓
          </button>
        </div>
      </td>

      <td className="px-3 py-3 w-48">
        <div className="flex items-center gap-1">
          <Input
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            type="number"
            min="0"
            placeholder="L"
            className="h-7 w-10 text-xs px-1"
          />
          <span className="text-gray-400">-</span>
          <Input
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            type="number"
            min="0"
            placeholder="V"
            className="h-7 w-10 text-xs px-1"
          />
          {match.penaltiesAllowed && (
            <select
              value={penWinner}
              onChange={(e) => setPenWinner(e.target.value)}
              className="h-7 text-xs border rounded px-1 w-14"
              title="Ganador en penales"
            >
              <option value="">—</option>
              <option value={match.homeTeam?.code ?? "L"}>L</option>
              <option value={match.awayTeam?.code ?? "V"}>V</option>
            </select>
          )}
          <button
            onClick={handleResult}
            disabled={loading || homeScore === "" || awayScore === ""}
            className="text-xs font-medium text-green-600 hover:underline disabled:opacity-40"
          >
            {hasResult ? "Actualizar" : "Guardar"}
          </button>
          {hasResult && (
            <button
              onClick={handleClearResult}
              disabled={loading}
              className="text-xs text-red-400 hover:underline disabled:opacity-40"
              title="Borrar resultado"
            >
              ✕
            </button>
          )}
        </div>
        {hasResult && (
          <p className="text-[10px] text-gray-400 mt-1">
            Guardado: {match.homeScore}–{match.awayScore}{match.penaltiesWinner ? " (pen)" : ""}
          </p>
        )}
      </td>

      <td className="px-3 py-3 w-28">
        <div className="flex flex-col gap-1">
          <Badge className={match.isOpen ? "bg-green-100 text-green-800 text-xs" : "bg-gray-100 text-gray-500 text-xs"}>
            {match.isOpen ? "Abierto" : "Cerrado"}
          </Badge>
          {match.stage !== "GROUP" && (
            <button
              onClick={handleTogglePenalties}
              disabled={loading}
              className={`text-xs hover:underline disabled:opacity-40 ${match.penaltiesAllowed ? "text-orange-500" : "text-gray-400"}`}
            >
              {match.penaltiesAllowed ? "Penales ✓" : "Penales +"}
            </button>
          )}
        </div>
      </td>

      <td className="px-3 py-3 w-20">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`text-xs hover:underline disabled:opacity-40 ${match.isOpen ? "text-red-500" : "text-green-600"}`}
        >
          {match.isOpen ? "Cerrar" : "Abrir"}
        </button>
      </td>
    </tr>
  );
}
