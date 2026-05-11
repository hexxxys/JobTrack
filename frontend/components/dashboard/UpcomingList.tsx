"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { CalendarClock } from "lucide-react"
import type { CompanyEvent } from "@/types"
import { EVENT_TYPE_LABELS } from "@/types"
import CountdownBadge from "@/components/CountdownBadge"
import { useUpcomingEvents } from "@/hooks/useEvents"
import { useCompanies } from "@/hooks/useCompanies"
import { useAppSettings } from "@/hooks/useAppSettings"

export default function UpcomingList() {
  const { refreshIntervalMs, ready } = useAppSettings()
  const { data: events = [], isLoading } = useUpcomingEvents(refreshIntervalMs)
  const { data: companies = [] } = useCompanies()

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]))

  if (!ready || isLoading) {
    return <div className="text-sm text-slate-400 text-center py-8">読み込み中...</div>
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <CalendarClock size={36} className="mb-2 opacity-40" />
        <p className="text-sm">今後の予定はありません</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {events.map((ev) => (
        <li key={ev.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {companyMap[ev.company_id] ?? "—"}
            </p>
            <p className="text-xs text-slate-500">
              {EVENT_TYPE_LABELS[ev.type]}・{format(new Date(ev.scheduled_at), "M月d日(E) HH:mm", { locale: ja })}
            </p>
          </div>
          <div className="shrink-0">
            <CountdownBadge scheduledAt={ev.scheduled_at} label={EVENT_TYPE_LABELS[ev.type]} />
          </div>
        </li>
      ))}
    </ul>
  )
}
