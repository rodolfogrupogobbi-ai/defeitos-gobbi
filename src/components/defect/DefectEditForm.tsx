'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Defect, Company, Brand, DefectType } from '@/types'

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
  defect: Defect
  companies: Company[]
  brands: Brand[]
  defectTypes: DefectType[]
}

export function DefectEditForm({ defect, companies, brands, defectTypes }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_id: defect.company_id,
      brand_id: defect.brand_id,
      product_name: defect.product_name,
      reference: defect.reference,
      color: defect.color ?? '',
      size: defect.size ?? '',
      nf_number: defect.nf_number ?? '',
      nf_factory: defect.nf_factory ?? '',
      cod_use: defect.cod_use ?? '',
      piece_cost: defect.piece_cost != null ? String(defect.piece_cost) : '',
      client_amount_paid: defect.client_amount_paid != null ? String(defect.client_amount_paid) : '',
      defect_type_id: defect.defect_type_id,
      client_name: defect.client_name,
      client_phone: defect.client_phone,
      client_code: defect.client_code ?? '',
      received_at: defect.received_at.split('T')[0],
    },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/defects/${defect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        color: data.color || null,
        size: data.size || null,
        nf_number: data.nf_number || null,
        nf_factory: data.nf_factory || null,
        cod_use: data.cod_use || null,
        client_code: data.client_code || null,
        piece_cost: data.piece_cost ? parseFloat(data.piece_cost) : null,
        client_amount_paid: data.client_amount_paid ? parseFloat(data.client_amount_paid) : null,
      }),
    })
    const result = await res.json()
    if (!result.ok) {
      setError('Erro ao salvar. Tente novamente.')
      setSaving(false)
      return
    }
    router.push(`/defeito/${defect.id}`)
    router.refresh()
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
        <Select
          label="Marca *"
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          placeholder="Selecione"
          error={errors.brand_id?.message}
          {...register('brand_id')}
        />
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

      <Select
        label="Tipo de defeito *"
        options={defectTypes.map(t => ({ value: t.id, label: t.name }))}
        placeholder="Selecione"
        error={errors.defect_type_id?.message}
        {...register('defect_type_id')}
      />

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
          Código do cliente <span className="text-gray-400 font-normal">(PDV)</span>
        </label>
        <Input {...register('client_code')} placeholder="Opcional" />
      </div>

      <Input
        label="Data de recebimento *"
        type="date"
        error={errors.received_at?.message}
        {...register('received_at')}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
