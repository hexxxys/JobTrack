import { DefaultSession } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    googleAccessToken?: string
    user: {
      id?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    google_id?: string
    google_access_token?: string
    google_refresh_token?: string
    google_access_token_expires_at?: number
  }
}
