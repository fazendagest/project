import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? user : null
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { email, password, farmName, ownerName, phone, city, state, plan, trialEndsAt } = body

  if (!email || !password || !farmName) {
    return NextResponse.json({ error: 'Campos obrigatórios: email, password, farmName' }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()

  const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError || !newUser.user) {
    return NextResponse.json(
      { error: userError?.message ?? 'Erro ao criar usuário' },
      { status: 400 }
    )
  }

  const { data: farm, error: farmError } = await supabaseAdmin
    .from('farms')
    .insert({
      owner_id: newUser.user.id,
      name: farmName,
      owner_name: ownerName || null,
      phone: phone || null,
      city: city || null,
      state: state || null,
      plan: plan ?? 'trial',
      trial_ends_at: trialEndsAt || null,
    })
    .select()
    .single()

  if (farmError || !farm) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json(
      { error: farmError?.message ?? 'Erro ao criar fazenda' },
      { status: 400 }
    )
  }

  await supabaseAdmin.from('user_farms').insert({
    user_id: newUser.user.id,
    farm_id: farm.id,
    role: 'owner',
  })

  return NextResponse.json({ success: true, userId: newUser.user.id, farmId: farm.id })
}
