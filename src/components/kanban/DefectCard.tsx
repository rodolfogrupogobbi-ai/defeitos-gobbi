import Link from 'next/link'
import { getAlertLevel, daysElapsed } from '@/lib/date-utils'
import type { Defect } from '@/types'

const ALERT_STYLES = {
  red: { border: '#fca5a5', bg: '#fff1f1', dot: '#ef4444' },
  yellow: { border: '#fde68a', bg: '#fffbeb', dot: '#f59e0b' },
  none: { border: '#e2e8f0', bg: '#fff', dot: null },
} as const

export function DefectCard({ defect }: { defect: Defect }) {
  const alert = getAlertLevel(defect.current_stage, defect.received_at)
  const days = daysElapsed(defect.received_at)
  const styles = ALERT_STYLES[alert ?? 'none']

  return (
    <Link
      href={`/defeito/${defect.id}`}
      className="block rounded-lg p-3 transition-shadow hover:shadow-md"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--navy)' }}>
          {defect.brand?.name ?? '—'}
        </p>
        <span
          className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full"
          style={
            alert === 'red'
              ? { background: '#fee2e2', color: '#dc2626' }
              : alert === 'yellow'
              ? { background: '#fef3c7', color: '#d97706' }
              : { background: '#e2e8f0', color: '#64748b' }
          }
        >
          {days}d
        </span>
      </div>
      <p className="text-xs text-gray-700 truncate font-medium">{defect.product_name}</p>
      <p className="text-xs text-gray-500 truncate mt-0.5">{defect.client_name}</p>
      <p className="text-xs mt-1.5 truncate" style={{ color: 'rgba(0,0,0,0.35)' }}>
        {defect.company?.name}
      </p>
    </Link>
  )
}
