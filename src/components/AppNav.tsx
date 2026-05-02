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
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0"
      style={{ width: 'var(--sidebar-width)', background: 'var(--navy)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--navy-light)' }}>
        <span className="font-bold text-white text-base leading-tight block">Grupo Gobbi</span>
        <span className="text-xs mt-0.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Controle de Defeitos
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.filter(l => l.show).map(l => {
          const active = pathname.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                active
                  ? { background: 'var(--orange)', color: '#fff' }
                  : { color: 'rgba(255,255,255,0.75)' }
              }
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--navy-light)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = ''
              }}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--navy-light)' }}>
        <p className="text-xs font-medium text-white truncate">{profile.name}</p>
        <button
          onClick={handleLogout}
          className="mt-1 text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
