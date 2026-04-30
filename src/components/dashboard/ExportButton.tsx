'use client'
import { utils, writeFile } from 'xlsx'
import { format } from 'date-fns'
import { STAGE_LABELS } from '@/types'
import type { Defect } from '@/types'

export function ExportButton({ defects }: { defects: Defect[] }) {
  function handleExport() {
    const rows = defects.map(d => ({
      'Empresa': d.company?.name ?? '',
      'Marca': d.brand?.name ?? '',
      'Produto': d.product_name,
      'Referência': d.reference,
      'Cor': d.color ?? '',
      'Tamanho': d.size ?? '',
      'NF': d.nf_number ?? '',
      'Cód. Use': d.cod_use ?? '',
      'Tipo de Defeito': d.defect_type?.name ?? '',
      'Cliente': d.client_name,
      'Telefone': d.client_phone,
      'Recebido em': format(new Date(d.received_at), 'dd/MM/yyyy'),
      'Situação': STAGE_LABELS[d.current_stage],
      'Canal': d.communication_channel ?? '',
      'Protocolo': d.protocol_number ?? '',
      'Valor Pago Cliente': d.client_amount_paid ?? '',
      'Data Pagamento': d.client_paid_at
        ? format(new Date(d.client_paid_at), 'dd/MM/yyyy')
        : '',
      'Valor Recebido Marca': d.brand_reimbursement_amount ?? '',
      'Data Recebimento Marca': d.brand_reimbursed_at
        ? format(new Date(d.brand_reimbursed_at), 'dd/MM/yyyy')
        : '',
      'Forma Reembolso':
        d.reimbursement_method === 'invoice'
          ? 'Nota Fiscal'
          : d.reimbursement_method === 'bank_transfer'
          ? 'Conta Corrente'
          : '',
      'Observações': d.resolution_notes ?? '',
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Defeitos')
    writeFile(wb, `defeitos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
    >
      ↓ Exportar Excel
    </button>
  )
}
