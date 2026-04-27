import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import { BriefcaseBusiness, LogOut } from "lucide-react"
import NavLinks from "@/components/NavLinks"

export default async function NavHeader() {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      {/* ロゴ + ナビゲーション */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BriefcaseBusiness size={16} />
          </div>
          <span className="text-sm font-bold text-slate-800">JobTrack</span>
        </div>
        <NavLinks />
      </div>

      {/* ユーザー情報 */}
      <div className="flex items-center gap-3">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? ""}
            width={28}
            height={28}
            className="rounded-full"
          />
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
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut size={13} />
            ログアウト
          </button>
        </form>
      </div>
    </header>
  )
}
