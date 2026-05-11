"use client"

import { useSummary } from "@/hooks/useDashboard"
import StatsCard from "./StatsCard"

export default function SummaryCards() {
  const { data, isLoading } = useSummary()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatsCard
        label="エントリー中"
        value={data?.active_companies ?? 0}
        sub={`合計 ${data?.total_companies ?? 0} 社`}
        color="text-blue-600"
      />
      <StatsCard
        label="今週の面接"
        value={data?.interviews_this_week ?? 0}
        sub="件"
        color="text-orange-500"
      />
      <StatsCard
        label="内定"
        value={data?.offers ?? 0}
        sub="社"
        color="text-green-600"
      />
      <StatsCard
        label="今後の予定"
        value={data?.upcoming_events_count ?? 0}
        sub="件"
        color="text-purple-600"
      />
    </div>
  )
}
