import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !pathname.startsWith('/login')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    redirectUrl.pathname = isAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  if (user) {
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

    // Admin nunca acessa rotas de fazenda — redireciona sempre para /admin
    if (isAdmin && !pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin'
      return NextResponse.redirect(redirectUrl)
    }

    if (!isAdmin) {
      const skipFarmCheck =
        pathname.startsWith('/onboarding') ||
        pathname.startsWith('/suspended') ||
        pathname.startsWith('/api/')

      if (!skipFarmCheck) {
        const { data: farm } = await supabase
          .from('farms')
          .select('is_active')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!farm) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/onboarding'
          return NextResponse.redirect(redirectUrl)
        }

        if (farm && !farm.is_active) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/suspended'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }
  }

  return supabaseResponse
}
