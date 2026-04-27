"use client"

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4">
      <p className="text-slate-600">エラーが発生しました</p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        再試行
      </button>
    </div>
  )
}
