import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' })

    const { data: defect, error: e1 } = await supabase
      .from('defects')
      .select(`*, company:companies(*), brand:brands(*), defect_type:defect_types(*), received_by_profile:profiles!received_by(*)`)
      .eq('id', id)
      .single()

    if (e1) return NextResponse.json({ step: 'defect query', error: e1.message, code: e1.code })
    if (!defect) return NextResponse.json({ step: 'defect', error: 'not found' })

    const d = defect as any
    const { data: brandContacts, error: e2 } = d.brand_id
      ? await supabase.from('brand_contacts').select('*').eq('brand_id', d.brand_id).order('name')
      : { data: [], error: null }

    if (e2) return NextResponse.json({ step: 'brand_contacts query', error: e2.message })

    return NextResponse.json({
      ok: true,
      defect_id: d.id,
      brand_id: d.brand_id,
      client_phone: d.client_phone,
      received_at: d.received_at,
      brand: d.brand,
      company: d.company,
      brandContactsCount: brandContacts?.length ?? 0,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
}
