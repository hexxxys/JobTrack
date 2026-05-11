import NavHeader from "@/components/NavHeader"
import SettingsForm from "@/components/settings/SettingsForm"
import MailImportPanel from "@/components/settings/MailImportPanel"
import CalendarDiagPanel from "@/components/settings/CalendarDiagPanel"

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <NavHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">設定</h1>
          <p className="mt-2 text-sm text-slate-500">設定はブラウザに保存され、次回アクセス時も引き継がれます。</p>
        </section>

        <SettingsForm />
        <div className="mt-4">
          <CalendarDiagPanel />
        </div>
        <div className="mt-4">
          <MailImportPanel />
        </div>
      </main>
    </div>
  )
}
