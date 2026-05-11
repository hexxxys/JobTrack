"use client"

import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import clsx from "clsx"
import type { Company, CompanyEvent, Status } from "@/types"
import CompanyCard from "./CompanyCard"

type Props = {
  status: Status
  companies: Company[]
  upcomingEvents: CompanyEvent[]
  onAddCard: (statusId: string) => void
  onCardClick: (company: Company) => void
  compactCards?: boolean
}

export default function KanbanColumn({
  status,
  companies,
  upcomingEvents,
  onAddCard,
  onCardClick,
  compactCards = false,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })

  // 各企業の直近イベントを company_id でマップ
  const nearestEventMap = upcomingEvents.reduce<Record<string, CompanyEvent>>((acc, ev) => {
    if (!acc[ev.company_id]) acc[ev.company_id] = ev
    return acc
  }, {})

  return (
    <div className="flex w-[85vw] max-w-80 shrink-0 snap-start flex-col rounded-xl border border-slate-200 bg-slate-50 sm:w-72">
      {/* カラムヘッダー */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-slate-200 bg-slate-50 px-3 py-2.5"
        style={{ borderLeft: `3px solid ${status.color}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: status.color }}
          />
          <span className="text-sm font-semibold text-slate-700">{status.name}</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-500">
            {companies.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(status.id)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          title="企業を追加"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* カード一覧 */}
      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-[140px] flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors",
          isOver ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "bg-slate-50"
        )}
      >
        {companies.length === 0 && (
          <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 text-center text-xs text-slate-400">
            {isOver ? "ここにドロップして移動" : "カードがありません"}
          </div>
        )}
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            nearestEvent={nearestEventMap[company.id]}
            onClick={() => onCardClick(company)}
            compact={compactCards}
          />
        ))}
      </div>
    </div>
  )
}
