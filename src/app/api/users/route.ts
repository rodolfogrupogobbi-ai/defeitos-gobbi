import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
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

  const { email, password, name, role } = await request.json()
  if (!email || !password || !name || !['admin', 'cashier'].includes(role)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: authUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('profiles').insert({ id: authUser.user.id, name, role })
  return NextResponse.json({ ok: true })
}
