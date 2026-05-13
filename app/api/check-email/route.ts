import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ exists: false })

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return NextResponse.json({ exists: false })

    const exists = data.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
    return NextResponse.json({ exists })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
