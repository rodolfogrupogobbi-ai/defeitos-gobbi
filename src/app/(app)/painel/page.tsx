import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { subYears, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { canAccessDashboard } from '@/lib/permissions'
import { LOJA_ORIGEM_OPTIONS } from '@/types'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DefectsTable } from '@/components/dashboard/DefectsTable'
import { ExportButton } from '@/components/dashboard/ExportButton'

interface SearchParams {
  from?: string
  to?: string
  company?: string
  brand?: string
  stage?: string
  operator?: string
  client?: string
  loja?: string
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessDashboard(profile.role)) redirect('/kanban')

  const sp = await searchParams
  const from = sp.from ?? format(subYears(new Date(), 1), 'yyyy-MM-dd')
  const to = sp.to ?? format(new Date(), 'yyyy-MM-dd')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('defects') as any)
    .select(
      `*, company:companies(*), brand:brands(*),
       defect_type:defect_types(*),
       received_by_profile:profiles!received_by(*)`
    )
    .gte('received_at', from)
    .lte('received_at', to)
    .is('deleted_at', null)
    .order('received_at', { ascending: false })

  if (sp.company) query = query.eq('company_id', sp.company)
  if (sp.brand) query = query.eq('brand_id', sp.brand)
  if (sp.stage) query = query.eq('current_stage', sp.stage)
  if (sp.operator) query = query.eq('received_by', sp.operator)
  if (sp.client) query = query.ilike('client_name', `%${sp.client}%`)
  if (sp.loja) query = query.eq('loja_origem', sp.loja)

  const { data: defects } = await query
  const all = (defects ?? []) as any[]

  // Metrics
  const totalClientPaid = all.reduce((s: number, d: any) => s + (d.client_amount_paid ?? 0), 0)
  const totalBrandReceived = all.reduce(
    (s: number, d: any) => s + (d.brand_reimbursement_amount ?? 0),
    0
  )
  // Brand owes us piece_cost (factory cost), not retail price
  const totalOwedByBrands = all
    .filter((d: any) => d.client_amount_paid != null)
    .reduce((s: number, d: any) => s + (d.piece_cost ?? 0), 0)
  const openBalance = totalOwedByBrands - totalBrandReceived

  // Top brand by defect count
  const byBrand: Record<string, number> = {}
  all.forEach((d: any) => {
    const n = d.brand?.name ?? 'Desconhecida'
    byBrand[n] = (byBrand[n] ?? 0) + 1
  })
  const topBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0]

  // Per-brand open balance breakdown (only meaningful when viewing all brands)
  interface BrandBalanceEntry {
    name: string
    open: number
    oldestPendingDate: string | null
  }
  const brandBalanceMap: Record<string, { name: string; owed: number; received: number; oldestPendingDate: string | null }> = {}
  all.forEach((d: any) => {
    const id = d.brand_id ?? '__unknown__'
    const name = d.brand?.name ?? 'Desconhecida'
    if (!brandBalanceMap[id]) brandBalanceMap[id] = { name, owed: 0, received: 0, oldestPendingDate: null }
    const entry = brandBalanceMap[id]
    if (d.client_amount_paid != null) {
      entry.owed += d.piece_cost ?? 0
      if (d.brand_reimbursement_amount == null) {
        if (!entry.oldestPendingDate || d.received_at < entry.oldestPendingDate) {
          entry.oldestPendingDate = d.received_at
        }
      }
    }
    entry.received += d.brand_reimbursement_amount ?? 0
  })
  const brandBreakdown: BrandBalanceEntry[] = Object.values(brandBalanceMap)
    .map(b => ({ name: b.name, open: b.owed - b.received, oldestPendingDate: b.oldestPendingDate }))
    .filter(b => b.open > 0)
    .sort((a, b) => b.open - a.open)

  const improcedentes = all.filter((d: any) => d.current_stage === 'improcedente')

  // Fetch filter options
  const [{ data: companies }, { data: brands }, { data: profiles }] = await Promise.all([
    supabase.from('companies').select('id, name').eq('active', true).order('name'),
    supabase.from('brands').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, name').order('name'),
  ])

  const stageOptions = [
    { value: 'received', label: 'Recebido' },
    { value: 'dados_fiscais', label: 'Dados Fiscais' },
    { value: 'in_progress', label: 'Processo Iniciado' },
    { value: 'photos_attached', label: 'Fotos Anexadas' },
    { value: 'aguardando_retorno_marca', label: 'Aguardando Retorno da Marca' },
    { value: 'emissao_nf', label: 'Emissão da Nota Fiscal' },
    { value: 'awaiting_reimbursement', label: 'Aguardando Indenização' },
    { value: 'paid_to_client', label: 'Pago ao Cliente' },
    { value: 'reimbursed_to_store', label: 'Indenizado à Loja' },
    { value: 'improcedente', label: 'Improcedente' },
    { value: 'doacao', label: 'Doação' },
    { value: 'nao_enviado', label: 'Não Enviado' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Painel Gerencial</h1>
        <a
          href="/painel/excluidos"
          className="text-sm text-red-600 hover:underline"
        >
          Ver defeitos excluídos
        </a>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">De</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Até</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Empresa</label>
          <select
            name="company"
            defaultValue={sp.company ?? ''}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todas</option>
            {companies?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Marca</label>
          <select
            name="brand"
            defaultValue={sp.brand ?? ''}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todas</option>
            {brands?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Situação</label>
          <select
            name="stage"
            defaultValue={sp.stage ?? ''}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todas</option>
            {stageOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Operador</label>
          <select
            name="operator"
            defaultValue={sp.operator ?? ''}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todos</option>
            {profiles?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Cliente</label>
          <input
            type="text"
            name="client"
            defaultValue={sp.client ?? ''}
            placeholder="Nome do cliente..."
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Loja de Origem</label>
          <select
            name="loja"
            defaultValue={sp.loja ?? ''}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Todas</option>
            {LOJA_ORIGEM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Filtrar
        </button>
        <a
          href="/painel"
          className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
        >
          Limpar
        </a>
      </form>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total de defeitos" value={all.length} />
        <MetricCard
          label="Marca com mais defeitos"
          value={topBrand?.[0] ?? '—'}
          sub={topBrand ? `${topBrand[1]} ocorrências` : ''}
        />
        <MetricCard
          label="Reembolsado ao cliente"
          value={`R$ ${totalClientPaid.toFixed(2)}`}
        />
        <MetricCard
          label="Recebido das marcas"
          value={`R$ ${totalBrandReceived.toFixed(2)}`}
        />
        <MetricCard
          label="Saldo em aberto"
          value={`R$ ${openBalance.toFixed(2)}`}
          sub={openBalance > 0 ? 'A recuperar das marcas' : 'Em dia'}
          highlight={openBalance > 0}
        />
        <MetricCard
          label="Improcedentes"
          value={all.filter((d: any) => d.current_stage === 'improcedente').length}
        />
        <MetricCard
          label="Em andamento"
          value={
            all.filter((d: any) =>
              ['received', 'dados_fiscais', 'in_progress', 'photos_attached', 'aguardando_retorno_marca', 'emissao_nf', 'awaiting_reimbursement'].includes(
                d.current_stage
              )
            ).length
          }
        />
        <MetricCard
          label="Finalizados"
          value={
            all.filter((d: any) => d.current_stage === 'reimbursed_to_store').length
          }
        />
      </div>

      {/* Per-brand open balance breakdown */}
      {!sp.brand && brandBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Saldo em Aberto por Marca</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Marca</th>
                <th className="pb-2 font-medium text-right">Valor em aberto</th>
                <th className="pb-2 font-medium text-right">Defeito mais antigo pendente</th>
              </tr>
            </thead>
            <tbody>
              {brandBreakdown.map(b => (
                <tr key={b.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 font-medium text-gray-900">{b.name}</td>
                  <td className="py-2 text-right font-semibold text-red-600">
                    R$ {b.open.toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-gray-500">
                    {b.oldestPendingDate
                      ? format(new Date(b.oldestPendingDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Improcedentes */}
      {improcedentes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Improcedentes — {improcedentes.length} ocorrência{improcedentes.length !== 1 ? 's' : ''}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Protocolo</th>
                <th className="pb-2 font-medium">Marca</th>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Recebido em</th>
              </tr>
            </thead>
            <tbody>
              {improcedentes.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-2">
                    <a href={`/defeito/${d.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {d.protocol_number ?? d.id.slice(0, 8)}
                    </a>
                  </td>
                  <td className="py-2 text-gray-700">{d.brand?.name ?? '—'}</td>
                  <td className="py-2 text-gray-700">{d.product_name}</td>
                  <td className="py-2 text-gray-700">{d.client_name}</td>
                  <td className="py-2 text-gray-500">
                    {format(new Date(d.received_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {all.length} defeito{all.length !== 1 ? 's' : ''}
          </h2>
          <ExportButton defects={all} />
        </div>
        <DefectsTable defects={all} />
      </div>
    </div>
  )
}
