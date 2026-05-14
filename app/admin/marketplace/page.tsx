import { createAdminClient } from '@/lib/supabase/admin'
import { MarketplaceModeration } from './marketplace-moderation'

export const dynamic = 'force-dynamic'

export default async function AdminMarketplacePage() {
  const admin = createAdminClient()

  const [{ data: listings }, { data: events }] = await Promise.all([
    admin
      .from('listings')
      .select('id, category, title, city, state, seller_name, seller_phone, price, price_type, created_at, status')
      .order('created_at', { ascending: false }),
    admin
      .from('events')
      .select('id, title, type, start_date, end_date, city, state, organizer_name, created_at, status')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-1">Aprovar ou rejeitar anúncios e eventos</p>
      </div>
      <MarketplaceModeration listings={listings ?? []} events={events ?? []} />
    </div>
  )
}
