import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  if (!password) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ ok: false }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin.auth.signInWithPassword({
    email: user.email,
    password,
  })
  return NextResponse.json({ ok: !error })
}
