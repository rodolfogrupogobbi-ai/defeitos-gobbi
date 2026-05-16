'use client'
import { useState } from 'react'
import Link from 'next/link'
import { KANBAN_STAGES } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import type { Defect } from '@/types'

export function KanbanBoard({ defects }: { defects: Defect[] }) {
  const [search, setSearch] = useState('')

  const q = search.toLowerCase()
  const filtered = search
    ? defects.filter(
        d =>
          d.client_name.toLowerCase().includes(q) ||
          (d.brand?.name ?? '').toLowerCase().includes(q) ||
          d.product_name.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          (d.nf_number ?? '').toLowerCase().includes(q)
      )
    : defects

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, marca, produto, referência ou NF..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Link
          href="/defeito/novo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Novo Defeito
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            defects={filtered.filter(d => d.current_stage === stage)}
          />
        ))}
      </div>
    </div>
  )
}
