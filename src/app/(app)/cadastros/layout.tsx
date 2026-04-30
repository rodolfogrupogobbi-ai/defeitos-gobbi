import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CadastrosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/kanban')

  const tabs = [
    { href: '/cadastros/marcas', label: 'Marcas' },
    { href: '/cadastros/tipos', label: 'Tipos de Defeito' },
    { href: '/cadastros/usuarios', label: 'Usuários' },
    { href: '/cadastros/whatsapp', label: 'Mensagens WhatsApp' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Cadastros</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-600 transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}
