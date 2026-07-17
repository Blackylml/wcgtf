import type { MatchPick } from "@/generated/prisma/client";

type PickState = { pick: MatchPick; isCorrect: boolean | null } | null;

export type MatchupRow = {
  id: string;
  matchNumber: number;
  homeName: string;
  homeFlag: string | null;
  awayName: string;
  awayFlag: string | null;
  homeScore: number | null;
  awayScore: number | null;
  myBet: PickState;
  rivalBet: PickState;
};

const PICK_LABEL: Record<MatchPick, string> = { HOME: "LOC", DRAW: "EMP", AWAY: "VIS" };

function TeamLogo({ flag, name }: { flag: string | null; name: string }) {
  if (flag?.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={flag} alt={name} width={20} height={20} className="rounded-sm object-contain shrink-0" />;
  }
  return <span className="text-base leading-none shrink-0">{flag ?? "🏴"}</span>;
}

function PickBadge({ bet, reveal }: { bet: PickState; reveal: boolean }) {
  if (!reveal || !bet) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-white/[0.04] text-slate-600 border-white/[0.06]">
        {reveal ? "—" : "?"}
      </span>
    );
  }

  const { pick, isCorrect } = bet;
  const cls =
    isCorrect === true  ? "bg-green-400/15 text-green-400 border-green-400/25" :
    isCorrect === false ? "bg-red-400/10   text-red-400   border-red-400/20"   :
                          "bg-white/[0.06] text-slate-300 border-white/[0.08]";

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls}`}>
      {PICK_LABEL[pick]}
      {isCorrect === true  && <span className="text-[9px]">✓</span>}
      {isCorrect === false && <span className="text-[9px]">✗</span>}
    </span>
  );
}

export function DuelMatchup({
  rows,
  myName,
  rivalName,
  locked,
}: {
  rows: MatchupRow[];
  myName: string;
  rivalName: string;
  locked: boolean;
}) {
  if (rows.length === 0) return null;

  const myPts  = rows.filter((r) => r.myBet?.isCorrect    === true).length;
  const rivPts = rows.filter((r) => r.rivalBet?.isCorrect === true).length;
  const done   = rows.filter((r) => r.myBet?.isCorrect    != null).length;

  return (
    <div className="animate-rise mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Tú</span>
          <span className="text-lg font-display font-extrabold tabular-nums text-white leading-none">{myPts}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">
            {done > 0 ? `${done}/${rows.length} jugados` : "Partido a partido"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[90px]">
            {rivalName.split(" ")[0]}
          </span>
          <span className="text-lg font-display font-extrabold tabular-nums text-white leading-none">{rivPts}</span>
        </div>
      </div>

      {/* Match rows */}
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row) => {
          const hasResult = row.homeScore != null;
          return (
            <div
              key={row.id}
              className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 ${
                hasResult ? "" : "opacity-60"
              }`}
            >
              {/* My pick — left aligned */}
              <div className="flex items-center gap-1.5">
                <PickBadge bet={row.myBet} reveal={true} />
              </div>

              {/* Center: teams + score */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <TeamLogo flag={row.homeFlag} name={row.homeName} />
                  <span className="text-[11px] font-bold tabular-nums text-slate-300 w-9 text-center">
                    {hasResult ? `${row.homeScore}–${row.awayScore}` : "vs"}
                  </span>
                  <TeamLogo flag={row.awayFlag} name={row.awayName} />
                </div>
                <span className="text-[9px] text-slate-600 text-center max-w-[110px] truncate">
                  {row.homeName.split(/[ (]/)[0]} · {row.awayName.split(/[ (]/)[0]}
                </span>
              </div>

              {/* Rival pick — right aligned */}
              <div className="flex items-center justify-end gap-1.5">
                <PickBadge bet={row.rivalBet} reveal={locked} />
              </div>
            </div>
          );
        })}
      </div>

      {!locked && (
        <p className="text-center text-[10px] text-slate-600 py-2.5 border-t border-white/[0.04]">
          Los picks del rival se revelan al cerrar la quiniela
        </p>
      )}
    </div>
  );
}
