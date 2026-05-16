import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const allowed = [
    'company_id', 'brand_id', 'product_name', 'reference', 'color', 'size',
    'nf_number', 'nf_factory', 'cod_use', 'piece_cost', 'client_amount_paid',
    'defect_type_id', 'client_name', 'client_phone', 'client_code', 'received_at',
    'notes', 'client_resolution_type', 'received_by_name',
    'reimbursement_nf_number', 'boleto_number', 'boleto_original_value', 'boleto_updated_value',
    'fiscal_icms', 'fiscal_aliquota', 'fiscal_frete', 'fiscal_desconto',
    'fiscal_nf', 'fiscal_endereco', 'fiscal_razao_social',
    'loja_origem',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('defects')
    .update(update)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await supabase
    .from('defects')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
