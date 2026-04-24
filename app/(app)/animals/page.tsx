import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
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
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Animais"
        description="Gerencie o plantel da sua fazenda"
        actions={
          <Link href="/animals/new">
            <Button className="h-10 gap-2">
              <Plus className="h-4 w-4" /> Novo Animal
            </Button>
          </Link>
        }
      />
      <AnimalsClient initialAnimals={animals ?? []} farmId={farmId} />
    </div>
  )
}
