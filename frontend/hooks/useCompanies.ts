"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"
import type { Company } from "@/types"

type CompanyCreate = Omit<Company, "id" | "created_at" | "updated_at">
type CompanyUpdate = Partial<CompanyCreate>

function useToken() {
  const { data: session } = useSession()
  return session?.accessToken ?? ""
}

export function useCompanies() {
  const token = useToken()
  return useQuery({
    queryKey: ["companies"],
    queryFn: () => createApi(token).get<Company[]>("/api/companies"),
    enabled: !!token,
  })
}

export function useUpdateCompanyStatus() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status_id }: { id: string; status_id: string }) =>
      createApi(token).patch<Company>(`/api/companies/${id}`, { status_id }),

    // 楽観的更新: APIレスポンスを待たずに即座にUIへ反映
    onMutate: async ({ id, status_id }) => {
      await queryClient.cancelQueries({ queryKey: ["companies"] })
      const previous = queryClient.getQueryData<Company[]>(["companies"])
      queryClient.setQueryData<Company[]>(["companies"], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, status_id } : c))
      )
      return { previous }
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(["companies"], ctx?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] })
    },
  })
}

export function useCreateCompany() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CompanyCreate) =>
      createApi(token).post<Company>("/api/companies", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  })
}

export function useUpdateCompany() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: CompanyUpdate & { id: string }) =>
      createApi(token).patch<Company>(`/api/companies/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  })
}

export function useDeleteCompany() {
  const token = useToken()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => createApi(token).delete(`/api/companies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  })
}
