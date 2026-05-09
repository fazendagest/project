'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function SuspendedPage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-red-100 rounded-full p-5">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Conta Suspensa</h1>
          <p className="text-gray-600">
            Sua conta está temporariamente suspensa. Entre em contato com o
            suporte para reativar o acesso.
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-4 text-sm text-gray-600">
          <p>
            Se você acredita que isso é um erro ou precisa de ajuda,
            entre em contato com o administrador do sistema.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full"
        >
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
