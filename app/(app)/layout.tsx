import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  let milkActive = false
  if (!isAdmin) {
    const { data: farm } = await supabase
      .from('farms')
      .select('milk_active')
      .eq('owner_id', user.id)
      .maybeSingle()
    console.log('milk_active from farm:', farm?.milk_active)
    milkActive = farm?.milk_active ?? false
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} milkActive={milkActive} />
      <main className="flex-1 flex flex-col min-w-0 ml-0 md:ml-64">
        <div className="flex-1 pt-16 px-4 pb-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
