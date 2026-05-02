import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DefectEditForm } from '@/components/defect/DefectEditForm'

export default async function EditDefectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: defect },
    { data: companies },
    { data: brands },
    { data: defectTypes },
  ] = await Promise.all([
    supabase.from('defects').select('*').eq('id', id).is('deleted_at', null).single(),
    supabase.from('companies').select('*').eq('active', true).order('name'),
    supabase.from('brands').select('*').eq('active', true).order('name'),
    supabase.from('defect_types').select('*').eq('active', true).order('name'),
  ])

  if (!defect) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Editar Defeito</h1>
      <DefectEditForm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defect={defect as any}
        companies={companies ?? []}
        brands={brands ?? []}
        defectTypes={defectTypes ?? []}
      />
    </div>
  )
}
