export type AppSettings = {
  showArchivedStatuses: boolean
  compactCards: boolean
  upcomingRefreshMinutes: 1 | 5 | 10
  calendarSyncEnabled: boolean
}

export const APP_SETTINGS_KEY = "syukatu.app-settings"

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showArchivedStatuses: false,
  compactCards: false,
  upcomingRefreshMinutes: 10,
  calendarSyncEnabled: true,
}
