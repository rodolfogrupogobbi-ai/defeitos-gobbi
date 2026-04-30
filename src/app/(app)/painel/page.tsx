import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canAccessDashboard } from '@/lib/permissions'

export default async function PainelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !canAccessDashboard(profile.role)) redirect('/kanban')
  return <div className="text-gray-500">Painel em construção...</div>
}
