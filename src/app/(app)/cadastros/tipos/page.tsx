'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DefectType } from '@/types'

export default function TiposPage() {
  const [types, setTypes] = useState<DefectType[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('defect_types').select('*').order('name')
    setTypes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!newName.trim()) return
    const supabase = createClient()
    await supabase.from('defect_types').insert({ name: newName.trim() })
    setNewName('')
    load()
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('defect_types').update({ active: !active }).eq('id', id)
    load()
  }

  if (loading) return <p className="text-sm text-gray-400">Carregando...</p>

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Tipo de defeito"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={add}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Adicionar
        </button>
      </div>
      <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200">
        {types.map(t => (
          <li key={t.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={`text-sm ${!t.active ? 'text-gray-400 line-through' : ''}`}>
              {t.name}
            </span>
            <button
              onClick={() => toggle(t.id, t.active)}
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
            >
              {t.active ? 'Desativar' : 'Ativar'}
            </button>
          </li>
        ))}
        {types.length === 0 && (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">Nenhum tipo cadastrado</li>
        )}
      </ul>
    </div>
  )
}
