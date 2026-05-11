const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export function createApi(token: string) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  return {
    get: <T>(path: string): Promise<T> =>
      fetch(`${BASE_URL}${path}`, { headers }).then((r) => {
        if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`)
        return r.json()
      }),

    post: <T>(path: string, body: unknown): Promise<T> =>
      fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`POST ${path} failed: ${r.status}`)
        return r.json()
      }),

    patch: <T>(path: string, body: unknown): Promise<T> =>
      fetch(`${BASE_URL}${path}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.status}`)
        return r.json()
      }),

    delete: <T>(path: string): Promise<T> =>
      fetch(`${BASE_URL}${path}`, { method: "DELETE", headers }).then((r) => {
        if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.status}`)
        return r.json()
      }),
  }
}
