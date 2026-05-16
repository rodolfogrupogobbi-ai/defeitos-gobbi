'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { WhatsAppReminderModal } from '@/components/defect/WhatsAppReminderModal'
import type { Company, Brand, DefectType, Profile } from '@/types'
import { LOJA_ORIGEM_OPTIONS } from '@/types'
import type { TemplateVars } from '@/lib/whatsapp'

const schema = z.object({
  company_id: z.string().min(1, 'Selecione a empresa'),
  brand_id: z.string().min(1, 'Selecione a marca'),
  product_name: z.string().min(1, 'Informe o produto'),
  reference: z.string().min(1, 'Informe a referência'),
  color: z.string().optional(),
  size: z.string().optional(),
  nf_number: z.string().optional(),
  nf_factory: z.string().optional(),
  cod_use: z.string().optional(),
  piece_cost: z.string().optional(),
  defect_type_id: z.string().min(1, 'Selecione o tipo de defeito'),
  client_name: z.string().min(1, 'Informe o nome do cliente'),
  client_phone: z.string().min(8, 'Informe o telefone'),
  client_code: z.string().optional(),
  notes: z.string().optional(),
  received_at: z.string().min(1, 'Informe a data'),
  received_by: z.string().min(1, 'Selecione quem recebeu'),
  received_by_name: z.string().optional(),
  loja_origem: z.string().min(1, 'Selecione a loja de origem'),
})
type FormData = z.infer<typeof schema>

interface Props {
  companies: Company[]
  brands: Brand[]
  defectTypes: DefectType[]
  profiles: Profile[]
  currentUserId: string
}

export function DefectForm({ companies, brands, defectTypes, profiles, currentUserId }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newType, setNewType] = useState('')
  const [brandList, setBrandList] = useState(brands)
  const [typeList, setTypeList] = useState(defectTypes)
  const [waReminder, setWaReminder] = useState<{ defectId: string; phone: string; templateVars: TemplateVars } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      received_at: new Date().toISOString().split('T')[0],
      received_by: currentUserId,
    },
  })

  const receivedByValue = watch('received_by')

  async function addBrand() {
    if (!newBrand.trim()) return
    const supabase = createClient()
    const { data } = await supabase
      .from('brands')
      .insert({ name: newBrand.trim() })
      .select()
      .single()
    if (data) {
      setBrandList(prev => [...prev, data])
      setValue('brand_id', data.id)
      setNewBrand('')
    }
  }

  async function addType() {
    if (!newType.trim()) return
    const supabase = createClient()
    const { data } = await supabase
      .from('defect_types')
      .insert({ name: newType.trim(), created_by: currentUserId })
      .select()
      .single()
    if (data) {
      setTypeList(prev => [...prev, data])
      setValue('defect_type_id', data.id)
      setNewType('')
    }
  }

  async function generateProtocol(receivedAt: string): Promise<string> {
    const supabase = createClient()
    const date = new Date(receivedAt)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const lastDay = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    const { count } = await supabase
      .from('defects')
      .select('*', { count: 'exact', head: true })
      .gte('received_at', firstDay)
      .lt('received_at', lastDay)
    const seq = String((count ?? 0) + 1).padStart(3, '0')
    const mm = String(month).padStart(2, '0')
    return `${seq}${mm}${year}`
  }

  async function onSubmit(data: FormData) {
    const isOutro = data.received_by === '__outro__'
    if (isOutro && !data.received_by_name?.trim()) {
      setError('Informe o nome do responsável')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const protocol_number = await generateProtocol(data.received_at)
    const receivedBy = isOutro ? currentUserId : data.received_by
    const receivedByName = isOutro ? (data.received_by_name?.trim() ?? null) : null
    // Exclude received_by and received_by_name from spread; handle them explicitly
    const { received_by: _rb, received_by_name: _rbn, ...baseData } = data
    const insertPayload: Record<string, unknown> = {
      ...baseData,
      received_by: receivedBy,
      client_code: data.client_code || null,
      nf_factory: data.nf_factory || null,
      notes: data.notes || null,
      piece_cost: data.piece_cost ? parseFloat(data.piece_cost) : null,
      current_stage: 'received',
      protocol_number,
    }
    if (receivedByName !== null) insertPayload.received_by_name = receivedByName
    const { data: defect, error: err } = await supabase
      .from('defects')
      .insert(insertPayload)
      .select()
      .single()
    if (err) {
      setError('Erro ao salvar. Tente novamente.')
      setSaving(false)
      return
    }
    await supabase.from('defect_history').insert({
      defect_id: defect.id,
      from_stage: null,
      to_stage: 'received',
      changed_by: currentUserId,
    })
    const brand = brandList.find(b => b.id === data.brand_id)?.name ?? ''
    const company = companies.find(c => c.id === data.company_id)?.name ?? ''
    setWaReminder({
      defectId: defect.id,
      phone: data.client_phone,
      templateVars: {
        client_name: data.client_name,
        product_name: data.product_name,
        brand,
        company,
        received_at: new Date(data.received_at).toLocaleDateString('pt-BR'),
        protocol: protocol_number,
      },
    })
    setSaving(false)
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Empresa *"
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Selecione"
            error={errors.company_id?.message}
            {...register('company_id')}
          />
          <div className="flex flex-col gap-1">
            <Select
              label="Marca *"
              options={brandList.map(b => ({ value: b.id, label: b.name }))}
              placeholder="Selecione"
              error={errors.brand_id?.message}
              {...register('brand_id')}
            />
            <div className="flex gap-2 mt-1">
              <input
                value={newBrand}
                onChange={e => setNewBrand(e.target.value)}
                placeholder="Nova marca..."
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={addBrand}
                className="text-xs text-blue-600 hover:underline"
              >
                + Adicionar
              </button>
            </div>
          </div>
        </div>

        <Select
          label="Loja de origem do defeito *"
          options={LOJA_ORIGEM_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          placeholder="Selecione"
          error={errors.loja_origem?.message}
          {...register('loja_origem')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Produto *" error={errors.product_name?.message} {...register('product_name')} />
          <Input label="Referência *" error={errors.reference?.message} {...register('reference')} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Cor" {...register('color')} />
          <Input label="Tamanho" {...register('size')} />
          <Input label="NF (venda ao cliente)" {...register('nf_number')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="NF de origem da fábrica" {...register('nf_factory')} />
          <Input label="Cód. Use" {...register('cod_use')} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Valor de custo da peça <span className="text-gray-400 font-normal">(R$)</span>
          </label>
          <Input type="number" step="0.01" min="0" placeholder="0,00" {...register('piece_cost')} />
        </div>

        <div className="flex flex-col gap-1">
          <Select
            label="Tipo de defeito *"
            options={typeList.map(t => ({ value: t.id, label: t.name }))}
            placeholder="Selecione"
            error={errors.defect_type_id?.message}
            {...register('defect_type_id')}
          />
          <div className="flex gap-2 mt-1">
            <input
              value={newType}
              onChange={e => setNewType(e.target.value)}
              placeholder="Novo tipo..."
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
            />
            <button
              type="button"
              onClick={addType}
              className="text-xs text-blue-600 hover:underline"
            >
              + Adicionar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome do cliente *"
            error={errors.client_name?.message}
            {...register('client_name')}
          />
          <Input
            label="Telefone (WhatsApp) *"
            error={errors.client_phone?.message}
            {...register('client_phone')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Código do cliente{' '}
            <span className="text-gray-400 font-normal">(PDV)</span>
          </label>
          <Input
            {...register('client_code')}
            placeholder="Opcional — código do cliente no sistema da loja"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Observações <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Detalhes adicionais sobre o defeito ou situação do cliente..."
            className="border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data de recebimento *"
            type="date"
            error={errors.received_at?.message}
            {...register('received_at')}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Recebido por *</label>
            <select
              {...register('received_by')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="__outro__">Outro (escreva o responsável)</option>
            </select>
            {receivedByValue === '__outro__' && (
              <input
                {...register('received_by_name')}
                placeholder="Nome completo do responsável"
                className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            )}
            {errors.received_by && (
              <p className="text-xs text-red-600">{errors.received_by.message}</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Defeito'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>

      {waReminder && (
        <WhatsAppReminderModal
          open={true}
          defectId={waReminder.defectId}
          phone={waReminder.phone}
          stage="received"
          userId={currentUserId}
          templateVars={waReminder.templateVars}
          onDone={() => router.push(`/defeito/${waReminder.defectId}`)}
        />
      )}
    </>
  )
}
