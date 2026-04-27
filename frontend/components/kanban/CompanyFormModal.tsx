"use client"

import { useEffect, useRef, useState } from "react"
import { X, Plus, Trash2, Pencil, ImageUp, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { recognize } from "tesseract.js"
import { useSession } from "next-auth/react"
import type { Company, CompanyEvent, Status } from "@/types"
import { EVENT_TYPE_LABELS } from "@/types"
import { useCreateCompany, useUpdateCompany, useDeleteCompany } from "@/hooks/useCompanies"
import { useCompanyEvents, useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/hooks/useEvents"
import CountdownBadge from "@/components/CountdownBadge"
import { createApi } from "@/lib/api"

type Props = {
  statuses: Status[]
  defaultStatusId?: string
  company?: Company | null
  onClose: () => void
}

type DeadlineCandidate = {
  iso: string
  matched: string
  confidence: number
}

function parseCompanyInfoFromText(text: string) {
  const normalized = text.replace(/\r/g, "")
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const urlMatch = normalized.match(/https?:\/\/[^\s)]+/i)
  const url = urlMatch?.[0] ?? ""

  const companyLine = lines.find((line) =>
    /(株式会社|有限会社|合同会社|Inc\.?|Corporation|Corp\.?|Company)/i.test(line)
  )
  const fallbackName = lines.find((line) => line.length >= 2 && line.length <= 40 && !line.includes("@"))
  const name = companyLine ?? fallbackName ?? ""

  const industryKeywords = [
    "IT",
    "ソフトウェア",
    "金融",
    "コンサル",
    "メーカー",
    "商社",
    "広告",
    "人材",
    "不動産",
    "インフラ",
    "通信",
    "Web",
    "SaaS",
  ]
  const industry = industryKeywords.find((k) => normalized.toLowerCase().includes(k.toLowerCase())) ?? ""

  const notes = lines.slice(0, 6).join("\n")
  return { name, industry, url, notes }
}

function parseDeadlinesFromText(text: string): DeadlineCandidate[] {
  const candidates: DeadlineCandidate[] = []
  const unique = new Map<string, DeadlineCandidate>()
  const normalized = text.toLowerCase()
  const now = new Date()

  const buildSafeDate = (year: number, month: number, day: number, hour: number, minute: number) => {
    if (month < 1 || month > 12) return null
    if (day < 1 || day > 31) return null
    if (hour < 0 || hour > 23) return null
    if (minute < 0 || minute > 59) return null
    const dt = new Date(year, month - 1, day, hour, minute)
    // JS Dateの自動補正（例: 13月 -> 翌年1月）を弾く
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day ||
      dt.getHours() !== hour ||
      dt.getMinutes() !== minute
    ) {
      return null
    }
    return dt
  }

  const clamp = (v: number) => Math.max(0, Math.min(0.99, v))
  const contextScore = (index: number, matched: string, base: number, dt: Date) => {
    const start = Math.max(0, index - 24)
    const end = Math.min(text.length, index + matched.length + 24)
    const ctx = normalized.slice(start, end)
    let score = base
    if (/締切|期限|deadline/.test(ctx)) score += 0.16
    if (/es|エントリーシート/.test(ctx)) score += 0.08
    if (/[0-2]?\d[:時][0-5]\d/.test(matched)) score += 0.05
    // 実運用上の締切らしさ: 2年前より古い / 2年以上未来は減点
    const diffDays = (dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < -730) score -= 0.4
    if (diffDays > 730) score -= 0.25
    return clamp(score)
  }

  for (const ymd of text.matchAll(/(20\d{2})[/-](\d{1,2})[/-](\d{1,2})(?:\s*(\d{1,2}):(\d{2}))?/g)) {
    const dt = buildSafeDate(
      Number(ymd[1]),
      Number(ymd[2]),
      Number(ymd[3]),
      ymd[4] ? Number(ymd[4]) : 23,
      ymd[5] ? Number(ymd[5]) : 59
    )
    if (!dt) continue
    const iso = dt.toISOString()
    const key = `${iso}-${ymd[0]}`
    const confidence = contextScore(ymd.index ?? 0, ymd[0], 0.72, dt)
    const prev = unique.get(key)
    if (!prev || prev.confidence < confidence) {
      unique.set(key, { iso, matched: ymd[0], confidence })
    }
  }

  for (const jp of text.matchAll(/(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2})[:時](\d{2})?)?/g)) {
    let year = now.getFullYear()
    const month = Number(jp[1])
    const day = Number(jp[2])
    const hour = jp[3] ? Number(jp[3]) : 23
    const minute = jp[4] ? Number(jp[4]) : 59
    let dt = buildSafeDate(year, month, day, hour, minute)
    if (!dt) continue
    if (dt.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      year += 1
      const nextYear = buildSafeDate(year, month, day, hour, minute)
      if (!nextYear) continue
      dt = nextYear
    }
    const iso = dt.toISOString()
    const key = `${iso}-${jp[0]}`
    const confidence = contextScore(jp.index ?? 0, jp[0], 0.62, dt)
    const prev = unique.get(key)
    if (!prev || prev.confidence < confidence) {
      unique.set(key, { iso, matched: jp[0], confidence })
    }
  }

  candidates.push(...unique.values())
  return candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    return new Date(a.iso).getTime() - new Date(b.iso).getTime()
  })
}

export default function CompanyFormModal({ statuses, defaultStatusId, company, onClose }: Props) {
  const isEdit = !!company
  const { data: session } = useSession()
  const { mutateAsync: create, isPending: creating } = useCreateCompany()
  const { mutateAsync: update, isPending: updating } = useUpdateCompany()
  const { mutateAsync: deleteCompany } = useDeleteCompany()
  const { data: events = [] } = useCompanyEvents(company?.id ?? null)
  const { mutateAsync: createEvent } = useCreateEvent(company?.id ?? "")
  const { mutateAsync: updateEvent } = useUpdateEvent()
  const { mutateAsync: deleteEvent } = useDeleteEvent()
  const [editingEvent, setEditingEvent] = useState<{ id: string; type: CompanyEvent["type"]; title: string; scheduled_at: string; notes: string } | null>(null)

  const [form, setForm] = useState({
    name: company?.name ?? "",
    industry: company?.industry ?? "",
    priority: company?.priority ?? 3,
    status_id: company?.status_id ?? defaultStatusId ?? statuses[0]?.id ?? "",
    url: company?.url ?? "",
    login_id: company?.login_id ?? "",
    notes: company?.notes ?? "",
  })

  const [newEvent, setNewEvent] = useState({
    type: "es_deadline" as CompanyEvent["type"],
    title: "",
    scheduled_at: "",
    notes: "",
  })
  const [stageSchedule, setStageSchedule] = useState({
    type: "es_deadline" as CompanyEvent["type"],
    scheduled_at: "",
    notes: "",
  })

  // 編集時：既存イベントの値を stageSchedule に初期セット
  useEffect(() => {
    if (!isEdit || events.length === 0) return
    const latest = [...events].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    )[0]
    setStageSchedule({
      type: latest.type,
      scheduled_at: toDatetimeLocal(latest.scheduled_at),
      notes: latest.notes ?? "",
    })
  }, [isEdit, events.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showEventForm, setShowEventForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrDeadlineCandidates, setOcrDeadlineCandidates] = useState<DeadlineCandidate[]>([])
  const [selectedDeadlineIndex, setSelectedDeadlineIndex] = useState(0)
  const [autoCreateDeadlineEvent, setAutoCreateDeadlineEvent] = useState(true)
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = { ...form, url: form.url || null, industry: form.industry || null, notes: form.notes || null, login_id: form.login_id || null }
    let targetCompanyId: string | null = null
    let latestCalendarSyncError: string | null = null

    if (isEdit) {
      await update({ id: company.id, ...body })
      targetCompanyId = company.id
    } else {
      const created = await create(body)
      targetCompanyId = created.id
      const selectedDeadline = ocrDeadlineCandidates[selectedDeadlineIndex]
      if (autoCreateDeadlineEvent && selectedDeadline && session?.accessToken) {
        const title = `${created.name} ES締切`
        const noteLines = [
          `OCR抽出値: ${selectedDeadline.matched}`,
          `OCR信頼度: ${Math.round(selectedDeadline.confidence * 100)}%`,
        ]
        if (form.notes) noteLines.push("", form.notes)
        const eventRes = await createApi(session.accessToken).post<CompanyEvent>(
          `/api/companies/${created.id}/events`,
          {
            type: "es_deadline",
            title,
            scheduled_at: selectedDeadline.iso,
            notes: noteLines.join("\n"),
          }
        )
        latestCalendarSyncError = eventRes.calendar_sync_error ?? null
        setCalendarSyncError(latestCalendarSyncError)
      }
    }

    if (targetCompanyId && stageSchedule.scheduled_at && session?.accessToken) {
      const eventRes = await createApi(session.accessToken).post<CompanyEvent>(
        `/api/companies/${targetCompanyId}/events`,
        {
          type: stageSchedule.type,
          title: `${form.name} ${EVENT_TYPE_LABELS[stageSchedule.type]}`,
          scheduled_at: stageSchedule.scheduled_at,
          notes: stageSchedule.notes || null,
        }
      )
      latestCalendarSyncError = eventRes.calendar_sync_error ?? null
      setCalendarSyncError(latestCalendarSyncError)
    }

    if (latestCalendarSyncError) {
      window.alert(latestCalendarSyncError)
    }
    onClose()
  }

  async function handleDelete() {
    if (!company) return
    await deleteCompany(company.id)
    onClose()
  }

  function toDatetimeLocal(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function startEditEvent(ev: CompanyEvent) {
    setEditingEvent({
      id: ev.id,
      type: ev.type,
      title: ev.title,
      scheduled_at: toDatetimeLocal(ev.scheduled_at),
      notes: ev.notes ?? "",
    })
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!editingEvent) return
    await updateEvent({
      id: editingEvent.id,
      type: editingEvent.type,
      title: editingEvent.title,
      scheduled_at: editingEvent.scheduled_at,
      notes: editingEvent.notes || null,
    })
    setEditingEvent(null)
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    const eventRes = await createEvent({
      ...newEvent,
      notes: newEvent.notes || null,
    } as Parameters<typeof createEvent>[0])
    setCalendarSyncError(eventRes.calendar_sync_error ?? null)
    setNewEvent({ type: "es_deadline", title: "", scheduled_at: "", notes: "" })
    setShowEventForm(false)
  }

  async function handleOcrImage(file: File) {
    setOcrError(null)
    setOcrLoading(true)
    try {
      const result = await recognize(file, "jpn+eng")
      const text = result.data.text
      const parsed = parseCompanyInfoFromText(result.data.text)
      const deadlines = parseDeadlinesFromText(text)
      setForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        industry: parsed.industry || prev.industry,
        url: parsed.url || prev.url,
        notes: parsed.notes || prev.notes,
      }))
      setOcrDeadlineCandidates(deadlines)
      if (deadlines.length > 0) {
        let bestIdx = 0
        let bestScore = deadlines[0].confidence
        deadlines.forEach((d, i) => {
          if (d.confidence > bestScore) {
            bestScore = d.confidence
            bestIdx = i
          }
        })
        setSelectedDeadlineIndex(bestIdx)
      } else {
        setSelectedDeadlineIndex(0)
      }
    } catch {
      setOcrError("画像の読み取りに失敗しました。文字が見える画像で再度お試しください。")
    } finally {
      setOcrLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? "企業を編集" : "企業を追加"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* 企業フォーム */}
          <form onSubmit={handleSubmit} id="company-form" className="space-y-3 p-5">
            {!isEdit && (
              <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-blue-700">
                    画像（募集要項・メール画面など）から企業情報を読み取って入力できます。
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-60"
                  >
                    {ocrLoading ? <Loader2 size={12} className="animate-spin" /> : <ImageUp size={12} />}
                    {ocrLoading ? "読み取り中..." : "画像を選択"}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleOcrImage(file)
                    e.currentTarget.value = ""
                  }}
                />
                {ocrError && <p className="mt-2 text-xs text-red-600">{ocrError}</p>}
                {ocrDeadlineCandidates.length > 0 && (
                  <div className="mt-2 rounded-md bg-white p-2 text-xs text-slate-700">
                    <p className="mb-1">締切候補を選択してください</p>
                    <div className="space-y-1">
                      {ocrDeadlineCandidates.map((candidate, idx) => (
                        <label key={`${candidate.iso}-${candidate.matched}-${idx}`} className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="ocr-deadline-candidate"
                            checked={selectedDeadlineIndex === idx}
                            onChange={() => setSelectedDeadlineIndex(idx)}
                            className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600"
                          />
                          <span>
                            {new Date(candidate.iso).toLocaleString("ja-JP")}（一致: {candidate.matched}）
                            {" "}・信頼度: {Math.round(candidate.confidence * 100)}%
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      検出数: {ocrDeadlineCandidates.length}
                    </p>
                    <label className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={autoCreateDeadlineEvent}
                        onChange={(e) => setAutoCreateDeadlineEvent(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      保存時にES締切イベントを自動作成
                    </label>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">企業名 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="例：株式会社○○"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">業界</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="">未選択</option>
                  <option value="IT・ソフトウェア">IT・ソフトウェア</option>
                  <option value="Web・インターネット">Web・インターネット</option>
                  <option value="通信・インフラ">通信・インフラ</option>
                  <option value="メーカー（電気・機械）">メーカー（電気・機械）</option>
                  <option value="メーカー（素材・化学）">メーカー（素材・化学）</option>
                  <option value="メーカー（食品・消費財）">メーカー（食品・消費財）</option>
                  <option value="商社">商社</option>
                  <option value="金融（銀行・証券）">金融（銀行・証券）</option>
                  <option value="金融（保険）">金融（保険）</option>
                  <option value="コンサルティング">コンサルティング</option>
                  <option value="広告・マーケティング">広告・マーケティング</option>
                  <option value="マスコミ・出版・放送">マスコミ・出版・放送</option>
                  <option value="不動産・建設">不動産・建設</option>
                  <option value="小売・流通">小売・流通</option>
                  <option value="人材・教育">人材・教育</option>
                  <option value="医療・製薬">医療・製薬</option>
                  <option value="公務員・非営利">公務員・非営利</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                <select
                  value={form.status_id}
                  onChange={(e) => setForm({ ...form, status_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">選考段階の期限・日時</p>
              <p className="mt-1 text-[11px] text-slate-500">
                入力すると保存時に選考イベントとして自動登録されます。
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={stageSchedule.type}
                  onChange={(e) =>
                    setStageSchedule((prev) => ({
                      ...prev,
                      type: e.target.value as CompanyEvent["type"],
                    }))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={stageSchedule.scheduled_at}
                  onChange={(e) =>
                    setStageSchedule((prev) => ({
                      ...prev,
                      scheduled_at: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <textarea
                value={stageSchedule.notes}
                onChange={(e) =>
                  setStageSchedule((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={2}
                className="mt-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="補足メモ（任意）"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">志望度</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, priority: v })}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      form.priority === v
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {["最高", "高", "中", "低", "最低"][v - 1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">マイページURL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ログインID</label>
                <input
                  value={form.login_id}
                  onChange={(e) => setForm({ ...form, login_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="メールアドレスなど"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">メモ</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </form>

          {/* イベントセクション（編集時のみ） */}
          {isEdit && (
            <div className="border-t px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">締切・日程</h3>
                <button
                  onClick={() => setShowEventForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Plus size={12} />追加
                </button>
              </div>

              {/* イベント追加フォーム */}
              {showEventForm && (
                <form onSubmit={handleAddEvent} className="mb-3 space-y-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CompanyEvent["type"] })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                    >
                      {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <input
                      required
                      type="datetime-local"
                      value={newEvent.scheduled_at}
                      onChange={(e) => setNewEvent({ ...newEvent, scheduled_at: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                    />
                  </div>
                  <input
                    required
                    placeholder="タイトル"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      登録
                    </button>
                  </div>
                </form>
              )}

              {/* イベント一覧 */}
              <div className="space-y-2">
                {events.length === 0 && !showEventForm && (
                  <p className="text-xs text-slate-400 text-center py-2">日程が未登録です</p>
                )}
                {events.map((ev) => (
                  <div key={ev.id}>
                    {editingEvent?.id === ev.id ? (
                      /* 編集フォーム */
                      <form onSubmit={handleUpdateEvent} className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={editingEvent.type}
                            onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as CompanyEvent["type"] })}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                          >
                            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <input
                            required
                            type="datetime-local"
                            value={editingEvent.scheduled_at}
                            onChange={(e) => setEditingEvent({ ...editingEvent, scheduled_at: e.target.value })}
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                          />
                        </div>
                        <input
                          required
                          placeholder="タイトル"
                          value={editingEvent.title}
                          onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingEvent(null)} className="text-xs text-slate-500 hover:text-slate-700">キャンセル</button>
                          <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">保存</button>
                        </div>
                      </form>
                    ) : (
                      /* 通常表示 */
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CountdownBadge scheduledAt={ev.scheduled_at} label={EVENT_TYPE_LABELS[ev.type]} />
                          <p className="mt-0.5 text-xs text-slate-500 truncate">
                            {ev.title}・{format(new Date(ev.scheduled_at), "M/d HH:mm")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => startEditEvent(ev)}
                            className="text-slate-300 hover:text-blue-400 transition-colors"
                            title="編集"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteEvent(ev.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="削除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          {isEdit ? (
            showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">「{company!.name}」を削除しますか？</span>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                >
                  削除する
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                削除
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              form="company-form"
              disabled={creating || updating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating || updating ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
        {calendarSyncError && (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-700">
            {calendarSyncError}
          </div>
        )}
      </div>
    </div>
  )
}
