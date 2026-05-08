'use client'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { renderTemplate, buildWhatsAppUrl } from '@/lib/whatsapp'
import { Modal } from '@/components/ui/Modal'
import type { TemplateVars } from '@/lib/whatsapp'
import type { WhatsAppTemplateStage } from '@/types'

interface Props {
  open: boolean
  defectId: string
  phone: string
  stage: WhatsAppTemplateStage
  userId: string
  templateVars: TemplateVars
  onDone: () => void
}

export function WhatsAppReminderModal({ open, defectId, phone, stage, userId, templateVars, onDone }: Props) {
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)
    const supabase = createClient()
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('stage', stage)
      .single()

    if (template) {
      const message = renderTemplate(template.message_template, templateVars)
      await supabase.from('defect_history').insert({
        defect_id: defectId,
        from_stage: stage,
        to_stage: stage,
        changed_by: userId,
        notes: 'Mensagem WhatsApp enviada',
        whatsapp_sent: true,
      })
      window.open(buildWhatsAppUrl(phone, message), '_blank')
    }
    setSending(false)
    onDone()
  }

  return (
    <Modal open={open} onClose={onDone} title="Avisar o cliente?">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-50 rounded-full shrink-0">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Que tal informar o cliente do andamento?</p>
            <p className="text-sm text-gray-500 mt-1">
              Você pode enviar uma mensagem de acompanhamento para o cliente via WhatsApp agora.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <MessageCircle size={14} />
            {sending ? 'Abrindo...' : 'Enviar via WhatsApp'}
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
          >
            Agora não
          </button>
        </div>
      </div>
    </Modal>
  )
}
