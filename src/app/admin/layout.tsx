import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { ArrowLeft, LogOut } from "lucide-react";

function ShieldIcon() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden>
      <path d="M8.5 1L1 4.2V10.6C1 14.8 4.3 18.4 8.5 19C12.7 18.4 16 14.8 16 10.6V4.2L8.5 1Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="8.5" cy="10.2" r="2.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 7.4V10.2M8.5 10.2L6.2 11.8M8.5 10.2L10.8 11.8"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="bg-[#070b16] text-white md:w-60 md:min-h-screen md:flex md:flex-col relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-500/[0.08] to-transparent pointer-events-none" />

        {/* Brand + acciones rápidas (acciones visibles en móvil) */}
        <div className="relative p-3 md:p-4 flex items-center justify-between gap-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30 halo-gold shrink-0 text-amber-400">
              <ShieldIcon />
            </span>
            <div className="leading-none">
              <p className="font-display font-extrabold text-sm tracking-tight">
                LIGA<span className="text-gradient-brand">MX</span>
              </p>
              <p className="text-[11px] text-amber-400/60 font-semibold mt-0.5 tracking-[0.12em] uppercase">Panel Admin</p>
            </div>
          </div>
          {/* Solo móvil: ver sitio + salir */}
          <div className="flex items-center gap-1 md:hidden">
            <Link href="/" aria-label="Ver sitio" className="grid place-items-center w-9 h-9 rounded-lg text-slate-300 hover:bg-white/[0.06]">
              <ArrowLeft size={18} />
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" aria-label="Salir" className="grid place-items-center w-9 h-9 rounded-lg text-slate-300 hover:bg-white/[0.06]">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>

        <AdminNav />

        {/* Solo escritorio: ver sitio + salir abajo */}
        <div className="relative hidden md:block p-3 border-t border-white/[0.06] space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft size={16} /> Ver sitio
          </Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <LogOut size={16} /> Salir
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
