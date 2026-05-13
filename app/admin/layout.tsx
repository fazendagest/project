import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './admin-sidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 ml-56 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  )
}
