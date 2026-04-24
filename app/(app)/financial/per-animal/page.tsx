import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { PerAnimalClient } from '@/components/financial/per-animal-client'

export default async function PerAnimalPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const { data } = await supabase
    .from('animal_costs')
    .select('*')
    .eq('farm_id', farmId)
    .order('entry_date', { ascending: false })

  return (
    <div>
      <PageHeader title="Rentabilidade por Animal" description="Custo, venda e lucro por animal" />
      <PerAnimalClient initialData={data ?? []} />
    </div>
  )
}
