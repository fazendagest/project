import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ExpensesClient } from '@/components/financial/movements-client'
import { computeInvested } from '@/lib/investment'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { getIfagPrices } from '@/lib/ifag'
import { computeOffer, paymentText, type OfferAnimal, type SaleOffer } from '@/lib/sale-offers'

export default async function MovementsPage({ searchParams }: { searchParams: { aba?: string; oferta?: string } }) {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: expenses }, { data: purchases }, { data: sales }, { data: feedStock }, { data: healthRecords }, { data: animals }, { data: costs }, { data: allAnimals }, ifag] = await Promise.all([
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId).order('date', { ascending: false }),
    supabase.from('animal_purchases').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('animal_sales').select('*, animal:animal_id(code, name, species, sex, birth_date, breed, is_breeder, is_fat)').eq('farm_id', farmId).order('sale_date', { ascending: false }),
    supabase.from('feed_stock').select('*').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('health_records').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('application_date', { ascending: false }),
    supabase.from('animals').select('id, code, name, species, sex, birth_date, breed, is_breeder, is_fat').eq('farm_id', farmId).eq('status', 'ativo').order('code'),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost, species').eq('farm_id', farmId),
    supabase.from('animals').select('id, code, name, species, sex, birth_date, breed, is_breeder, is_fat, weight_arrobas, mother_id, status').eq('farm_id', farmId),
    getIfagPrices(),
  ])
  const invested = computeInvested(costs ?? [], feedStock ?? [], expenses ?? [], allAnimals ?? [])

  // "Fechar com esta" nas Ofertas recebidas (Tião, P10): abre a venda já preenchida. Nada é gravado antes de salvar.
  let saleDraft = null
  const offerId = searchParams.oferta && /^[0-9a-f-]{36}$/i.test(searchParams.oferta) ? searchParams.oferta : null
  if (offerId) {
    const { data: offer } = await supabase.from('sale_offers').select('*').eq('id', offerId).eq('farm_id', farmId).maybeSingle()
    if (offer) {
      const o = offer as SaleOffer
      const byId = new Map(((allAnimals ?? []) as OfferAnimal[]).map(a => [a.id, a]))
      const r = computeOffer(o, byId, ifag)
      const ids = r.animals.filter(a => a.status === 'ativo').map(a => a.id)
      const notes = [
        `Oferta de ${formatDate(o.offer_date)}, ${paymentText(o)}`,
        o.freight_by === 'vendedor' ? `frete por sua conta ${formatCurrency(Number(o.freight_value ?? 0))}` : 'frete do comprador',
        o.notes,
      ].filter(Boolean).join('; ')
      saleDraft = {
        animal_ids: ids,
        buyer_name: o.buyer_name,
        sale_price: r.gross != null ? r.gross : null,
        weight: r.arrobas != null ? Math.round(r.arrobas) : null,
        price_per_arroba: o.price_kind === 'arroba' ? o.price : null,
        arroba_basis: o.arroba_basis,
        notes,
      }
    }
  }

  return (
    <div>
      <PageHeader title="Movimentações" description="Entradas e saídas da fazenda" />
      <ExpensesClient
        initialExpenses={expenses ?? []}
        initialPurchases={purchases ?? []}
        initialSales={sales ?? []}
        initialFeedStock={feedStock ?? []}
        initialHealthRecords={healthRecords ?? []}
        initialAnimals={animals ?? []}
        invested={invested}
        farmId={farmId}
        ifag={ifag}
        initialTab={searchParams.aba === 'vendas' || saleDraft ? 'sales' : 'expenses'}
        saleDraft={saleDraft}
      />
    </div>
  )
}
