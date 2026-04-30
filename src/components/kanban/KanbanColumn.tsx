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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{STAGE_LABELS[stage]}</h3>
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          {defects.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {defects.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8 border border-dashed border-gray-200 rounded-lg">
            Vazio
          </div>
        ) : (
          defects.map(d => <DefectCard key={d.id} defect={d} />)
        )}
      </div>
    </div>
  )
}
