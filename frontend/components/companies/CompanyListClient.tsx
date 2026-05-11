"use client"

import { useState } from "react"
import { useCompanies } from "@/hooks/useCompanies"
import { useStatuses } from "@/hooks/useStatuses"
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/types"
import type { Company } from "@/types"
import { Check, Copy, ExternalLink, Search } from "lucide-react"
import clsx from "clsx"

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex shrink-0 items-center rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      title="コピー"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  )
}

export default function CompanyListClient() {
  const { data: companies = [], isLoading } = useCompanies()
  const { data: statuses = [] } = useStatuses()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "has_url" | "has_login" | "missing">("all")

  const statusMap = Object.fromEntries(statuses.map((s) => [s.id, s]))

  const filtered = companies
    .filter((c) => {
      const q = search.toLowerCase()
      if (q && !c.name.toLowerCase().includes(q)) return false
      if (filter === "has_url") return !!c.url
      if (filter === "has_login") return !!c.login_id
      if (filter === "missing") return !c.url || !c.login_id
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-slate-400">読み込み中...</p>
  }

  return (
    <div className="space-y-3">
      {/* 検索・フィルター */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="企業名で検索..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "has_url", "has_login", "missing"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {{ all: "すべて", has_url: "URL あり", has_login: "ID あり", missing: "未設定あり" }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <th className="px-4 py-3 text-left font-medium">企業名</th>
              <th className="px-4 py-3 text-left font-medium">ステータス</th>
              <th className="px-4 py-3 text-left font-medium">志望度</th>
              <th className="px-4 py-3 text-left font-medium">マイページURL</th>
              <th className="px-4 py-3 text-left font-medium">ログインID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  該当する企業がありません
                </td>
              </tr>
            )}
            {filtered.map((company) => (
              <CompanyRow key={company.id} company={company} statusName={statusMap[company.status_id]?.name ?? "-"} statusColor={statusMap[company.status_id]?.color} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-right text-xs text-slate-400">{filtered.length} 件表示 / 全 {companies.length} 件</p>
    </div>
  )
}

function CompanyRow({
  company,
  statusName,
  statusColor,
}: {
  company: Company
  statusName: string
  statusColor?: string
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-800">{company.name}</td>

      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: statusColor ? `${statusColor}18` : undefined, color: statusColor }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: statusColor }}
          />
          {statusName}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className={clsx("text-xs font-medium", PRIORITY_COLORS[company.priority])}>
          {PRIORITY_LABELS[company.priority]}
        </span>
      </td>

      <td className="px-4 py-3">
        {company.url ? (
          <div className="flex items-center gap-1 max-w-xs">
            <a
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-blue-600 hover:underline"
              title={company.url}
            >
              {company.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
            <a
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-slate-400 hover:text-blue-500"
            >
              <ExternalLink size={11} />
            </a>
            <CopyButton value={company.url} />
          </div>
        ) : (
          <span className="text-xs text-slate-300">未設定</span>
        )}
      </td>

      <td className="px-4 py-3">
        {company.login_id ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-700">{company.login_id}</span>
            <CopyButton value={company.login_id} />
          </div>
        ) : (
          <span className="text-xs text-slate-300">未設定</span>
        )}
      </td>
    </tr>
  )
}
