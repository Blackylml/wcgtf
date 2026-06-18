import { Star } from "lucide-react";

/** Estrella del ganador de la jornada pasada (temporal/cosmético). */
export function WinnerStar({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <Star
      size={size}
      className={`text-amber-400 fill-amber-400 shrink-0 ${className}`}
      aria-label="Ganador de la jornada pasada"
    />
  );
}
