import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ThirdPartyClient } from '@/components/pasture/third-party-client'

export default async function PasturePage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const { data: herds } = await supabase
    .from('third_party_herds')
    .select('*')
    .eq('farm_id', farmId)
    .order('entry_date', { ascending: false })

  return (
    <div>
      <PageHeader title="Gado de terceiros" description="Aluguel de pasto e parceria com gado de outras pessoas" />
      <ThirdPartyClient initialHerds={herds ?? []} farmId={farmId} />
    </div>
  )
}
