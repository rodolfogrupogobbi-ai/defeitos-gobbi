import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rotas que não precisam de dispositivo confiável
const PUBLIC_PATHS = ['/login', '/verificar-dispositivo']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isApiPath = pathname.startsWith('/api/')

  // Não autenticado → login (exceto rotas públicas e API)
  if (!user && !isPublicPath && !isApiPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const cookieName = `trusted_device_${user.id}`
    const trusted = request.cookies.get(cookieName)

    // Usuário autenticado, dispositivo confiável ou rota de API → rota pública → sem restrição extra
    if (!trusted && !isPublicPath && !isApiPath) {
      // Dispositivo não confiável: bloquear acesso ao app
      return NextResponse.redirect(new URL('/verificar-dispositivo', request.url))
    }

    if (pathname === '/login') {
      // Já logado: redirecionar para o lugar certo
      return NextResponse.redirect(
        new URL(trusted ? '/kanban' : '/verificar-dispositivo', request.url)
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
