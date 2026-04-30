'use client'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { renderTemplate, buildWhatsAppUrl } from '@/lib/whatsapp'
import type { Defect, WhatsAppTemplateStage } from '@/types'

const STAGE_TO_TEMPLATE: Partial<Record<string, WhatsAppTemplateStage>> = {
  received: 'received',
  awaiting_reimbursement: 'awaiting_reimbursement',
  paid_to_client: 'paid_to_client',
}

interface Props {
  defect: Defect
  userId: string
}

export function WhatsAppButton({ defect, userId }: Props) {
  const [loading, setLoading] = useState(false)
  const templateStage = STAGE_TO_TEMPLATE[defect.current_stage]
  if (!templateStage) return null

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('stage', templateStage)
      .single()

    if (!template) {
      setLoading(false)
      return
    }

    const message = renderTemplate(template.message_template, {
      client_name: defect.client_name,
      product_name: defect.product_name,
      brand: defect.brand?.name ?? '',
      company: defect.company?.name ?? '',
      received_at: new Date(defect.received_at).toLocaleDateString('pt-BR'),
      protocol: defect.protocol_number ?? 'sem protocolo',
    })

    await supabase.from('defect_history').insert({
      defect_id: defect.id,
      from_stage: defect.current_stage,
      to_stage: defect.current_stage,
      changed_by: userId,
      notes: 'Mensagem WhatsApp enviada',
      whatsapp_sent: true,
    })

    window.open(buildWhatsAppUrl(defect.client_phone, message), '_blank')
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
    >
      <MessageCircle size={14} />
      {loading ? 'Abrindo...' : 'Enviar WhatsApp'}
    </button>
  )
}
