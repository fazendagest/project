import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { WhatsNew } from '@/components/layout/whats-new'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { todaySP } from '@/lib/today'

export const dynamic = 'force-dynamic'


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  const cookieStore = cookies()
  const impersonatedFarmId = isAdmin ? cookieStore.get('admin_viewing_farm_id')?.value : undefined

  let milkActive = false
  let impersonatedFarmName: string | undefined

  if (impersonatedFarmId) {
    const adminClient = createAdminClient()
    const { data: farm } = await adminClient
      .from('farms')
      .select('name, milk_active')
      .eq('id', impersonatedFarmId)
      .single()
    milkActive = farm?.milk_active ?? false
    impersonatedFarmName = farm?.name
  } else if (!isAdmin) {
    const { data: farm } = await supabase
      .from('farms')
      .select('id, milk_active')
      .eq('owner_id', user.id)
      .maybeSingle()
    milkActive = farm?.milk_active ?? false
    // Dia de acesso do dono (Tião, P11; medição de 30 dias escolhida pelo Henrique): fazenda e data, uma linha
    // por dia. Erro aqui nunca derruba a tela (ex.: antes de rodar supabase/add_dias_de_acesso.sql).
    // Só no ar (Vercel produção): o localhost usa o mesmo banco e logado como dono contaria dia falso.
    if (farm?.id && process.env.VERCEL_ENV === 'production') {
      await supabase
        .from('farm_access_days')
        .upsert({ farm_id: farm.id, day: todaySP() }, { onConflict: 'farm_id,day', ignoreDuplicates: true })
        .then(() => undefined, () => undefined)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin && !impersonatedFarmId} milkActive={milkActive} />
      <main className="flex-1 flex flex-col min-w-0 ml-0 md:ml-64">
        {impersonatedFarmName && (
          <ImpersonationBanner farmName={impersonatedFarmName} />
        )}
        <div className="flex-1 pt-20 px-4 pb-4 md:p-6 lg:p-8">
          {children}
        </div>
        {!isAdmin && <WhatsNew />}
      </main>
    </div>
  )
}
