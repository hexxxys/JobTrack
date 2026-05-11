"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"
import type { CompanyEvent } from "@/types"

type EventCreate = Pick<CompanyEvent, "type" | "title" | "scheduled_at" | "notes">

function useToken() {
  const { data: session } = useSession()
  return session?.accessToken ?? ""
}

/** ユーザーの今後のイベントをすべて取得（カンバンカードのカウントダウン表示用） */
export function useUpcomingEvents(refetchIntervalMs: number = 60_000) {
  const token = useToken()
  return useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: () => createApi(token).get<CompanyEvent[]>("/api/dashboard/events/upcoming"),
    enabled: !!token,
    refetchInterval: refetchIntervalMs,
  })
}

/** 特定企業のイベント一覧（詳細モーダル用） */
export function useCompanyEvents(companyId: string | null) {
  const token = useToken()
  return useQuery({
    queryKey: ["events", "company", companyId],
    queryFn: () => createApi(token).get<CompanyEvent[]>(`/api/companies/${companyId}/events`),
    enabled: !!token && !!companyId,
  })
}

export function useCreateEvent(companyId: string) {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EventCreate) =>
      createApi(token).post<CompanyEvent>(`/api/companies/${companyId}/events`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useUpdateEvent() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<EventCreate> & { id: string }) =>
      createApi(token).patch<CompanyEvent>(`/api/events/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useDeleteEvent() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => createApi(token).delete(`/api/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

type SyncAllResult = { synced: number; skipped: number; error: string | null }

export function useSyncAllEvents() {
  const token = useToken()
  return useMutation({
    mutationFn: () => createApi(token).post<SyncAllResult>("/api/calendar/sync-all", {}),
  })
}
