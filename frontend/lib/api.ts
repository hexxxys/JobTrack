const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const createApi = (token: string) => ({
  get:    <T>(path: string)               => request<T>(path, token),
  post:   <T>(path: string, body: unknown) => request<T>(path, token, { method: "POST",   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, token, { method: "PATCH",  body: JSON.stringify(body) }),
  delete:    (path: string)               => request<void>(path, token, { method: "DELETE" }),
})
