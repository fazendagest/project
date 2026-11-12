import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader, MobileActionBar } from '@/components/layout/page-header'
import { AnimalsClient } from '@/components/animals/animals-client'
import { MissingCostsAlert } from '@/components/dashboard/missing-costs-alert'
import { computeInvested, OUTSIDE_HERD_CATEGORY } from '@/lib/investment'
import { expandExpenses, todaySP } from '@/lib/fixed-expenses'
import { getIfagPrices } from '@/lib/ifag'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { HerdAlertsCard } from '@/components/animals/herd-alerts-card'
import { herdAlerts } from '@/lib/herd-alerts'
import { isBruceloseProduct } from '@/lib/brucelose'
import { feedGap } from '@/lib/missing-costs'

export default async function AnimalsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: animals }, { data: costs }, { data: feeds }, { data: expenses }, ifag, { data: health }] = await Promise.all([
    supabase.from('animals').select('*').eq('farm_id', farmId).order('code', { ascending: true }),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost, species').eq('farm_id', farmId),
    supabase.from('feed_stock').select('purchase_date, total_cost, for_pigs').eq('farm_id', farmId),
    supabase.from('operational_expenses').select('*').eq('farm_id', farmId),
    getIfagPrices(),
    supabase.from('health_records').select('animal_id, product_name').eq('farm_id', farmId),
  ])
  const vaccinated = new Set((health ?? []).filter(r => isBruceloseProduct(r.product_name)).map(r => r.animal_id))
  const invested = computeInvested(costs ?? [], feeds ?? [], expenses ?? [], animals ?? [])
  const feedIncluded = (feeds ?? []).some(f => !f.for_pigs && Number(f.total_cost ?? 0) > 0)
  // Mesma regra do Dashboard: sem alimentação em 45 dias (lib/missing-costs.ts) ou sem despesa em 60 dias,
  // o ganho no papel sai maior que o real.
  const today = todaySP()
  const cut = new Date(new Date(today + 'T12:00:00').getTime() - 60 * 86_400_000).toISOString().slice(0, 10)
  const recentExpense = expandExpenses((expenses ?? []).filter(e => e.category !== OUTSIDE_HERD_CATEGORY), today).some(e => e.date >= cut)
  const missingCosts = [feedGap(feeds ?? [], today).missing && 'sal, milho e ração', !recentExpense && 'despesas da fazenda'].filter(Boolean) as string[]

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title="Animais"
        description="Gerencie o plantel da sua fazenda"
        actionsDesktopOnly
        actions={
          <Link href="/app/animals/new">
            <Button className="h-10 gap-2">
              <Plus className="h-4 w-4" /> Novo animal
            </Button>
          </Link>
        }
      />
      <MissingCostsAlert farmId={farmId} />
      <HerdAlertsCard {...herdAlerts(animals ?? [], today, vaccinated)} />
      <AnimalsClient initialAnimals={animals ?? []} farmId={farmId} invested={invested} feedIncluded={feedIncluded} missingCosts={missingCosts} ifag={ifag} />
      <MobileActionBar>
        <Link href="/app/animals/new" className="block">
          <Button className="h-12 w-full gap-2 text-base">
            <Plus className="h-5 w-5" /> Novo animal
          </Button>
        </Link>
      </MobileActionBar>
    </div>
  )
}
