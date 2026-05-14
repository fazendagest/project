import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { farmId } = await request.json()
  if (!farmId) {
    return NextResponse.json({ error: 'farmId é obrigatório' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_viewing_farm_id', farmId, {
    httpOnly: true,
    maxAge: 7200,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return response
}
