"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { createApi } from "@/lib/api"
import { APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/settings"

type UserSettingsApi = {
  show_archived_statuses: boolean
  compact_cards: boolean
  upcoming_refresh_minutes: number
  calendar_sync_enabled: boolean
}

export type SyncNotice = {
  id: number
  type: "success" | "error"
  message: string
}

function sanitizeSettings(input: Partial<AppSettings>): AppSettings {
  const refresh = input.upcomingRefreshMinutes
  return {
    showArchivedStatuses: Boolean(input.showArchivedStatuses),
    compactCards: Boolean(input.compactCards),
    upcomingRefreshMinutes: refresh === 1 || refresh === 5 || refresh === 10 ? refresh : 10,
    calendarSyncEnabled:
      input.calendarSyncEnabled === undefined ? true : Boolean(input.calendarSyncEnabled),
  }
}

function fromApi(data: UserSettingsApi): AppSettings {
  return sanitizeSettings({
    showArchivedStatuses: data.show_archived_statuses,
    compactCards: data.compact_cards,
    upcomingRefreshMinutes: data.upcoming_refresh_minutes as 1 | 5 | 10,
    calendarSyncEnabled: data.calendar_sync_enabled,
  })
}

function toApi(data: AppSettings): UserSettingsApi {
  return {
    show_archived_statuses: data.showArchivedStatuses,
    compact_cards: data.compactCards,
    upcoming_refresh_minutes: data.upcomingRefreshMinutes,
    calendar_sync_enabled: data.calendarSyncEnabled,
  }
}

export function useAppSettings() {
  const { data: session, status } = useSession()
  const token = session?.accessToken ?? ""
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [ready, setReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const [syncNotice, setSyncNotice] = useState<SyncNotice | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(APP_SETTINGS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>
        setSettings(sanitizeSettings(parsed))
      }
    } catch {
      setSettings(DEFAULT_APP_SETTINGS)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!token || status !== "authenticated") return

    let cancelled = false
    const api = createApi(token)

    api
      .get<UserSettingsApi>("/api/users/me/settings")
      .then((data) => {
        if (cancelled) return
        const next = fromApi(data)
        setSettings(next)
        window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next))
        setLastSyncError(null)
      })
      .catch(() => {
        // ネットワーク失敗時は localStorage 値を継続利用
        if (!cancelled) {
          setLastSyncError("サーバーから設定を取得できませんでした")
          setSyncNotice({
            id: Date.now(),
            type: "error",
            message: "設定の取得に失敗しました（ローカル値で継続）",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, status])

  const persistToServer = async (
    next: AppSettings,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    if (!token) return
    setIsSaving(true)
    try {
      await createApi(token).patch("/api/users/me/settings", toApi(next))
      setLastSyncError(null)
      if (options?.successMessage) {
        setSyncNotice({ id: Date.now(), type: "success", message: options.successMessage })
      }
    } catch {
      const errorMessage = options?.errorMessage ?? "サーバーへの保存に失敗しました"
      setLastSyncError(errorMessage)
      setSyncNotice({ id: Date.now(), type: "error", message: errorMessage })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSettings = (patch: Partial<AppSettings>) => {
    const next = sanitizeSettings({ ...settings, ...patch })
    setSettings(next)
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next))
    void persistToServer(next, {
      successMessage: "設定を保存しました",
      errorMessage: "設定の保存に失敗しました",
    })
  }

  const resetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS)
    window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(DEFAULT_APP_SETTINGS))
    void persistToServer(DEFAULT_APP_SETTINGS, {
      successMessage: "設定を初期化しました",
      errorMessage: "設定の初期化に失敗しました",
    })
  }

  const retrySync = () => {
    void persistToServer(settings, {
      successMessage: "サーバーと再同期しました",
      errorMessage: "再同期に失敗しました",
    })
  }

  const clearSyncNotice = useCallback(() => {
    setSyncNotice(null)
  }, [])

  const refreshIntervalMs = useMemo(
    () => settings.upcomingRefreshMinutes * 60 * 1000,
    [settings.upcomingRefreshMinutes]
  )

  return {
    settings,
    updateSettings,
    resetSettings,
    retrySync,
    ready,
    refreshIntervalMs,
    isSaving,
    lastSyncError,
    syncNotice,
    clearSyncNotice,
  }
}
