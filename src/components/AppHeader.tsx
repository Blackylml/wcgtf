import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LogOut, Wallet } from "lucide-react";

/** Escudo de crest estilo Liga MX — SVG inline para evitar dependencia de icono */
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden className={className}>
      <path
        d="M8.5 1L1 4.2V10.6C1 14.8 4.3 18.4 8.5 19C12.7 18.4 16 14.8 16 10.6V4.2L8.5 1Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10.2" r="2.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 7.4V10.2M8.5 10.2L6.2 11.8M8.5 10.2L10.8 11.8"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export async function AppHeader() {
  const session = await auth();
  const userId = session?.user?.id;
  const name = session?.user?.name ?? "";
  const isAdmin = session?.user?.role === "ADMIN";

  // Saldo de créditos del usuario (null si no autenticado)
  const credits = userId
    ? Number((await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits ?? 0)
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0c0a07]/82 backdrop-blur-xl">
      {/* hairline dorada a lo largo del borde inferior */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />

      <div className="relative max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* ── Marca ── */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30 halo-gold transition-all group-hover:bg-amber-400/15">
            <ShieldIcon className="text-amber-400" />
          </span>
          <span className="flex flex-col leading-none gap-0.5">
            <span className="font-display font-extrabold text-[17px] tracking-tight text-white leading-none">
              LIGA<span className="text-gradient-brand">MX</span>
            </span>
            <span className="text-[9.5px] font-bold tracking-[0.18em] text-amber-400/60 leading-none uppercase">
              Fantasy
            </span>
          </span>
        </Link>

        {/* ── Cluster de usuario ── */}
        <div className="flex items-center gap-2">

          {/* Saldo de créditos */}
          {credits > 0 && (
            <Link
              href="/creditos"
              className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 rounded-full hover:bg-amber-400/[0.14] transition-colors"
            >
              <Wallet size={11} />
              ${credits % 1 === 0 ? credits : credits.toFixed(2)}
            </Link>
          )}

          {name && (
            <span className="text-slate-300 text-sm font-medium truncate max-w-[100px] sm:max-w-[150px]">
              {name}
            </span>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="text-[10px] font-bold tracking-wide text-amber-300 border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 rounded-full hover:bg-amber-400/20 transition-colors"
            >
              ADMIN
            </Link>
          )}

          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="grid place-items-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
