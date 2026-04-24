import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { ExpensesClient } from '@/components/financial/expenses-client'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: expenses }, { data: purchases }, { data: sales }] = await Promise.all([
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId).order('date', { ascending: false }),
    supabase.from('animal_purchases').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('purchase_date', { ascending: false }),
    supabase.from('animal_sales').select('*, animal:animal_id(code, name)').eq('farm_id', farmId).order('sale_date', { ascending: false }),
  ])

  return (
    <div>
      <PageHeader title="Financeiro" description="Compras, vendas e despesas operacionais" />
      <ExpensesClient
        initialExpenses={expenses ?? []}
        initialPurchases={purchases ?? []}
        initialSales={sales ?? []}
        farmId={farmId}
      />
    </div>
  )
}
