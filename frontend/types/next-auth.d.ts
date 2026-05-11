import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken: string
    googleAccessToken?: string
    error?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    google_access_token?: string
    google_refresh_token?: string
    google_expires_at?: number
    error?: string
  }
}
