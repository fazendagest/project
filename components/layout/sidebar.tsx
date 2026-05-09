'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  LayoutDashboard,
  PawPrint,
  Heart,
  Baby,
  Wheat,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/animals', label: 'Animais', icon: PawPrint },
  { href: '/health', label: 'Saúde', icon: Heart },
  { href: '/reproduction', label: 'Reprodução', icon: Baby },
  { href: '/feeding', label: 'Alimentação', icon: Wheat },
  {
    label: 'Financeiro',
    icon: DollarSign,
    children: [
      { href: '/financial/movements', label: 'Movimentações' },
      { href: '/financial/dre', label: 'DRE' },
      { href: '/financial/cashflow', label: 'Fluxo de Caixa' },
      { href: '/financial/per-animal', label: 'Por Animal' },
    ],
  },
  { href: '/reports', label: 'Relatórios', icon: FileText },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [finOpen, setFinOpen] = useState(pathname.startsWith('/financial'))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sessão encerrada')
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="bg-[oklch(0.55_0.15_145)] rounded-xl p-2">
          <CowIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-bold text-lg text-sidebar-foreground">FazendaGest</p>
          <p className="text-xs text-sidebar-foreground/60">Gestão Rural</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            if ('children' in item && item.children) {
              return (
                <li key={item.label}>
                  <button
                    onClick={() => setFinOpen(v => !v)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      pathname.startsWith('/financial') && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={cn('h-4 w-4 transition-transform', finOpen && 'rotate-90')} />
                  </button>
                  {finOpen && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                              pathname === child.href
                                ? 'bg-[oklch(0.55_0.15_145)] text-white font-medium'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))
                      ? 'bg-[oklch(0.55_0.15_145)] text-white'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Shield className="h-5 w-5" />
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground z-30 shadow-xl">
        <NavContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-72 flex flex-col bg-sidebar text-sidebar-foreground z-50 shadow-xl transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>
    </>
  )
}
