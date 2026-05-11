import Link from "next/link"
import NavHeader from "@/components/NavHeader"

type Props = {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="flex h-full flex-col">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">企業詳細・編集</h1>
          <p className="mt-2 text-sm text-slate-500">企業ID: {id}</p>
          <p className="mt-3 text-sm text-slate-500">
            このページの詳細編集UIは今後実装予定です。現時点ではページ遷移確認ができます。
          </p>

          <div className="mt-4">
            <Link
              href="/kanban"
              className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              カンバンへ戻る
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
