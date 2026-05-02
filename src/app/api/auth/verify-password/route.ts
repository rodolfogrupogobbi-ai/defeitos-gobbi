import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  if (!password) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ ok: false })

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  return NextResponse.json({ ok: !error })
}
