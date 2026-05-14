'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { CowIcon } from '@/components/icons/cow-icon'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email ou senha incorretos')
    } else {
      router.push('/app/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error('Digite seu email no campo acima primeiro')
      return
    }
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error('Erro ao enviar email de recuperação')
    } else {
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_155)] to-[oklch(0.32_0.08_155)] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-[oklch(0.55_0.15_145)] rounded-2xl p-4 shadow-lg">
            <CowIcon className="h-10 w-10 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">FazendaGest</h1>
            <p className="text-sm text-white/60 mt-0.5">Gestão rural simplificada</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
              disabled={loading}
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          <Link href="/register" className="block mt-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-medium"
            >
              Criar conta gratuita
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-white/50 mt-5">
          90 dias grátis · Sem cartão de crédito
        </p>
      </div>
    </div>
  )
}
