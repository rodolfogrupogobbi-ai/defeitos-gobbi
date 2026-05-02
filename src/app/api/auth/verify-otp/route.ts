import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('device_verifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return NextResponse.json({ ok: false })

  // Deletar código usado
  await admin.from('device_verifications').delete().eq('id', data.id)

  // Setar cookie de dispositivo confiável (30 dias)
  const cookieName = `trusted_device_${user.id}`
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName, '1', {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  return response
}
