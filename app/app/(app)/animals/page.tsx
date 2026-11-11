import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader, MobileActionBar } from '@/components/layout/page-header'
import { AnimalsClient } from '@/components/animals/animals-client'
import { MissingCostsAlert } from '@/components/dashboard/missing-costs-alert'
import { computeInvested } from '@/lib/investment'
import { getIfagPrices } from '@/lib/ifag'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function AnimalsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: animals }, { data: costs }, { data: feeds }, { data: expenses }, ifag] = await Promise.all([
    supabase.from('animals').select('*').eq('farm_id', farmId).order('code', { ascending: true }),
    supabase.from('animal_costs').select('animal_id, entry_date, sale_date, purchase_cost, health_cost').eq('farm_id', farmId),
    supabase.from('feed_stock').select('purchase_date, total_cost').eq('farm_id', farmId),
    supabase.from('operational_expenses').select('date, amount, category').eq('farm_id', farmId),
    getIfagPrices(),
  ])
  const invested = computeInvested(costs ?? [], feeds ?? [], expenses ?? [])
  const feedIncluded = (feeds ?? []).some(f => Number(f.total_cost ?? 0) > 0)

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
      <AnimalsClient initialAnimals={animals ?? []} farmId={farmId} invested={invested} feedIncluded={feedIncluded} ifag={ifag} />
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
