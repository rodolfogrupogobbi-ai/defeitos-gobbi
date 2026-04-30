import Link from 'next/link'
import { format } from 'date-fns'
import { STAGE_LABELS } from '@/types'
import type { Defect } from '@/types'

export function DefectsTable({ defects }: { defects: Defect[] }) {
  if (!defects.length) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Nenhum defeito encontrado com os filtros selecionados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            {[
              'Empresa', 'Marca', 'Produto', 'Cliente',
              'Recebido', 'Situação', 'Pago', 'Recebido Marca',
            ].map(h => (
              <th key={h} className="pb-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {defects.map(d => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-600 text-xs">{d.company?.name}</td>
              <td className="py-2 pr-4 font-medium">{d.brand?.name}</td>
              <td className="py-2 pr-4">
                <Link href={`/defeito/${d.id}`} className="text-blue-600 hover:underline">
                  {d.product_name}
                </Link>
                <div className="text-xs text-gray-400">Ref: {d.reference}</div>
              </td>
              <td className="py-2 pr-4">{d.client_name}</td>
              <td className="py-2 pr-4 text-gray-600 text-xs">
                {format(new Date(d.received_at), 'dd/MM/yy')}
              </td>
              <td className="py-2 pr-4">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                  {STAGE_LABELS[d.current_stage]}
                </span>
              </td>
              <td className="py-2 pr-4 text-xs">
                {d.client_amount_paid != null
                  ? `R$ ${Number(d.client_amount_paid).toFixed(2)}`
                  : '—'}
              </td>
              <td className="py-2 pr-4 text-xs">
                {d.brand_reimbursement_amount != null
                  ? `R$ ${Number(d.brand_reimbursement_amount).toFixed(2)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
