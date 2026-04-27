"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"

type Summary = {
  total_companies: number
  active_companies: number
  offers: number
  interviews_this_week: number
  upcoming_events_count: number
}

function useToken() {
  const { data: session } = useSession()
  return session?.accessToken ?? ""
}

export function useSummary() {
  const token = useToken()
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => createApi(token).get<Summary>("/api/dashboard/summary"),
    enabled: !!token,
  })
}
