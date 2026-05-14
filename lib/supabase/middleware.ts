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

  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/anunciar') ||
    pathname.startsWith('/anuncio/') ||
    pathname.startsWith('/eventos/') ||
    pathname.startsWith('/api/')

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === '/login' || pathname.startsWith('/register'))) {
    const redirectUrl = request.nextUrl.clone()
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    redirectUrl.pathname = isAdmin ? '/admin/dashboard' : '/app/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname.startsWith('/app/')) {
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

    if (isAdmin) {
      const impersonatingFarmId = request.cookies.get('admin_viewing_farm_id')?.value
      if (!impersonatingFarmId) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    } else {
      const skipFarmCheck =
        pathname.startsWith('/app/onboarding') ||
        pathname.startsWith('/app/suspended')

      if (!skipFarmCheck) {
        const { data: farm } = await supabase
          .from('farms')
          .select('is_active')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!farm) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/app/onboarding'
          return NextResponse.redirect(redirectUrl)
        }

        if (!farm.is_active) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/app/suspended'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }
  }

  return supabaseResponse
}
