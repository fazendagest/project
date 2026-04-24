'use server'

import { createClient } from '@/lib/supabase/server'
import type { Farm } from '@/types'

export async function getOrCreateFarm(): Promise<Farm | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: farm } = await supabase
    .from('farms')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (farm) return farm

  const { data: newFarm } = await supabase
    .from('farms')
    .insert({ owner_id: user.id, name: 'Minha Fazenda' })
    .select()
    .single()

  return newFarm
}

export async function getFarmId(): Promise<string | null> {
  const farm = await getOrCreateFarm()
  return farm?.id ?? null
}
