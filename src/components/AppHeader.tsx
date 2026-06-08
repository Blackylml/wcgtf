import { auth, signOut } from "@/auth";
import Link from "next/link";
import { LogOut, Trophy } from "lucide-react";

export async function AppHeader() {
  const session = await auth();
  const name = session?.user?.name ?? "";
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070b16]/80 backdrop-blur-xl">
      {/* hairline neon accent along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-green-400/40 to-transparent" />

      <div className="relative max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-green-400/10 ring-1 ring-green-400/30 halo-green">
            <Trophy size={18} className="text-green-400" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display font-extrabold text-[17px] tracking-tight text-white">
              WCGTF <span className="text-gradient-brand">2026</span>
            </span>
            <span className="mt-1 h-0.5 w-7 rounded-full bg-gradient-to-r from-green-400 to-green-400/0 transition-all duration-300 group-hover:w-12" />
          </span>
        </Link>

        {/* User cluster */}
        <div className="flex items-center gap-2.5">
          {name && (
            <span className="text-slate-300 text-sm font-medium truncate max-w-[120px] sm:max-w-[160px]">
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
              className="grid place-items-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
