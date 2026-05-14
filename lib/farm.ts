'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Farm } from '@/types'

export async function getOrCreateFarm(): Promise<Farm | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (isAdmin) {
    const cookieStore = cookies()
    const impersonatedFarmId = cookieStore.get('admin_viewing_farm_id')?.value
    if (impersonatedFarmId) {
      const { data: farm } = await supabase
        .from('farms')
        .select('*')
        .eq('id', impersonatedFarmId)
        .single()
      return farm ?? null
    }
    return null
  }

  const { data: farms } = await supabase
    .from('farms')
    .select('*')
    .eq('owner_id', user.id)
    .limit(1)

  return farms?.[0] ?? null
}

export async function getFarmId(): Promise<string | null> {
  const farm = await getOrCreateFarm()
  return farm?.id ?? null
}
