import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CowIcon } from '@/components/icons/cow-icon'
import { LayoutDashboard, Building2, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar admin */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-gray-900 text-white flex flex-col z-30">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-700">
          <div className="bg-[oklch(0.55_0.15_145)] rounded-lg p-1.5">
            <CowIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm">FazendaGest</p>
            <p className="text-xs text-gray-400">Painel Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/farms"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Fazendas
          </Link>
        </nav>

        <div className="p-3 border-t border-gray-700">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao App
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 ml-56 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  )
}
