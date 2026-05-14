'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CowIcon } from '@/components/icons/cow-icon'
import { LayoutDashboard, Building2, LogOut, ShoppingBag } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/farms', label: 'Fazendas', icon: Building2 },
  { href: '/admin/marketplace', label: 'Marketplace', icon: ShoppingBag },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sessão encerrada')
  }

  return (
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
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === item.href || pathname.startsWith(item.href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
