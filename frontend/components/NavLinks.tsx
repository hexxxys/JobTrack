"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KanbanSquare, LayoutDashboard, List, Settings } from "lucide-react"
import clsx from "clsx"

const links = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/kanban",    label: "カンバン",       icon: KanbanSquare },
  { href: "/companies", label: "企業一覧",       icon: List },
  { href: "/settings",  label: "設定",           icon: Settings },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            <Icon size={13} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
