import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

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
      .select('milk_active')
      .eq('owner_id', user.id)
      .maybeSingle()
    milkActive = farm?.milk_active ?? false
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin && !impersonatedFarmId} milkActive={milkActive} />
      <main className="flex-1 flex flex-col min-w-0 ml-0 md:ml-64">
        {impersonatedFarmName && (
          <ImpersonationBanner farmName={impersonatedFarmName} />
        )}
        <div className="flex-1 pt-16 px-4 pb-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
