"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Swords, User, ListChecks, Wallet } from "lucide-react";

const NAV = [
  { href: "/",           icon: Home,         label: "Inicio"     },
  { href: "/partidos",   icon: CalendarDays, label: "Quinielas"  },
  { href: "/resultados", icon: ListChecks,   label: "Resultados" },
  { href: "/creditos",   icon: Wallet,       label: "Créditos"   },
  { href: "/duelos",     icon: Swords,       label: "Duelos"     },
  { href: "/dashboard",  icon: User,         label: "Yo"         },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#0c0a07]/87 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex-1 flex flex-col items-center pt-3 pb-2.5 gap-1 transition-colors ${
                active ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {/* active indicator */}
              <span
                className={`absolute top-0 h-0.5 w-9 rounded-full bg-amber-400 transition-opacity ${
                  active ? "opacity-100 shadow-[0_0_10px_rgba(240,165,0,0.8)]" : "opacity-0"
                }`}
              />
              <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
              <span className="text-[10px] font-semibold tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
