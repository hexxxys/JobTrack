"use client"

import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import type { SyncNotice } from "@/hooks/useAppSettings"
import { useAppSettings } from "@/hooks/useAppSettings"

export default function SettingsForm() {
  const {
    settings,
    updateSettings,
    resetSettings,
    retrySync,
    ready,
    isSaving,
    lastSyncError,
    syncNotice,
    clearSyncNotice,
  } = useAppSettings()
  const [visibleToast, setVisibleToast] = useState<SyncNotice | null>(null)

  useEffect(() => {
    if (!syncNotice) return
    setVisibleToast(syncNotice)
    const timer = window.setTimeout(() => {
      setVisibleToast(null)
      clearSyncNotice()
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [syncNotice, clearSyncNotice])

  if (!ready) {
    return <p className="text-sm text-slate-400">設定を読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">カンバン表示設定</h2>
        <div className="mt-3 space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">アーカイブ列（不合格・辞退）を表示する</span>
            <input
              type="checkbox"
              checked={settings.showArchivedStatuses}
              onChange={(e) => updateSettings({ showArchivedStatuses: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">カード表示をコンパクトにする</span>
            <input
              type="checkbox"
              checked={settings.compactCards}
              onChange={(e) => updateSettings({ compactCards: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">自動更新設定</h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">直近予定の更新間隔</span>
          <select
            value={settings.upcomingRefreshMinutes}
            onChange={(e) =>
              updateSettings({ upcomingRefreshMinutes: Number(e.target.value) as 1 | 5 | 10 })
            }
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value={1}>1分</option>
            <option value={5}>5分</option>
            <option value={10}>10分</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Google カレンダー同期</h2>
        <label className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">イベント作成/更新時にカレンダーへ同期する</span>
          <input
            type="checkbox"
            checked={settings.calendarSyncEnabled}
            onChange={(e) => updateSettings({ calendarSyncEnabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          OFF の場合、アプリ内イベントのみ登録され、Google カレンダーには送信しません。
        </p>
      </section>

      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          {isSaving && <span className="text-xs text-slate-500">保存中...</span>}
          {!isSaving && !lastSyncError && (
            <span className="text-xs text-emerald-600">サーバーに保存済み</span>
          )}
          {!isSaving && lastSyncError && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">{lastSyncError}</span>
              <button
                onClick={retrySync}
                className="rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
              >
                再試行
              </button>
            </div>
          )}
          <button
            onClick={resetSettings}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            設定を初期化
          </button>
        </div>
      </div>

      {visibleToast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-lg px-3 py-2 text-xs shadow-lg ${
              visibleToast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {visibleToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
