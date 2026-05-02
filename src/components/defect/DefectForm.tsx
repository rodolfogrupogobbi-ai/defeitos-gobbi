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
import type { Company, Brand, DefectType } from '@/types'

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
  client_amount_paid: z.string().optional(),
  defect_type_id: z.string().min(1, 'Selecione o tipo de defeito'),
  client_name: z.string().min(1, 'Informe o nome do cliente'),
  client_phone: z.string().min(8, 'Informe o telefone'),
  client_code: z.string().optional(),
  received_at: z.string().min(1, 'Informe a data'),
})
type FormData = z.infer<typeof schema>

interface Props {
  companies: Company[]
  brands: Brand[]
  defectTypes: DefectType[]
  receivedBy: string
  receivedByName: string
}

export function DefectForm({ companies, brands, defectTypes, receivedBy, receivedByName }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newType, setNewType] = useState('')
  const [brandList, setBrandList] = useState(brands)
  const [typeList, setTypeList] = useState(defectTypes)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { received_at: new Date().toISOString().split('T')[0] },
  })

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
      .insert({ name: newType.trim(), created_by: receivedBy })
      .select()
      .single()
    if (data) {
      setTypeList(prev => [...prev, data])
      setValue('defect_type_id', data.id)
      setNewType('')
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: defect, error: err } = await supabase
      .from('defects')
      .insert({
        ...data,
        client_code: data.client_code || null,
        nf_factory: data.nf_factory || null,
        piece_cost: data.piece_cost ? parseFloat(data.piece_cost) : null,
        client_amount_paid: data.client_amount_paid ? parseFloat(data.client_amount_paid) : null,
        received_by: receivedBy,
        current_stage: 'received',
      })
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
      changed_by: receivedBy,
    })
    router.push(`/defeito/${defect.id}`)
  }

  return (
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Valor de custo da peça <span className="text-gray-400 font-normal">(R$)</span>
          </label>
          <Input type="number" step="0.01" min="0" placeholder="0,00" {...register('piece_cost')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Valor pago pelo cliente <span className="text-gray-400 font-normal">(R$)</span>
          </label>
          <Input type="number" step="0.01" min="0" placeholder="0,00" {...register('client_amount_paid')} />
        </div>
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

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Data de recebimento *"
          type="date"
          error={errors.received_at?.message}
          {...register('received_at')}
        />
        <Input
          label="Recebido por"
          value={receivedByName}
          readOnly
          className="bg-gray-50"
        />
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
  )
}
