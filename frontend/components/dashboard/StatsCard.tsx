type Props = {
  label: string
  value: number
  sub?: string
  color: string
}

export default function StatsCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}
