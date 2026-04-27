"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"
import type { Status } from "@/types"

function useToken() {
  const { data: session } = useSession()
  return session?.accessToken ?? ""
}

export function useStatuses() {
  const token = useToken()
  return useQuery({
    queryKey: ["statuses"],
    queryFn: () => createApi(token).get<Status[]>("/api/statuses"),
    enabled: !!token,
  })
}

export function useUpdateStatus() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Status> & { id: string }) =>
      createApi(token).patch<Status>(`/api/statuses/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["statuses"] }),
  })
}
