'use client'
import { useState } from 'react'
import type { Defect } from '@/types'

interface Props {
  defect: Defect
}

export function FiscalDataEditor({ defect }: Props) {
  const [fiscalIcms, setFiscalIcms] = useState(defect.fiscal_icms != null ? String(defect.fiscal_icms) : '')
  const [fiscalAliquota, setFiscalAliquota] = useState(defect.fiscal_aliquota != null ? String(defect.fiscal_aliquota) : '')
  const [fiscalFrete, setFiscalFrete] = useState(defect.fiscal_frete != null ? String(defect.fiscal_frete) : '')
  const [fiscalDesconto, setFiscalDesconto] = useState(defect.fiscal_desconto != null ? String(defect.fiscal_desconto) : '')
  const [fiscalNf, setFiscalNf] = useState(defect.fiscal_nf ?? '')
  const [fiscalRazaoSocial, setFiscalRazaoSocial] = useState(defect.fiscal_razao_social ?? '')
  const [fiscalEndereco, setFiscalEndereco] = useState(defect.fiscal_endereco ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch(`/api/defects/${defect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fiscal_icms: fiscalIcms ? parseFloat(fiscalIcms) : null,
        fiscal_aliquota: fiscalAliquota ? parseFloat(fiscalAliquota) : null,
        fiscal_frete: fiscalFrete ? parseFloat(fiscalFrete) : null,
        fiscal_desconto: fiscalDesconto ? parseFloat(fiscalDesconto) : null,
        fiscal_nf: fiscalNf || null,
        fiscal_razao_social: fiscalRazaoSocial || null,
        fiscal_endereco: fiscalEndereco || null,
      }),
    })
    const result = await res.json()
    if (!result.ok) {
      setError('Erro ao salvar. Tente novamente.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Dados para Emissão da Nota Fiscal</h2>
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Editável</span>
      </div>
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
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar dados fiscais'}
        </button>
        {saved && <span className="text-sm text-green-600">Salvo com sucesso.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  )
}
