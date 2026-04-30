'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { canAdvanceToStage5 } from '@/lib/permissions'
import { CLOSED_STAGES, STAGE_LABELS } from '@/types'
import type { Defect, Stage, Role, CommunicationChannel, ReimbursementMethod } from '@/types'

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  received: 'in_progress',
  in_progress: 'photos_attached',
  photos_attached: 'awaiting_reimbursement',
  awaiting_reimbursement: 'paid_to_client',
  paid_to_client: 'reimbursed_to_store',
}

interface Props {
  defect: Defect
  userId: string
  userRole: Role
}

export function StageAdvancer({ defect, userId, userRole }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [channel, setChannel] = useState<CommunicationChannel>('email')
  const [protocol, setProtocol] = useState('')
  const [clientPaid, setClientPaid] = useState('')
  const [clientPaidAt, setClientPaidAt] = useState('')
  const [brandAmount, setBrandAmount] = useState('')
  const [brandAt, setBrandAt] = useState('')
  const [reimbMethod, setReimbMethod] = useState<ReimbursementMethod>('invoice')
  const [closeStage, setCloseStage] = useState<Stage>('improcedente')
  const [closeNotes, setCloseNotes] = useState('')

  const nextStage = NEXT_STAGE[defect.current_stage]
  const isFinished =
    defect.current_stage === 'reimbursed_to_store' ||
    CLOSED_STAGES.includes(defect.current_stage)

  if (isFinished) {
    return (
      <p className="text-sm text-gray-500">
        Este defeito está encerrado: <strong>{STAGE_LABELS[defect.current_stage]}</strong>
      </p>
    )
  }

  if (nextStage === 'paid_to_client' && !canAdvanceToStage5(userRole)) {
    return (
      <p className="text-sm text-gray-500">
        Aguardando ação de um administrador para avançar este processo.
      </p>
    )
  }

  async function advance() {
    if (!nextStage) return
    setSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { current_stage: nextStage }
    if (nextStage === 'in_progress') {
      updates.communication_channel = channel
      updates.protocol_number = protocol
    }
    if (nextStage === 'paid_to_client') {
      updates.client_amount_paid = parseFloat(clientPaid)
      updates.client_paid_at = clientPaidAt
    }
    if (nextStage === 'reimbursed_to_store') {
      updates.brand_reimbursement_amount = parseFloat(brandAmount)
      updates.brand_reimbursed_at = brandAt
      updates.reimbursement_method = reimbMethod
    }
    await supabase.from('defects').update(updates).eq('id', defect.id)
    await supabase.from('defect_history').insert({
      defect_id: defect.id,
      from_stage: defect.current_stage,
      to_stage: nextStage,
      changed_by: userId,
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  async function closeDefect() {
    if (!closeNotes.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('defects')
      .update({ current_stage: closeStage, resolution_notes: closeNotes })
      .eq('id', defect.id)
    await supabase.from('defect_history').insert({
      defect_id: defect.id,
      from_stage: defect.current_stage,
      to_stage: closeStage,
      changed_by: userId,
      notes: closeNotes,
    })
    setSaving(false)
    setCloseOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {nextStage && (
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Avançar → {STAGE_LABELS[nextStage]}
          </button>
        )}
        {defect.current_stage === 'awaiting_reimbursement' && canAdvanceToStage5(userRole) && (
          <button
            onClick={() => setCloseOpen(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Encerrar (Improcedente / Doação / Não enviado)
          </button>
        )}
      </div>

      {/* Advance modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Avançar para: ${nextStage ? STAGE_LABELS[nextStage] : ''}`}
      >
        <div className="flex flex-col gap-4">
          {nextStage === 'in_progress' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Canal de comunicação</label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value as CommunicationChannel)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="system">Sistema da marca</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Protocolo / número</label>
                <input
                  value={protocol}
                  onChange={e => setProtocol(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          {nextStage === 'paid_to_client' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor pago ao cliente (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={clientPaid}
                  onChange={e => setClientPaid(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Data do pagamento</label>
                <input
                  type="date"
                  value={clientPaidAt}
                  onChange={e => setClientPaidAt(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
            </>
          )}
          {nextStage === 'reimbursed_to_store' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor recebido da marca (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={brandAmount}
                  onChange={e => setBrandAmount(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Data do recebimento</label>
                <input
                  type="date"
                  value={brandAt}
                  onChange={e => setBrandAt(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Forma</label>
                <select
                  value={reimbMethod}
                  onChange={e => setReimbMethod(e.target.value as ReimbursementMethod)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="invoice">Nota Fiscal</option>
                  <option value="bank_transfer">Conta Corrente</option>
                </select>
              </div>
            </>
          )}
          <button
            onClick={advance}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </Modal>

      {/* Close modal */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Encerrar defeito"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Desfecho</label>
            <select
              value={closeStage}
              onChange={e => setCloseStage(e.target.value as Stage)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="improcedente">Improcedente</option>
              <option value="doacao">Doação</option>
              <option value="nao_enviado">Não enviado</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Observação *</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Descreva o motivo do encerramento..."
            />
          </div>
          <button
            onClick={closeDefect}
            disabled={saving || !closeNotes.trim()}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Encerrando...' : 'Confirmar Encerramento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
