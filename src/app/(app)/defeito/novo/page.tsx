import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DefectForm } from '@/components/defect/DefectForm'

export default async function NovoDefeitoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: companies },
    { data: brands },
    { data: defectTypes },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('companies').select('*').eq('active', true).order('name'),
    supabase.from('brands').select('*').eq('active', true).order('name'),
    supabase.from('defect_types').select('*').eq('active', true).order('name'),
    supabase.from('profiles').select('*').order('name'),
  ])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Registrar Novo Defeito</h1>
      <DefectForm
        companies={companies ?? []}
        brands={brands ?? []}
        defectTypes={defectTypes ?? []}
        profiles={profiles ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
