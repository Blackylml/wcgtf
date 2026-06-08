type FlagCircleProps = {
  flag?: string | null;
  code?: string | null;
  size?: number;
  /** Tailwind ring color class, e.g. "ring-green-400/40" */
  ring?: string;
};

const isUrl = (s: string) => s.startsWith("http") || s.startsWith("/");

/**
 * Circular national flag. `flag` may be an image URL, an emoji, or null.
 * Falls back to the 3-letter code, then a "?" placeholder.
 */
export function FlagCircle({ flag, code, size = 64, ring = "ring-white/15" }: FlagCircleProps) {
  const dim = { width: size, height: size };

  const base =
    `relative shrink-0 rounded-full overflow-hidden grid place-items-center ` +
    `ring-2 ${ring} bg-white/5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.8)]`;

  if (flag && isUrl(flag)) {
    return (
      <span className={base} style={dim}>
        {/* eslint-disable-next-line @next/next/no-img-element -- flag may be an arbitrary external URL */}
        <img src={flag} alt={code ?? "flag"} className="w-full h-full object-cover" />
      </span>
    );
  }

  if (flag) {
    return (
      <span className={base} style={dim}>
        <span style={{ fontSize: size * 0.62, lineHeight: 1 }}>{flag}</span>
      </span>
    );
  }

  return (
    <span className={base} style={dim}>
      <span
        className="font-display font-bold text-slate-300"
        style={{ fontSize: size * 0.3 }}
      >
        {code ?? "?"}
      </span>
    </span>
  );
}
