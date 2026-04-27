import NavHeader from "@/components/NavHeader"
import CompanyListClient from "@/components/companies/CompanyListClient"

export default function CompaniesPage() {
  return (
    <div className="flex h-full flex-col">
      <NavHeader />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-slate-800">企業一覧</h1>
            <p className="mt-1 text-xs text-slate-500">
              マイページURL・ログインIDを一覧で確認できます。クリックでコピー。
            </p>
          </div>
          <CompanyListClient />
        </div>
      </main>
    </div>
  )
}
