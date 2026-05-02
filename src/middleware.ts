import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/verificar-dispositivo']

export async function middleware(request: NextRequest) {
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

  if (!user) {
    if (isApiPath) {
      // Cron routes authenticate via CRON_SECRET in the handler — let them through
      if (!pathname.startsWith('/api/cron/')) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
    } else if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (user) {
    const cookieName = `trusted_device_${user.id}`
    const trusted = request.cookies.get(cookieName)

    if (!trusted && !isPublicPath && !isApiPath) {
      return NextResponse.redirect(new URL('/verificar-dispositivo', request.url))
    }

    if (pathname === '/login') {
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
