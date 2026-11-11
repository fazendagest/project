import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader, MobileActionBar } from '@/components/layout/page-header'
import { AnimalsClient } from '@/components/animals/animals-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function AnimalsPage() {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const { data: animals } = await supabase
    .from('animals')
    .select('*')
    .eq('farm_id', farmId)
    .order('code', { ascending: true })

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
      <AnimalsClient initialAnimals={animals ?? []} farmId={farmId} />
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
