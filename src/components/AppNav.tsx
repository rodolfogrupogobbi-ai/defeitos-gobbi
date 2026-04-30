'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccessDashboard, canManageCatalog } from '@/lib/permissions'
import type { Profile } from '@/types'

export function AppNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/kanban', label: 'Kanban', show: true },
    { href: '/painel', label: 'Painel Gerencial', show: canAccessDashboard(profile.role) },
    { href: '/cadastros/marcas', label: 'Cadastros', show: canManageCatalog(profile.role) },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Grupo Gobbi</span>
          <div className="flex gap-1">
            {links.filter(l => l.show).map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{profile.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}
