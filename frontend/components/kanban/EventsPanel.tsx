"use client"

import { CalendarClock } from "lucide-react"
import { differenceInDays, differenceInHours, format } from "date-fns"
import { ja } from "date-fns/locale"
import type { Company, CompanyEvent } from "@/types"
import { EVENT_TYPE_LABELS } from "@/types"
import clsx from "clsx"

type Props = {
  events: CompanyEvent[]
  companies: Company[]
}

function countdown(scheduledAt: string): { label: string; urgent: boolean } {
  const now = new Date()
  const target = new Date(scheduledAt)
  const days = differenceInDays(target, now)
  const hours = differenceInHours(target, now)

  if (hours < 0) return { label: "期限切れ", urgent: true }
  if (hours < 24) return { label: `残り ${hours}h`, urgent: true }
  if (days <= 3) return { label: `残り ${days}日`, urgent: true }
  return { label: `残り ${days}日`, urgent: false }
}

const EVENT_COLOR: Record<CompanyEvent["type"], string> = {
  es_deadline:     "bg-purple-100 text-purple-700",
  interview_1st:   "bg-blue-100 text-blue-700",
  interview_2nd:   "bg-indigo-100 text-indigo-700",
  interview_final: "bg-red-100 text-red-700",
  briefing:        "bg-green-100 text-green-700",
  offer:           "bg-emerald-100 text-emerald-700",
  other:           "bg-slate-100 text-slate-600",
}

export default function EventsPanel({ events, companies }: Props) {
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]))

  const sorted = [...events].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )

  return (
    <aside className="flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <CalendarClock size={14} className="text-orange-500" />
        <span className="text-xs font-semibold text-slate-700">直近の予定</span>
        <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">
          {sorted.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-400">予定がありません</p>
        )}
        {sorted.map((ev) => {
          const { label, urgent } = countdown(ev.scheduled_at)
          return (
            <div key={ev.id} className="px-3 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-medium", EVENT_COLOR[ev.type])}>
                  {EVENT_TYPE_LABELS[ev.type]}
                </span>
                <span className={clsx("text-[10px] font-semibold", urgent ? "text-red-500" : "text-slate-400")}>
                  {label}
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-medium text-slate-700">
                {companyMap[ev.company_id] ?? "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {format(new Date(ev.scheduled_at), "M/d(E) HH:mm", { locale: ja })}
              </p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
