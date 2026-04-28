"use client"

import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { CalendarClock, CalendarPlus, GripVertical, Loader2, Mail, Plus, X } from "lucide-react"
import type { Company } from "@/types"
import { useStatuses } from "@/hooks/useStatuses"
import { useCompanies, useUpdateCompanyStatus } from "@/hooks/useCompanies"
import { useSyncAllEvents, useUpcomingEvents } from "@/hooks/useEvents"
import { useAppSettings } from "@/hooks/useAppSettings"
import KanbanColumn from "./KanbanColumn"
import CompanyCard from "./CompanyCard"
import CompanyFormModal from "./CompanyFormModal"
import MailImportPanel from "@/components/settings/MailImportPanel"
import EventsPanel from "./EventsPanel"

export default function KanbanBoard() {
  const { settings, refreshIntervalMs, ready } = useAppSettings()
  const { data: statuses = [], isLoading: statusLoading } = useStatuses()
  const { data: companies = [], isLoading: companyLoading } = useCompanies()
  const { data: upcomingEvents = [] } = useUpcomingEvents(refreshIntervalMs)
  const { mutate: updateStatus } = useUpdateCompanyStatus()

  const [draggingCompany, setDraggingCompany] = useState<Company | null>(null)
  const [modalState, setModalState] = useState<{
    open: boolean
    company?: Company | null
    defaultStatusId?: string
  }>({ open: false })
  const [mailPanelOpen, setMailPanelOpen] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const { mutate: syncAll, isPending: syncing } = useSyncAllEvents()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingCompany(companies.find((c) => c.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingCompany(null)
    if (!over) return
    const company = companies.find((c) => c.id === active.id)
    if (!company || company.status_id === over.id) return
    updateStatus({ id: company.id, status_id: over.id as string })
  }

  function openAdd(statusId: string) {
    setModalState({ open: true, company: null, defaultStatusId: statusId })
  }

  function openEdit(company: Company) {
    setModalState({ open: true, company })
  }

  const visibleStatuses = settings.showArchivedStatuses
    ? statuses
    : statuses.filter((s) => !s.is_archive)

  const activeCompanies = companies.filter((c) => {
    const status = visibleStatuses.find((s) => s.id === c.status_id)
    return !status?.is_archive
  }).length

  const firstStatusId = visibleStatuses[0]?.id

  if (statusLoading || companyLoading || !ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    )
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-800">カンバンボード</h1>
              <p className="mt-0.5 text-xs text-slate-500">カードをドラッグして選考ステータスを更新できます。</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  syncAll(undefined, {
                    onSuccess: (res) => {
                      setSyncMsg(
                        res.error
                          ? `同期エラー: ${res.error}`
                          : `✓ ${res.synced}件を同期しました（スキップ: ${res.skipped}件）`
                      )
                      setTimeout(() => setSyncMsg(null), 4000)
                    },
                  })
                }
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                {syncing ? "同期中..." : "カレンダー同期"}
              </button>
              <button
                onClick={() => setMailPanelOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Mail size={14} />
                メールから取り込む
              </button>
              <button
                onClick={() => firstStatusId && openAdd(firstStatusId)}
                disabled={!firstStatusId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus size={14} />
                企業を追加
              </button>
            </div>
          </div>

          {syncMsg && (
            <p className={`mt-2 text-xs font-medium ${syncMsg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
              {syncMsg}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
              <GripVertical size={12} />
              進行中 {activeCompanies} 社
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
              全体 {companies.length} 社
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
              <CalendarClock size={12} />
              直近予定 {upcomingEvents.length} 件
            </span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 gap-3 p-4 pb-8">
          {/* カンバン列（横スクロール） */}
          <div className="flex flex-1 min-h-0 items-start gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory">
            {visibleStatuses.map((status) => (
              <KanbanColumn
                key={status.id}
                status={status}
                companies={companies.filter((c) => c.status_id === status.id)}
                upcomingEvents={upcomingEvents}
                onAddCard={openAdd}
                onCardClick={openEdit}
                compactCards={settings.compactCards}
              />
            ))}
          </div>

          {/* イベント一覧パネル */}
          <EventsPanel events={upcomingEvents} companies={companies} />
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingCompany && (
            <CompanyCard
              company={draggingCompany}
              nearestEvent={upcomingEvents.find((e) => e.company_id === draggingCompany.id)}
              isDragging
              compact={settings.compactCards}
            />
          )}
        </DragOverlay>
      </DndContext>

      {modalState.open && (
        <CompanyFormModal
          statuses={statuses}
          defaultStatusId={modalState.defaultStatusId}
          company={modalState.company}
          onClose={() => setModalState({ open: false })}
        />
      )}

      {mailPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 p-4 pt-16"
          onClick={(e) => { if (e.target === e.currentTarget) setMailPanelOpen(false) }}
        >
          <div className="w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-800 px-4 py-2.5">
              <span className="text-sm font-semibold text-white">メールから取り込む</span>
              <button
                onClick={() => setMailPanelOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <MailImportPanel />
          </div>
        </div>
      )}
    </>
  )
}
