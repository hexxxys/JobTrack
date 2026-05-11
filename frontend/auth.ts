import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { SignJWT } from "jose"

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: number
} | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    }
  } catch {
    return null
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.google_id = account.providerAccountId
        token.google_access_token = account.access_token
        token.google_refresh_token = account.refresh_token
        token.google_access_token_expires_at = account.expires_at
        return token
      }

      // アクセストークンの有効期限が60秒以上残っていればそのまま返す
      const expiresAt = token.google_access_token_expires_at as number | undefined
      if (!expiresAt || Date.now() / 1000 < expiresAt - 60) {
        return token
      }

      // 期限切れの場合はリフレッシュ
      const refreshToken = token.google_refresh_token as string | undefined
      if (!refreshToken) return token

      const refreshed = await refreshGoogleAccessToken(refreshToken)
      if (!refreshed) return token

      token.google_access_token = refreshed.access_token
      token.google_access_token_expires_at = refreshed.expires_at
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? ""
      session.googleAccessToken = (token.google_access_token as string | undefined) ?? undefined
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      session.accessToken = await new SignJWT({
        email: token.email,
        name: token.name,
        picture: token.picture,
        google_id: token.google_id,
        google_access_token: token.google_access_token,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(token.sub ?? "")
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret)
      return session
    },
  },
})
