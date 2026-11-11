import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ExpensesClient } from '@/components/financial/movements-client'
import { computeInvested } from '@/lib/investment'
import { getIfagPrices } from '@/lib/ifag'

export default async function MovementsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: expenses }, { data: purchases }, { data: sales }, { data: feedStock }, { data: healthRecords }, { data: animals }, { data: costs }, { data: allAnimals }, ifag] = await Promise.all([
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId).order('date', { ascending: false }),
    supabase.from('animal_purchases').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('animal_sales').select('*, animal:animal_id(code, name, sex, birth_date)').eq('farm_id', farmId).order('sale_date', { ascending: false }),
    supabase.from('feed_stock').select('*').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('health_records').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('application_date', { ascending: false }),
    supabase.from('animals').select('id, code, name, species, sex, birth_date, is_breeder').eq('farm_id', farmId).eq('status', 'ativo').order('code'),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost, species').eq('farm_id', farmId),
    supabase.from('animals').select('id, species, sex, birth_date, is_breeder, weight_arrobas, mother_id').eq('farm_id', farmId),
    getIfagPrices(),
  ])
  const invested = computeInvested(costs ?? [], feedStock ?? [], expenses ?? [], allAnimals ?? [])

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
      />
    </div>
  )
}
