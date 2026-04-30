'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Brand } from '@/types'

export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('brands').select('*').order('name')
    setBrands(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!newName.trim()) return
    const supabase = createClient()
    await supabase.from('brands').insert({ name: newName.trim() })
    setNewName('')
    load()
  }

  async function toggle(id: string, active: boolean) {
    const supabase = createClient()
    await supabase.from('brands').update({ active: !active }).eq('id', id)
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
          placeholder="Nome da marca"
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
        {brands.map(b => (
          <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={`text-sm ${!b.active ? 'text-gray-400 line-through' : ''}`}>
              {b.name}
            </span>
            <button
              onClick={() => toggle(b.id, b.active)}
              className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
            >
              {b.active ? 'Desativar' : 'Ativar'}
            </button>
          </li>
        ))}
        {brands.length === 0 && (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">Nenhuma marca cadastrada</li>
        )}
      </ul>
    </div>
  )
}
