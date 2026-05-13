import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ exists: false })

    let admin
    try {
      admin = createAdminClient()
    } catch {
      // SUPABASE_SERVICE_ROLE_KEY not configured — can't check
      return NextResponse.json({ error: 'not_configured' }, { status: 500 })
    }

    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return NextResponse.json({ error: 'list_failed' }, { status: 500 })

    const exists = data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}
