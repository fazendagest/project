import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { OffersClient } from '@/components/financial/offers-client'
import { getIfagPrices } from '@/lib/ifag'
import { OFFER_DAYS, type SaleOffer } from '@/lib/sale-offers'
import { todaySP } from '@/lib/fixed-expenses'

/** Ofertas recebidas (Tião, P10): uso interno, para comparar antes de fechar a venda. */
export default async function OffersPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const today = todaySP()
  const since = new Date(new Date(today + 'T12:00:00').getTime() - OFFER_DAYS * 86_400_000).toISOString().slice(0, 10)
  const [{ data: offers }, { data: animals }, ifag] = await Promise.all([
    supabase.from('sale_offers').select('*').eq('farm_id', farmId).gte('offer_date', since).order('offer_date', { ascending: false }),
    supabase.from('animals').select('id, code, name, species, sex, birth_date, breed, is_breeder, is_fat, weight_arrobas, status').eq('farm_id', farmId).order('code'),
    getIfagPrices(),
  ])

  return (
    <div>
      <PageHeader
        title="Ofertas recebidas"
        description="Compare o que cada comprador ofereceu antes de fechar."
        back={{ href: '/app/financial/movements?aba=vendas', label: 'Vendas' }}
      />
      <OffersClient initialOffers={(offers ?? []) as SaleOffer[]} animals={animals ?? []} farmId={farmId} ifag={ifag} today={today} />
    </div>
  )
}
