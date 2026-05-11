import NavHeader from "@/components/NavHeader"
import SummaryCards from "@/components/dashboard/SummaryCards"
import UpcomingList from "@/components/dashboard/UpcomingList"

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <NavHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6">
        <section>
          <h1 className="text-lg font-bold text-slate-800">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">選考の進捗と直近予定をまとめて確認できます。</p>
        </section>

        <SummaryCards />

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">直近スケジュール</h2>
          <div className="mt-3">
            <UpcomingList />
          </div>
        </section>
      </main>
    </div>
  )
}
