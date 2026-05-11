import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname === "/"

  // 未ログインで保護ページにアクセス → ログイン画面へ
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // ログイン済みでログイン画面にアクセス → カンバンへ
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/kanban", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
