import { createClient } from '@/lib/supabase/server'
import { getFarmId } from '@/lib/farm'
import { PageHeader } from '@/components/layout/page-header'
import { AnimalForm } from '@/components/animals/animal-form'
import { notFound } from 'next/navigation'

export default async function EditAnimalPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const farmId = await getFarmId()
  if (!farmId) return null

  const [{ data: animal }, { data: purchase }] = await Promise.all([
    supabase.from('animals').select('*').eq('id', params.id).eq('farm_id', farmId).single(),
    supabase.from('animal_purchases').select('id, purchase_price, weight_kg, seller_name').eq('animal_id', params.id).maybeSingle(),
  ])

  if (!animal) notFound()

  return (
    <div>
      <PageHeader title="Editar Animal" description={`${animal.code}${animal.name ? ' · ' + animal.name : ''}`} />
      <AnimalForm farmId={farmId} animal={animal} existingPurchase={purchase ?? undefined} mode="edit" />
    </div>
  )
}
