'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import type { DefectBrandComm } from '@/types'

interface Props {
  defectId: string
  userId: string
  initialComms: DefectBrandComm[]
}

export function BrandCommLog({ defectId, userId, initialComms }: Props) {
  const [comms, setComms] = useState(initialComms)
  const [formOpen, setFormOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function addComm() {
    if (!notes.trim()) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('defect_brand_comms')
      .insert({ defect_id: defectId, comm_date: date, notes: notes.trim(), created_by: userId })
      .select('*, created_by_profile:profiles!created_by(*)')
      .single()
    if (err) {
      setError('Erro ao salvar. Tente novamente.')
    } else if (data) {
      setComms(prev => [...prev, data as DefectBrandComm])
      setNotes('')
      setDate(new Date().toISOString().split('T')[0])
      setFormOpen(false)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Comunicações com a Marca</h2>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <Plus size={12} />
          Registrar contato
        </button>
      </div>

      {formOpen && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Data do contato</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Notas *</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Enviado e-mail para contato@marca.com com NF 00123. Aguardando resposta..."
              className="border border-gray-300 rounded px-2 py-1.5 text-sm resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={addComm}
              disabled={saving || !notes.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {comms.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">Nenhum contato registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {comms.map(c => (
            <li key={c.id} className="flex gap-3 text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-400 whitespace-nowrap text-xs pt-0.5 min-w-[72px]">
                {format(new Date(c.comm_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
              <div className="flex-1">
                <p className="text-gray-700 whitespace-pre-wrap">{c.notes}</p>
                {c.created_by_profile && (
                  <p className="text-xs text-gray-400 mt-0.5">{c.created_by_profile.name}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
