import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import { LogOut } from "lucide-react"
import NavLinks from "@/components/NavLinks"

export default async function NavHeader() {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      {/* ロゴ + ナビゲーション */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-slate-900">就勝つ</span>
        <NavLinks />
      </div>

      {/* ユーザー情報 */}
      <div className="flex items-center gap-3">
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
            {session.user?.name?.[0]}
          </div>
        )}
        <span className="hidden text-sm text-slate-600 sm:block">{session.user?.name}</span>

        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <LogOut size={12} />
            ログアウト
          </button>
        </form>
      </div>
    </header>
  )
}
