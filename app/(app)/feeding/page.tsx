import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { FeedingClient } from '@/components/feeding/feeding-client'

export default async function FeedingPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: stock }, { data: records }] = await Promise.all([
    supabase.from('feed_stock').select('*').eq('farm_id', farmId).order('product_name'),
    supabase
      .from('feed_records')
      .select('*, feed_stock:feed_stock_id(product_name, unit)')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(100),
  ])

  return (
    <div>
      <PageHeader title="Alimentação" description="Controle de estoque e consumo de ração" />
      <FeedingClient initialStock={stock ?? []} initialRecords={records ?? []} farmId={farmId} />
    </div>
  )
}
