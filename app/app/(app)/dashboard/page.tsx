import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { UpcomingBirths } from '@/components/dashboard/upcoming-births'
import { LowStock } from '@/components/dashboard/low-stock'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { PlantelSummaryTable } from '@/components/financial/plantel-summary-table'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrencyCard } from '@/lib/helpers'
import { buildPlantelRows } from '@/lib/plantel-utils'
import { PawPrint, TrendingUp, DollarSign, Package, Droplet } from 'lucide-react'
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
  const todayStr = format(now, 'yyyy-MM-dd')

  const monthYear = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const monthYearLabel = monthYear.charAt(0).toUpperCase() + monthYear.slice(1)

  const [
    { data: animals },
    { data: farm },
    { data: sales },
    { data: purchases },
    { data: feedExpenses },
    { data: opExpenses },
    { data: healthExpenses },
    { data: animalCosts },
    { data: yearSales },
    { data: milkToday },
    { count: partosAno },
  ] = await Promise.all([
    supabase.from('animals').select('id, species, status, sex, entry_type, entry_date, to_discard, market_value').eq('farm_id', farmId),
    supabase.from('farms').select('milk_active').eq('id', farmId).single(),
    supabase.from('animal_sales').select('sale_price, sale_date').eq('farm_id', farmId).gte('sale_date', monthStart).lte('sale_date', monthEnd),
    supabase.from('animal_purchases').select('purchase_price, purchase_date').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('feed_stock').select('total_cost, purchase_date').eq('farm_id', farmId).gte('purchase_date', monthStart).lte('purchase_date', monthEnd),
    supabase.from('operational_expenses').select('amount, date').eq('farm_id', farmId).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('health_records').select('cost, application_date').eq('farm_id', farmId).gte('application_date', monthStart).lte('application_date', monthEnd),
    supabase.from('animal_costs').select('animal_id, species, total_cost').eq('farm_id', farmId).eq('status', 'ativo'),
    supabase.from('animal_sales').select('sale_price').eq('farm_id', farmId).gte('sale_date', yearStart),
    supabase.from('milk_production').select('liters').eq('farm_id', farmId).eq('date', todayStr),
    supabase.from('reproduction_records').select('*', { count: 'exact', head: true }).eq('farm_id', farmId).gte('actual_birth_date', yearStart),
  ])

  const allAnimals = animals ?? []
  const activeAnimals = allAnimals.filter(a => a.status === 'ativo')
  const plantelRows = buildPlantelRows(animalCosts ?? [], activeAnimals)

  const totalAtivos = activeAnimals.length
  const bovinos = activeAnimals.filter(a => a.species === 'bovino').length
  const equinos = activeAnimals.filter(a => a.species === 'equino').length
  const suinos = activeAnimals.filter(a => a.species === 'suino').length
  const femeas = activeAnimals.filter(a => a.sex === 'femea').length
  const machos = activeAnimals.filter(a => a.sex === 'macho').length

  const nascimentosAno = allAnimals.filter(
    a => a.entry_type === 'nascimento' && a.entry_date && a.entry_date >= yearStart
  ).length
  const descarteCount = activeAnimals.filter(a => a.to_discard).length

  const revenue = sales?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
  const yearRevenue = yearSales?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
  const totalCosts =
    (purchases?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0) +
    (feedExpenses?.reduce((s, r) => s + (r.total_cost || 0), 0) ?? 0) +
    (opExpenses?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0) +
    (healthExpenses?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0)
  const netProfit = revenue - totalCosts
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  const milkLiters = milkToday?.reduce((s, r) => s + (r.liters || 0), 0) ?? 0
  const milkActive = farm?.milk_active ?? false

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={monthYearLabel}
      />

      <div className={`grid grid-cols-2 gap-4 mb-6 ${milkActive ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <StatCard
          title="Animais Ativos"
          value={totalAtivos}
          subtitle={`${bovinos} bov · ${equinos} equ · ${suinos} sui`}
          subtitle2={femeas + machos > 0 ? `${femeas} fêmeas · ${machos} machos` : undefined}
          icon={PawPrint}
          iconColor="text-green-700"
          iconBg="bg-green-100"
        />
        <StatCard
          title="Faturamento Mês"
          value={formatCurrencyCard(revenue)}
          subtitle={`Acumulado ${now.getFullYear()}: ${formatCurrencyCard(yearRevenue)}`}
          icon={DollarSign}
          iconColor="text-blue-700"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Lucro Líquido"
          value={formatCurrencyCard(netProfit)}
          subtitle={`Margem: ${margin.toFixed(1)}%`}
          valueColor={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
          icon={TrendingUp}
          iconColor={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}
          iconBg={netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}
        />
        <StatCard
          title="Total Gastos"
          value={formatCurrencyCard(totalCosts)}
          valueColor="text-red-600"
          icon={Package}
          iconColor="text-orange-700"
          iconBg="bg-orange-100"
        />
        {milkActive && (
          <StatCard
            title="Leite hoje"
            value={milkToday && milkToday.length > 0 ? `${milkLiters.toFixed(1)} L` : '— L'}
            icon={Droplet}
            iconColor="text-cyan-700"
            iconBg="bg-cyan-100"
            valueColor="text-green-600"
          />
        )}
      </div>

      {plantelRows.length > 0 && (
        <div className="mb-6">
          <PlantelSummaryTable rows={plantelRows} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { value: nascimentosAno, label: 'Nascimentos no ano' },
          { value: partosAno ?? 0, label: 'Partos registrados' },
          { value: descarteCount, label: 'Para descarte' },
        ].map(({ value, label }) => (
          <Card key={label}>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
