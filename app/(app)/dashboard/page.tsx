import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { UpcomingBirths } from '@/components/dashboard/upcoming-births'
import { LowStock } from '@/components/dashboard/low-stock'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { PlantelSummaryTable } from '@/components/financial/plantel-summary-table'
import { formatCurrency } from '@/lib/helpers'
import { buildPlantelRows } from '@/lib/plantel-utils'
import { PawPrint, TrendingUp, DollarSign, Package } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()

  if (!farmId) {
    return <div className="p-8 text-center text-muted-foreground">Inicializando fazenda...</div>
  }

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const yearStart = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd')

  const [
    { data: animals },
    { data: sales },
    { data: purchases },
    { data: feedExpenses },
    { data: opExpenses },
    { data: healthExpenses },
    { data: animalCosts },
    { data: yearSales },
  ] = await Promise.all([
    supabase.from('animals').select('id, species, status, market_value').eq('farm_id', farmId),
    supabase.from('animal_sales').select('sale_price, sale_date').eq('farm_id', farmId).gte('sale_date', monthStart).lte('sale_date', monthEnd),
    supabase.from('animal_purchases').select('purchase_price, purchase_date').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('feed_stock').select('total_cost, purchase_date').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('operational_expenses').select('amount, date').eq('farm_id', farmId).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('health_records').select('cost, application_date').eq('farm_id', farmId).gte('application_date', monthStart).lte('application_date', monthEnd),
    supabase.from('animal_costs').select('animal_id, species, total_cost').eq('farm_id', farmId).eq('status', 'ativo'),
    supabase.from('animal_sales').select('sale_price').eq('farm_id', farmId).gte('sale_date', yearStart),
  ])

  const activeAnimals = animals?.filter(a => a.status === 'ativo') ?? []
  const plantelRows = buildPlantelRows(animalCosts ?? [], activeAnimals)
  const totalAtivos = activeAnimals.length
  const bovinos = activeAnimals.filter(a => a.species === 'bovino').length
  const equinos = activeAnimals.filter(a => a.species === 'equino').length
  const suinos = activeAnimals.filter(a => a.species === 'suino').length

  const revenue = sales?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
  const yearRevenue = yearSales?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
  const totalCosts =
    (purchases?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0) +
    (feedExpenses?.reduce((s, r) => s + (r.total_cost || 0), 0) ?? 0) +
    (opExpenses?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0) +
    (healthExpenses?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0)
  const netProfit = revenue - totalCosts
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={format(now, "MMMM 'de' yyyy", { locale: undefined })}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Animais Ativos"
          value={totalAtivos}
          subtitle={`${bovinos} bov · ${equinos} equ · ${suinos} sui`}
          icon={PawPrint}
          iconColor="text-green-700"
          iconBg="bg-green-100"
        />
        <StatCard
          title="Faturamento Mês"
          value={formatCurrency(revenue)}
          subtitle={`Acumulado ${now.getFullYear()}: ${formatCurrency(yearRevenue)}`}
          icon={DollarSign}
          iconColor="text-blue-700"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Lucro Líquido"
          value={formatCurrency(netProfit)}
          subtitle={`Margem: ${margin.toFixed(1)}%`}
          icon={TrendingUp}
          iconColor={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}
          iconBg={netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}
        />
        <StatCard
          title="Total Gastos"
          value={formatCurrency(totalCosts)}
          icon={Package}
          iconColor="text-orange-700"
          iconBg="bg-orange-100"
        />
      </div>

      {plantelRows.length > 0 && (
        <div className="mb-6">
          <PlantelSummaryTable rows={plantelRows} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2">
          <DashboardCharts farmId={farmId} />
        </div>
        <div className="space-y-4">
          <UpcomingBirths farmId={farmId} />
          <LowStock farmId={farmId} />
        </div>
      </div>

      <RecentTransactions farmId={farmId} />
    </div>
  )
}
