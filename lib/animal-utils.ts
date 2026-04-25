import { createClient } from '@/lib/supabase/client'

const SPECIES_PREFIX: Record<string, string> = {
  bovino: 'BOV',
  equino: 'EQU',
  suino: 'SUI',
}

export async function generateAnimalCode(species: string, farmId: string): Promise<string> {
  const supabase = createClient()
  const prefix = SPECIES_PREFIX[species] ?? species.toUpperCase().slice(0, 3)

  const { data } = await supabase
    .from('animals')
    .select('code')
    .eq('farm_id', farmId)
    .like('code', `${prefix}-%`)
    .order('code', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const parts = data[0].code.split('-')
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10)
      if (!isNaN(num)) nextNum = num + 1
    }
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`
}
