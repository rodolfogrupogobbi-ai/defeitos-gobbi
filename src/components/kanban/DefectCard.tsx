import Link from 'next/link'
import { getAlertLevel, daysElapsed } from '@/lib/date-utils'
import { Badge } from '@/components/ui/Badge'
import type { Defect } from '@/types'

export function DefectCard({ defect }: { defect: Defect }) {
  const alert = getAlertLevel(defect.current_stage, defect.received_at)
  const days = daysElapsed(defect.received_at)

  return (
    <Link
      href={`/defeito/${defect.id}`}
      className={`block bg-white rounded-lg border p-3 hover:shadow-md transition-shadow ${
        alert === 'red'
          ? 'border-red-300 bg-red-50'
          : alert === 'yellow'
          ? 'border-yellow-300 bg-yellow-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {defect.brand?.name ?? '—'}
        </p>
        <Badge variant={alert ?? 'gray'}>{days}d</Badge>
      </div>
      <p className="text-xs text-gray-600 truncate">{defect.product_name}</p>
      <p className="text-xs text-gray-500 truncate">{defect.client_name}</p>
      <p className="text-xs text-gray-400 mt-1">{defect.company?.name}</p>
    </Link>
  )
}
