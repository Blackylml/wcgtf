import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { Trophy, ArrowLeft, LogOut } from "lucide-react";

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
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-green-500/[0.08] to-transparent pointer-events-none" />

        {/* Brand + acciones rápidas (acciones visibles en móvil) */}
        <div className="relative p-3 md:p-4 flex items-center justify-between gap-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-400/10 ring-1 ring-green-400/30 halo-green shrink-0">
              <Trophy size={18} className="text-green-400" strokeWidth={2} />
            </span>
            <div className="leading-none">
              <p className="font-display font-extrabold text-sm tracking-tight">
                WCGTF <span className="text-gradient-brand">2026</span>
              </p>
              <p className="text-[11px] text-amber-300 font-semibold mt-1">Panel Admin</p>
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
