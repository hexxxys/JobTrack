export { auth as middleware } from "@/auth"

export const config = {
  // ログインページ・静的ファイル・API は除外してすべて保護
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|$).*)"],
}
