import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ACTIVE_STAGES } from '@/types'

export default async function KanbanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: defects } = await supabase
    .from('defects')
    .select('*, company:companies(*), brand:brands(*), defect_type:defect_types(*)')
    .in('current_stage', ACTIVE_STAGES)
    .is('deleted_at', null)
    .order('received_at', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Visão Geral</h1>
      <KanbanBoard defects={defects ?? []} />
    </div>
  )
}
