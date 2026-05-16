import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { STAGE_LABELS, REIMBURSEMENT_LABELS, CLIENT_RESOLUTION_LABELS, LOJA_ORIGEM_LABELS } from '@/types'
import { HistoryList } from '@/components/defect/HistoryList'
import { WhatsAppButton } from '@/components/defect/WhatsAppButton'
import { StageAdvancer } from '@/components/defect/StageAdvancer'
import { PhotoUpload } from '@/components/defect/PhotoUpload'
import { BrandCommLog } from '@/components/defect/BrandCommLog'
import { FiscalDataEditor } from '@/components/defect/FiscalDataEditor'
import { getAlertLevel } from '@/lib/date-utils'
import { Badge } from '@/components/ui/Badge'
import { PhoneReveal } from '@/components/ui/PhoneReveal'
import { DeleteDefectButton } from '@/components/defect/DeleteDefectButton'
import { maskPhone } from '@/lib/mask-phone'

export default async function DefectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: defect },
    { data: profile },
    { data: history },
    { data: photos },
    { data: brandComms },
  ] = await Promise.all([
    supabase
      .from('defects')
      .select(
        `*,
        company:companies(*),
        brand:brands(*),
        defect_type:defect_types(*),
        received_by_profile:profiles!received_by(*)`
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('defect_history')
      .select(`*, changed_by_profile:profiles!changed_by(*)`)
      .eq('defect_id', id)
      .order('changed_at', { ascending: true }),
    supabase
      .from('defect_photos')
      .select('*')
      .eq('defect_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('defect_brand_comms')
      .select('*, created_by_profile:profiles!created_by(*)')
      .eq('defect_id', id)
      .order('comm_date', { ascending: true }),
  ])

  if (!defect || !profile) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defectData = defect as any

  const { data: brandContacts } = defectData.brand_id
    ? await supabase.from('brand_contacts').select('*').eq('brand_id', defectData.brand_id).order('name')
    : { data: [] }
  const alert = getAlertLevel(defectData.current_stage, defectData.received_at)

  const showBrandComms =
    defectData.current_stage === 'aguardando_retorno_marca' ||
    defectData.current_stage === 'emissao_nf' ||
    (brandComms && brandComms.length > 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {defectData.brand?.name} — {defectData.product_name}
          </h1>
          <p className="text-sm text-gray-500">
            {defectData.company?.name} · Ref: {defectData.reference}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alert && (
            <Badge variant={alert}>
              {alert === 'red' ? '⚠ Atrasado' : '⏳ Atenção'}
            </Badge>
          )}
          <Badge>{STAGE_LABELS[defectData.current_stage as keyof typeof STAGE_LABELS]}</Badge>
          <Link
            href={`/defeito/${id}/editar`}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            Editar
          </Link>
          {profile.role === 'admin' && (
            <DeleteDefectButton defectId={defectData.id} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Product details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Dados do produto</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ...(defectData.loja_origem ? [['Loja de origem', LOJA_ORIGEM_LABELS[defectData.loja_origem] ?? defectData.loja_origem]] : []),
              ['Cor', defectData.color],
              ['Tamanho', defectData.size],
              ['NF (venda ao cliente)', defectData.nf_number],
              ['NF origem fábrica', defectData.nf_factory],
              ['Cód. Use', defectData.cod_use],
              ['Tipo de defeito', defectData.defect_type?.name],
              [
                'Recebido em',
                format(new Date(defectData.received_at), 'dd/MM/yyyy', { locale: ptBR }),
              ],
              ['Recebido por', defectData.received_by_name ?? defectData.received_by_profile?.name],
              ['Canal', defectData.communication_channel ?? '—'],
              ['Protocolo', defectData.protocol_number ?? '—'],
              ...(defectData.client_code ? [['Cód. cliente (PDV)', defectData.client_code]] : []),
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {defectData.notes && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-500 mb-1">Observações</p>
              <p className="text-sm text-gray-700">{defectData.notes}</p>
            </div>
          )}
          {defectData.resolution_notes && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Observações de encerramento</p>
              <p className="text-sm text-gray-700">{defectData.resolution_notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Client */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Cliente</h2>
            <p className="text-sm font-medium">{defectData.client_name}</p>
            {defectData.client_phone
              ? <PhoneReveal
                  fetchUrl={`/api/defects/${id}/phone`}
                  maskedPhone={maskPhone(defectData.client_phone)}
                />
              : <p className="text-sm text-gray-600">—</p>
            }
            <WhatsAppButton defect={defectData} userId={user.id} />
          </div>

          {/* Financial */}
          {(defectData.piece_cost !== null ||
            defectData.client_amount_paid !== null ||
            defectData.brand_reimbursement_amount !== null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <h2 className="font-semibold text-gray-900">Financeiro</h2>
              {defectData.piece_cost !== null && (
                <p className="text-sm">
                  Custo da peça:{' '}
                  <strong>R$ {Number(defectData.piece_cost).toFixed(2)}</strong>
                </p>
              )}
              {(defectData.client_amount_paid !== null || defectData.client_resolution_type) && (
                <p className="text-sm">
                  Resolução com cliente:{' '}
                  <strong>
                    {defectData.client_resolution_type
                      ? CLIENT_RESOLUTION_LABELS[defectData.client_resolution_type] ?? defectData.client_resolution_type
                      : '—'}
                  </strong>
                  {defectData.client_amount_paid !== null && (
                    <span className="ml-1">· R$ {Number(defectData.client_amount_paid).toFixed(2)}</span>
                  )}
                  {defectData.client_paid_at && (
                    <span className="text-gray-500 ml-1">
                      em {format(new Date(defectData.client_paid_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                </p>
              )}
              {defectData.brand_reimbursement_amount !== null && (
                <p className="text-sm">
                  Recebido da marca:{' '}
                  <strong>R$ {Number(defectData.brand_reimbursement_amount).toFixed(2)}</strong>
                  {defectData.brand_reimbursed_at && (
                    <span className="text-gray-500 ml-1">
                      em {format(new Date(defectData.brand_reimbursed_at), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {defectData.reimbursement_method && (
                    <span className="text-gray-500 ml-1">
                      · {REIMBURSEMENT_LABELS[defectData.reimbursement_method] ?? defectData.reimbursement_method}
                    </span>
                  )}
                </p>
              )}
              {defectData.reimbursement_nf_number && (
                <p className="text-sm">
                  NF de reembolso: <strong>{defectData.reimbursement_nf_number}</strong>
                </p>
              )}
              {defectData.boleto_number && (
                <p className="text-sm">Boleto: <strong>{defectData.boleto_number}</strong></p>
              )}
              {defectData.boleto_original_value !== null && (
                <p className="text-sm">
                  Valor original do boleto: <strong>R$ {Number(defectData.boleto_original_value).toFixed(2)}</strong>
                </p>
              )}
              {defectData.boleto_updated_value !== null && (
                <p className="text-sm">
                  Valor atualizado do boleto: <strong>R$ {Number(defectData.boleto_updated_value).toFixed(2)}</strong>
                </p>
              )}
            </div>
          )}

          {/* Fiscal data */}
          {(defectData.fiscal_nf || defectData.fiscal_razao_social || defectData.fiscal_endereco ||
            defectData.fiscal_icms !== null || defectData.fiscal_aliquota !== null ||
            defectData.fiscal_frete !== null || defectData.fiscal_desconto !== null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <h2 className="font-semibold text-gray-900">Dados Fiscais</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {defectData.fiscal_nf && (
                  <div><dt className="text-gray-500">Nº Nota Fiscal</dt><dd className="font-medium">{defectData.fiscal_nf}</dd></div>
                )}
                {defectData.fiscal_razao_social && (
                  <div><dt className="text-gray-500">Razão Social</dt><dd className="font-medium">{defectData.fiscal_razao_social}</dd></div>
                )}
                {defectData.fiscal_icms !== null && (
                  <div><dt className="text-gray-500">ICMS (R$)</dt><dd className="font-medium">{Number(defectData.fiscal_icms).toFixed(2)}</dd></div>
                )}
                {defectData.fiscal_aliquota !== null && (
                  <div><dt className="text-gray-500">Alíquota (%)</dt><dd className="font-medium">{defectData.fiscal_aliquota}</dd></div>
                )}
                {defectData.fiscal_frete !== null && (
                  <div><dt className="text-gray-500">Frete (R$)</dt><dd className="font-medium">{Number(defectData.fiscal_frete).toFixed(2)}</dd></div>
                )}
                {defectData.fiscal_desconto !== null && (
                  <div><dt className="text-gray-500">Desconto (R$)</dt><dd className="font-medium">{Number(defectData.fiscal_desconto).toFixed(2)}</dd></div>
                )}
                {defectData.fiscal_endereco && (
                  <div className="col-span-2"><dt className="text-gray-500">Endereço de Envio</dt><dd className="font-medium">{defectData.fiscal_endereco}</dd></div>
                )}
              </dl>
            </div>
          )}

          {/* Photos */}
          <PhotoUpload
            defectId={defectData.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            photos={(photos ?? []) as any}
          />
        </div>
      </div>

      {/* Fiscal data editor — visible at emissao_nf stage */}
      {defectData.current_stage === 'emissao_nf' && (
        <FiscalDataEditor defect={defectData} />
      )}

      {/* Brand communication log */}
      {showBrandComms && (
        <BrandCommLog
          defectId={defectData.id}
          userId={user.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialComms={(brandComms ?? []) as any}
        />
      )}

      {/* Stage advancement */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Ações</h2>
        <StageAdvancer defect={defectData} userId={user.id} userRole={profile.role} />
      </div>

      {/* Brand Contacts */}
      {brandContacts && brandContacts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Contatos da marca — {defectData.brand?.name}
          </h2>
          <ul className="space-y-3">
            {brandContacts.map((c: any) => (
              <li key={c.id} className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                {c.phone && <PhoneReveal phone={c.phone} />}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">
                    {c.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Histórico</h2>
        <HistoryList history={(history ?? []) as any} />
      </div>
    </div>
  )
}
