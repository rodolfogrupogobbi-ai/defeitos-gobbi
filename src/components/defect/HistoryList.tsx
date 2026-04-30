import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_LABELS } from '@/types'
import type { DefectHistory } from '@/types'

export function HistoryList({ history }: { history: DefectHistory[] }) {
  if (!history.length) {
    return <p className="text-sm text-gray-400">Nenhuma movimentação ainda.</p>
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3">
      {history.map(h => (
        <li key={h.id} className="mb-4 ml-4">
          <div className="absolute -left-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
          <p className="text-sm font-medium text-gray-900">
            {h.from_stage
              ? `${STAGE_LABELS[h.from_stage as keyof typeof STAGE_LABELS] ?? h.from_stage} → `
              : ''}
            {STAGE_LABELS[h.to_stage as keyof typeof STAGE_LABELS] ?? h.to_stage}
          </p>
          <p className="text-xs text-gray-500">
            {h.changed_by_profile?.name ?? '—'} ·{' '}
            {format(new Date(h.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {h.notes && <p className="text-xs text-gray-600 mt-0.5">{h.notes}</p>}
          {h.whatsapp_sent && (
            <p className="text-xs text-green-600 mt-0.5">✓ Mensagem WhatsApp registrada</p>
          )}
        </li>
      ))}
    </ol>
  )
}
