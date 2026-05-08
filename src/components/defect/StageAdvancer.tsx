'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { canAdvanceToStage5 } from '@/lib/permissions'
import { CLOSED_STAGES, STAGE_LABELS } from '@/types'
import type { Defect, Stage, Role, CommunicationChannel } from '@/types'

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  received: 'dados_fiscais',
  dados_fiscais: 'in_progress',
  in_progress: 'photos_attached',
  photos_attached: 'aguardando_retorno_marca',
  aguardando_retorno_marca: 'emissao_nf',
  emissao_nf: 'awaiting_reimbursement',
  awaiting_reimbursement: 'paid_to_client',
  paid_to_client: 'reimbursed_to_store',
}

const REIMBURSEMENT_OPTIONS = [
  { value: 'invoice', label: 'Nota Fiscal' },
  { value: 'bank_transfer', label: 'Conta Corrente' },
  { value: 'troca_peca', label: 'Troca da Peça' },
  { value: 'enviado_outra_peca', label: 'Enviado Outra Peça' },
  { value: 'desconto_boleto', label: 'Desconto em Boleto' },
  { value: 'outro', label: 'Outro (especificar)' },
]

const CLOSEABLE_STAGES: Stage[] = ['awaiting_reimbursement', 'aguardando_retorno_marca', 'emissao_nf']

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
  const [saveError, setSaveError] = useState('')

  // Fiscal fields — pre-filled from defect for emissao_nf review
  const [fiscalIcms, setFiscalIcms] = useState(defect.fiscal_icms != null ? String(defect.fiscal_icms) : '')
  const [fiscalAliquota, setFiscalAliquota] = useState(defect.fiscal_aliquota != null ? String(defect.fiscal_aliquota) : '')
  const [fiscalFrete, setFiscalFrete] = useState(defect.fiscal_frete != null ? String(defect.fiscal_frete) : '')
  const [fiscalDesconto, setFiscalDesconto] = useState(defect.fiscal_desconto != null ? String(defect.fiscal_desconto) : '')
  const [fiscalNf, setFiscalNf] = useState(defect.fiscal_nf ?? '')
  const [fiscalEndereco, setFiscalEndereco] = useState(defect.fiscal_endereco ?? '')
  const [fiscalRazaoSocial, setFiscalRazaoSocial] = useState(defect.fiscal_razao_social ?? '')

  // in_progress fields
  const [channel, setChannel] = useState<CommunicationChannel>('email')
  const [protocol, setProtocol] = useState(defect.protocol_number ?? '')

  // paid_to_client fields
  const [clientPaid, setClientPaid] = useState('')
  const [clientPaidAt, setClientPaidAt] = useState('')

  // reimbursed_to_store fields
  const [brandAmount, setBrandAmount] = useState('')
  const [brandAt, setBrandAt] = useState('')
  const [reimbMethod, setReimbMethod] = useState('invoice')
  const [reimbMethodCustom, setReimbMethodCustom] = useState('')

  // close fields
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

  const modalTitle = defect.current_stage === 'emissao_nf'
    ? 'Confirmar Nota Fiscal para a Marca'
    : `Avançar para: ${nextStage ? STAGE_LABELS[nextStage] : ''}`

  async function advance() {
    if (!nextStage) return
    setSaving(true)
    setSaveError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { current_stage: nextStage }

    if (nextStage === 'dados_fiscais') {
      if (fiscalIcms) updates.fiscal_icms = parseFloat(fiscalIcms)
      if (fiscalAliquota) updates.fiscal_aliquota = parseFloat(fiscalAliquota)
      if (fiscalFrete) updates.fiscal_frete = parseFloat(fiscalFrete)
      if (fiscalDesconto) updates.fiscal_desconto = parseFloat(fiscalDesconto)
      if (fiscalNf) updates.fiscal_nf = fiscalNf
      if (fiscalEndereco) updates.fiscal_endereco = fiscalEndereco
      if (fiscalRazaoSocial) updates.fiscal_razao_social = fiscalRazaoSocial
    }
    if (defect.current_stage === 'emissao_nf') {
      updates.fiscal_icms = fiscalIcms ? parseFloat(fiscalIcms) : null
      updates.fiscal_aliquota = fiscalAliquota ? parseFloat(fiscalAliquota) : null
      updates.fiscal_frete = fiscalFrete ? parseFloat(fiscalFrete) : null
      updates.fiscal_desconto = fiscalDesconto ? parseFloat(fiscalDesconto) : null
      updates.fiscal_nf = fiscalNf || null
      updates.fiscal_endereco = fiscalEndereco || null
      updates.fiscal_razao_social = fiscalRazaoSocial || null
    }
    if (nextStage === 'in_progress') {
      updates.communication_channel = channel
      if (protocol) updates.protocol_number = protocol
    }
    if (nextStage === 'paid_to_client') {
      updates.client_amount_paid = parseFloat(clientPaid)
      updates.client_paid_at = clientPaidAt
    }
    if (nextStage === 'reimbursed_to_store') {
      updates.brand_reimbursement_amount = parseFloat(brandAmount)
      updates.brand_reimbursed_at = brandAt
      updates.reimbursement_method = reimbMethod === 'outro' ? reimbMethodCustom : reimbMethod
    }

    const { error: updateError } = await supabase.from('defects').update(updates).eq('id', defect.id)
    if (updateError) {
      setSaveError(`Erro ao avançar: ${updateError.message}`)
      setSaving(false)
      return
    }
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
        {CLOSEABLE_STAGES.includes(defect.current_stage) && canAdvanceToStage5(userRole) && (
          <button
            onClick={() => setCloseOpen(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Encerrar (Improcedente / Doação / Não enviado)
          </button>
        )}
      </div>

      {/* Advance modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={modalTitle}>
        <div className="flex flex-col gap-4">

          {/* dados_fiscais — enter fiscal data */}
          {nextStage === 'dados_fiscais' && (
            <>
              <p className="text-sm text-gray-500">Todos os campos são opcionais. Preencha os dados disponíveis para emissão da NF.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">ICMS (%)</label>
                  <input type="number" step="0.01" value={fiscalIcms} onChange={e => setFiscalIcms(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 12" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Alíquota (%)</label>
                  <input type="number" step="0.01" value={fiscalAliquota} onChange={e => setFiscalAliquota(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 7" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Frete (R$)</label>
                  <input type="number" step="0.01" value={fiscalFrete} onChange={e => setFiscalFrete(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="0,00" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Desconto (R$)</label>
                  <input type="number" step="0.01" value={fiscalDesconto} onChange={e => setFiscalDesconto(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="0,00" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Número da Nota Fiscal</label>
                <input value={fiscalNf} onChange={e => setFiscalNf(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 000123" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Razão Social da Empresa</label>
                <input value={fiscalRazaoSocial} onChange={e => setFiscalRazaoSocial(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Endereço de Envio</label>
                <input value={fiscalEndereco} onChange={e => setFiscalEndereco(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* emissao_nf — review/edit fiscal data before sending to brand */}
          {defect.current_stage === 'emissao_nf' && (
            <>
              <p className="text-sm text-gray-500">Revise os dados fiscais antes de avançar. Campos em branco serão limpos.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">ICMS (%)</label>
                  <input type="number" step="0.01" value={fiscalIcms} onChange={e => setFiscalIcms(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 12" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Alíquota (%)</label>
                  <input type="number" step="0.01" value={fiscalAliquota} onChange={e => setFiscalAliquota(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 7" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Frete (R$)</label>
                  <input type="number" step="0.01" value={fiscalFrete} onChange={e => setFiscalFrete(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="0,00" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Desconto (R$)</label>
                  <input type="number" step="0.01" value={fiscalDesconto} onChange={e => setFiscalDesconto(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="0,00" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Número da Nota Fiscal</label>
                <input value={fiscalNf} onChange={e => setFiscalNf(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: 000123" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Razão Social da Empresa</label>
                <input value={fiscalRazaoSocial} onChange={e => setFiscalRazaoSocial(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Endereço de Envio</label>
                <input value={fiscalEndereco} onChange={e => setFiscalEndereco(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* in_progress */}
          {nextStage === 'in_progress' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Canal de comunicação</label>
                <select value={channel} onChange={e => setChannel(e.target.value as CommunicationChannel)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="system">Sistema da marca</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Protocolo</label>
                <input value={protocol} onChange={e => setProtocol(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Gerado automaticamente no cadastro" />
              </div>
            </>
          )}

          {/* paid_to_client */}
          {nextStage === 'paid_to_client' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor pago ao cliente (R$)</label>
                <input type="number" step="0.01" value={clientPaid} onChange={e => setClientPaid(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Data do pagamento</label>
                <input type="date" value={clientPaidAt} onChange={e => setClientPaidAt(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
            </>
          )}

          {/* reimbursed_to_store */}
          {nextStage === 'reimbursed_to_store' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Valor recebido da marca (R$)</label>
                <input type="number" step="0.01" value={brandAmount} onChange={e => setBrandAmount(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Data do recebimento</label>
                <input type="date" value={brandAt} onChange={e => setBrandAt(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Forma de reembolso</label>
                <select value={reimbMethod} onChange={e => setReimbMethod(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
                  {REIMBURSEMENT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {reimbMethod === 'outro' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Descreva a forma</label>
                  <input value={reimbMethodCustom} onChange={e => setReimbMethodCustom(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ex: Crédito em nota futura" />
                </div>
              )}
            </>
          )}

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <button onClick={advance} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </Modal>

      {/* Close modal */}
      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Encerrar defeito">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Desfecho</label>
            <select value={closeStage} onChange={e => setCloseStage(e.target.value as Stage)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
              <option value="improcedente">Improcedente</option>
              <option value="doacao">Doação</option>
              <option value="nao_enviado">Não enviado</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Observação *</label>
            <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={3}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Descreva o motivo do encerramento..." />
          </div>
          <button onClick={closeDefect} disabled={saving || !closeNotes.trim()}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Encerrando...' : 'Confirmar Encerramento'}
          </button>
        </div>
      </Modal>
    </>
  )
}
