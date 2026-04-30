'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/types'
import type { WhatsAppTemplate, WhatsAppTemplateStage } from '@/types'

const TEMPLATE_STAGES: WhatsAppTemplateStage[] = [
  'received',
  'awaiting_reimbursement',
  'paid_to_client',
]

export default function WhatsAppPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('whatsapp_templates').select('*')
    if (data) {
      setTemplates(data)
      const init: Record<string, string> = {}
      data.forEach(t => { init[t.stage] = t.message_template })
      setEditing(init)
    }
  }

  useEffect(() => { load() }, [])

  async function save(stage: WhatsAppTemplateStage) {
    const supabase = createClient()
    await supabase
      .from('whatsapp_templates')
      .update({ message_template: editing[stage], updated_at: new Date().toISOString() })
      .eq('stage', stage)
    setSaved(prev => ({ ...prev, [stage]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [stage]: false })), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <strong>Variáveis disponíveis:</strong>{' '}
        {['{client_name}', '{product_name}', '{brand}', '{company}', '{received_at}', '{protocol}'].join(' ')}
      </p>
      {TEMPLATE_STAGES.map(stage => (
        <div key={stage} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">
            Etapa: {STAGE_LABELS[stage]}
          </h2>
          <textarea
            rows={4}
            value={editing[stage] ?? ''}
            onChange={e => setEditing(prev => ({ ...prev, [stage]: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => save(stage)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {saved[stage] ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
      ))}
    </div>
  )
}
