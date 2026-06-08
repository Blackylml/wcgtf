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
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-[#070b16] text-white flex flex-col relative">
        {/* ambient glow */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-green-500/[0.08] to-transparent pointer-events-none" />

        <div className="relative p-4 flex items-center gap-2.5 border-b border-white/[0.06]">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-green-400/10 ring-1 ring-green-400/30 halo-green">
            <Trophy size={18} className="text-green-400" strokeWidth={2} />
          </span>
          <div className="leading-none">
            <p className="font-display font-extrabold text-sm tracking-tight">
              WCGTF <span className="text-gradient-brand">2026</span>
            </p>
            <p className="text-[11px] text-amber-300 font-semibold mt-1">Panel Admin</p>
          </div>
        </div>

        <AdminNav />

        <div className="relative p-3 border-t border-white/[0.06] space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft size={16} /> Ver sitio
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <LogOut size={16} /> Salir
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
