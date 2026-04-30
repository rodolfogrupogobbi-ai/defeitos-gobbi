interface Props {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}

export function MetricCard({ label, value, sub, highlight }: Props) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-orange-700' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
