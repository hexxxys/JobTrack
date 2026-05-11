export type Status = {
  id: string
  name: string
  color: string
  position: number
  is_default: boolean
  is_archive: boolean
  created_at: string
  updated_at: string
}

export type Company = {
  id: string
  status_id: string
  name: string
  industry: string | null
  priority: number
  notes: string | null
  url: string | null
  login_id: string | null
  created_at: string
  updated_at: string
}

export type EventType =
  | "es_deadline"
  | "interview_1st"
  | "interview_2nd"
  | "interview_final"
  | "briefing"
  | "offer"
  | "other"

export type CompanyEvent = {
  id: string
  company_id: string
  type: EventType
  title: string
  scheduled_at: string
  notes: string | null
  google_event_id: string | null
  calendar_sync_error?: string | null
  created_at: string
  updated_at: string
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  es_deadline: "ES締切",
  interview_1st: "一次面接",
  interview_2nd: "二次面接",
  interview_final: "最終面接",
  briefing: "説明会",
  offer: "内定",
  other: "その他",
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: "最高",
  2: "高",
  3: "中",
  4: "低",
  5: "最低",
}

export const PRIORITY_COLORS: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-yellow-500",
  4: "text-green-500",
  5: "text-slate-400",
}
