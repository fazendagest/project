import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
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
    <div>
      <PageHeader
        title="Reprodução"
        description="Coberturas, gestações e partos"
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
    </div>
  )
}
