import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4">
      <p className="text-slate-600">ページが見つかりません</p>
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ログイン画面へ
      </Link>
    </div>
  )
}
