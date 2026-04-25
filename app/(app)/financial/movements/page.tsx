import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ExpensesClient } from '@/components/financial/movements-client'

export default async function MovementsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: expenses }, { data: purchases }, { data: sales }, { data: feedStock }, { data: healthRecords }, { data: animals }] = await Promise.all([
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId).order('date', { ascending: false }),
    supabase.from('animal_purchases').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('animal_sales').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('sale_date', { ascending: false }),
    supabase.from('feed_stock').select('*').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('health_records').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('application_date', { ascending: false }),
    supabase.from('animals').select('id, code, name').eq('farm_id', farmId).eq('status', 'ativo').order('code'),
  ])

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
        farmId={farmId}
      />
    </div>
  )
}
