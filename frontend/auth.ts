import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { SignJWT } from "jose"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // 初回ログイン時にGoogleトークンを保存
      if (account) {
        token.google_access_token = account.access_token
        token.google_refresh_token = account.refresh_token
        token.google_expires_at = account.expires_at
      }

      // Googleアクセストークンの有効期限が切れていたら自動更新
      if (
        token.google_expires_at &&
        Date.now() / 1000 > (token.google_expires_at as number) - 60
      ) {
        try {
          const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.google_refresh_token as string,
            }),
          })
          const refreshed = await res.json()
          if (!res.ok) throw refreshed
          token.google_access_token = refreshed.access_token
          token.google_expires_at =
            Math.floor(Date.now() / 1000) + refreshed.expires_in
        } catch {
          token.error = "RefreshTokenError"
        }
      }

      return token
    },

    async session({ session, token }) {
      // FastAPI用のHS256署名JWTを生成してsession.accessTokenに格納
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
      const accessToken = await new SignJWT({
        sub: token.sub,
        email: token.email,
        name: token.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret)

      session.accessToken = accessToken
      session.googleAccessToken = token.google_access_token as string | undefined
      if (token.error) session.error = token.error as string

      return session
    },
  },
})
