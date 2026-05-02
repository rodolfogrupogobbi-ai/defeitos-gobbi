import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { code } = await request.json()

  // Validate format before hitting the DB
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false })
  }

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

  if (!data) {
    // Wrong code: delete ALL pending codes for this user to prevent brute force
    await admin.from('device_verifications').delete().eq('user_id', user.id)
    return NextResponse.json({ ok: false, expired: true })
  }

  await admin.from('device_verifications').delete().eq('id', data.id)

  const cookieName = `trusted_device_${user.id}`
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName, '1', {
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
  return response
}
