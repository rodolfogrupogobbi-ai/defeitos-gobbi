import { STAGE_LABELS } from '@/types'
import { DefectCard } from './DefectCard'
import type { Defect, Stage } from '@/types'

interface Props {
  stage: Stage
  defects: Defect[]
}

export function KanbanColumn({ stage, defects }: Props) {
  return (
    <div className="flex flex-col min-w-56 w-64 flex-shrink-0">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg mb-0"
        style={{ background: 'var(--navy)', borderRadius: '8px 8px 0 0' }}
      >
        <h3 className="text-xs font-semibold text-white uppercase tracking-wide truncate">
          {STAGE_LABELS[stage]}
        </h3>
        <span
          className="text-xs font-bold rounded-full px-2 py-0.5 shrink-0 ml-2"
          style={{ background: 'var(--orange)', color: '#fff' }}
        >
          {defects.length}
        </span>
      </div>
      <div
        className="flex flex-col gap-2 p-2 rounded-b-lg min-h-16"
        style={{ background: '#e8edf3' }}
      >
        {defects.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-6">
            Vazio
          </div>
        ) : (
          defects.map(d => <DefectCard key={d.id} defect={d} />)
        )}
      </div>
    </div>
  )
}
