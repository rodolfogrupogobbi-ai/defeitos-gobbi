import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { canAccessDashboard } from '@/lib/permissions'
import { STAGE_LABELS } from '@/types'

export default async function ExcluidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccessDashboard(profile.role)) redirect('/kanban')

  const { data: deleted } = await supabase
    .from('defects')
    .select(`
      *,
      brand:brands(name),
      company:companies(name),
      deleted_by_profile:profiles!deleted_by(name)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  const rows = (deleted ?? []) as any[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Defeitos Excluídos</h1>
        <a href="/painel" className="text-sm text-gray-500 hover:underline">
          ← Voltar ao Painel
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
          Nenhum defeito excluído.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Marca</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Situação</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recebido em</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Excluído em</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Excluído por</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.product_name}</td>
                  <td className="px-4 py-3 text-gray-700">{d.brand?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{d.client_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {STAGE_LABELS[d.current_stage as keyof typeof STAGE_LABELS] ?? d.current_stage}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(d.received_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.deleted_at
                      ? format(new Date(d.deleted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.deleted_by_profile?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
