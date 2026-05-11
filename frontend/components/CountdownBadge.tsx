"use client"

import { useEffect, useState } from "react"
import { differenceInCalendarDays, differenceInHours, isPast } from "date-fns"
import clsx from "clsx"

type Props = {
  scheduledAt: string
  label: string
  compact?: boolean
}

export default function CountdownBadge({ scheduledAt, label, compact = false }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const date = new Date(scheduledAt)
  const overdue = isPast(date)
  const daysLeft = differenceInCalendarDays(date, now)
  const hoursLeft = differenceInHours(date, now)

  const { bg, text, dot } = overdue
    ? { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" }
    : daysLeft <= 1
    ? { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" }
    : daysLeft <= 3
    ? { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" }
    : { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" }

  const countText = overdue
    ? "期限切れ"
    : hoursLeft < 24
    ? `あと${hoursLeft}時間`
    : `あと${daysLeft}日`

  if (compact) {
    return (
      <span className={clsx("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", bg, text)}>
        {countText}
      </span>
    )
  }

  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", bg, text)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
      {label}・{countText}
    </span>
  )
}
