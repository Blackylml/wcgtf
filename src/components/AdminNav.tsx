"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Flag, LayoutGrid, CalendarDays, Trophy, Star, CreditCard, Users, DollarSign, ListChecks,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/picks", label: "Picks", icon: ListChecks },
  { href: "/admin/precios", label: "Precios", icon: DollarSign },
  { href: "/admin/equipos", label: "Equipos", icon: Flag },
  { href: "/admin/grupos", label: "Grupos", icon: LayoutGrid },
  { href: "/admin/partidos", label: "Partidos", icon: CalendarDays },
  { href: "/admin/bracket", label: "Bracket", icon: Trophy },
  { href: "/admin/especiales", label: "Especiales", icon: Star },
  { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 p-2 md:p-3 md:flex-1 overflow-x-auto md:overflow-visible no-scrollbar">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`group shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-green-400/10 text-green-300 ring-1 ring-green-400/25"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2.3 : 1.9} className={active ? "text-green-400" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
