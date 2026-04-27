"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"
import { CheckCircle2, XCircle, Loader2, CalendarPlus } from "lucide-react"

type CheckResult = {
  has_google_access_token: boolean
  token_preview: string | null
  calendar_api_test: "ok" | "failed" | null
  error: string | null
}

type SyncResult = {
  synced: number
  skipped: number
  error: string | null
}

export default function CalendarDiagPanel() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken ?? ""

  const [checking, setChecking] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  async function handleCheck() {
    setChecking(true)
    setCheckResult(null)
    setSyncResult(null)
    try {
      const res = await createApi(token).get<CheckResult>("/api/calendar/check")
      setCheckResult(res)
    } catch (e) {
      setCheckResult({
        has_google_access_token: false,
        token_preview: null,
        calendar_api_test: "failed",
        error: e instanceof Error ? e.message : "通信エラー",
      })
    } finally {
      setChecking(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await createApi(token).post<SyncResult>("/api/calendar/sync-all", {})
      setSyncResult(res)
    } catch (e) {
      setSyncResult({ synced: 0, skipped: 0, error: e instanceof Error ? e.message : "通信エラー" })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <CalendarPlus size={16} className="text-blue-500" />
        <span className="text-sm font-semibold text-slate-800">Google カレンダー同期</span>
      </div>

      <div className="space-y-3 p-4">
        {/* Step1: 接続確認 */}
        <div>
          <p className="mb-2 text-xs text-slate-500">① まず接続状態を確認してください</p>
          <button
            onClick={handleCheck}
            disabled={checking || !token}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {checking ? <Loader2 size={12} className="animate-spin" /> : null}
            {checking ? "確認中..." : "接続確認"}
          </button>

          {checkResult && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs">
              <Row
                label="Googleトークン"
                ok={checkResult.has_google_access_token}
                okText={`あり（${checkResult.token_preview}）`}
                ngText="なし → ログアウトして再ログインしてください"
              />
              <Row
                label="Calendar API 疎通"
                ok={checkResult.calendar_api_test === "ok"}
                okText="成功"
                ngText={checkResult.error ?? "失敗"}
              />
            </div>
          )}
        </div>

        {/* Step2: 一括同期 */}
        <div>
          <p className="mb-2 text-xs text-slate-500">② 接続確認が「成功」なら一括同期を実行</p>
          <button
            onClick={handleSync}
            disabled={syncing || !token || checkResult?.calendar_api_test !== "ok"}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <CalendarPlus size={12} />}
            {syncing ? "同期中..." : "カレンダーに一括同期"}
          </button>

          {syncResult && (
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs">
              {syncResult.error ? (
                <p className="text-red-600">エラー: {syncResult.error}</p>
              ) : (
                <p className="text-green-700">
                  ✓ {syncResult.synced} 件同期完了（スキップ: {syncResult.skipped} 件）
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Row({
  label,
  ok,
  okText,
  ngText,
}: {
  label: string
  ok: boolean
  okText: string
  ngText: string
}) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-500" />
      ) : (
        <XCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
      )}
      <span className="font-medium text-slate-700">{label}:</span>
      <span className={ok ? "text-green-700" : "text-red-600"}>{ok ? okText : ngText}</span>
    </div>
  )
}
