import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { AnimalForm } from '@/components/animals/animal-form'
import { getIfagPrices } from '@/lib/ifag'

export default async function NewAnimalPage() {
  const farmId = await getFarmId()
  if (!farmId) return null
  const ifag = await getIfagPrices()

  return (
    <div>
      <PageHeader title="Novo Animal" description="Cadastre um novo animal na fazenda" />
      <AnimalForm farmId={farmId} mode="create" ifag={ifag} />
    </div>
  )
}
