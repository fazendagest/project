import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader, MobileActionBar } from '@/components/layout/page-header'
import { ReproductionClient } from '@/components/reproduction/reproduction-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function ReproductionPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: records }, { data: females }, { data: males }] = await Promise.all([
    supabase
      .from('reproduction_records')
      .select('*, female:female_id(code, name, species), male:male_id(code, name)')
      .eq('farm_id', farmId)
      .order('coverage_date', { ascending: false }),
    supabase
      .from('animals')
      .select('id, code, name, species')
      .eq('farm_id', farmId)
      .eq('sex', 'F')
      .eq('status', 'ativo')
      .order('code'),
    supabase
      .from('animals')
      .select('id, code, name, species')
      .eq('farm_id', farmId)
      .eq('sex', 'M')
      .eq('status', 'ativo')
      .order('code'),
  ])

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title="Reprodução"
        description="Coberturas, gestações e partos"
        actionsDesktopOnly
        actions={
          <Link href="/app/reproduction/new">
            <Button className="h-10 gap-2"><Plus className="h-4 w-4" /> Nova Cobertura</Button>
          </Link>
        }
      />
      <ReproductionClient
        initialRecords={records ?? []}
        females={females ?? []}
        males={males ?? []}
        farmId={farmId}
      />
      <MobileActionBar>
        <Link href="/app/reproduction/new" className="block">
          <Button className="h-12 w-full gap-2 text-base"><Plus className="h-5 w-5" /> Nova cobertura</Button>
        </Link>
      </MobileActionBar>
    </div>
  )
}
