import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"

export default async function KanbanPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">就勝つ</h1>
          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600">{session.user?.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-2">ログイン成功！</p>
          <p className="text-gray-400 text-sm">カンバンボードは次のステップで実装します</p>
        </div>
      </div>
    </main>
  )
}
