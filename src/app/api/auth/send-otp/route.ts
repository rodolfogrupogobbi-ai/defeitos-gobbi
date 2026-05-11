import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { trustedDeviceCookieValue } from '@/lib/cookie-hmac'

const resend = new Resend(process.env.RESEND_API_KEY)
const RATE_LIMIT_MS = 90 * 1000 // 90 seconds between sends

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cookieName = `trusted_device_${user.id}`
  const trusted = request.cookies.get(cookieName)
  const expectedValue = await trustedDeviceCookieValue(user.id)
  if (trusted?.value === expectedValue) {
    return NextResponse.json({ skip: true })
  }

  const admin = createAdminClient()

  // Rate limit: check for any code (even expired) created within the last 90 seconds
  const { data: recent } = await admin
    .from('device_verifications')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - RATE_LIMIT_MS).toISOString())
    .maybeSingle()

  if (recent) {
    return NextResponse.json({ otp_sent: false, rateLimited: true })
  }

  // No valid unexpired code — generate a new one
  const { data: existing } = await admin
    .from('device_verifications')
    .select('id')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!existing) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await admin.from('device_verifications').delete().eq('user_id', user.id)
    await admin.from('device_verifications').insert({
      user_id: user.id,
      code,
      expires_at: expiresAt,
    })

    await resend.emails.send({
      from: 'Defeitos Gobbi <onboarding@resend.dev>',
      to: user.email,
      subject: 'Código de verificação — Defeitos Gobbi',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Novo dispositivo detectado</h2>
          <p>Seu código de verificação é:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">Válido por 10 minutos. Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ otp_sent: true })
}
