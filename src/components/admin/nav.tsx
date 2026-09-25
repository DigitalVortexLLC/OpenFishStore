"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/tanks", label: "Tanks & water", icon: "🧪" },
  { href: "/admin/livestock", label: "Livestock", icon: "🐟" },
  { href: "/admin/species", label: "Species catalog", icon: "📚" },
  { href: "/admin/tasks", label: "Tasks", icon: "✅" },
  { href: "/admin/special-orders", label: "Special orders", icon: "📦" },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const links = isOwner ? [...LINKS, { href: "/admin/staff", label: "Staff", icon: "👥" }] : LINKS;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {links.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
              active ? "bg-ocean-800 font-medium text-white" : "text-ocean-100 hover:bg-ocean-900"
            }`}
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
