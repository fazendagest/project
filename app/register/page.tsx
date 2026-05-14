'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, toTitleCase } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CowIcon } from '@/components/icons/cow-icon'
import {
  ChevronLeft, Eye, EyeOff, CheckCircle2,
  Crown, ClipboardList, Stethoscope, Wrench, Milk, Beef,
} from 'lucide-react'
import { format, addDays } from 'date-fns'

type Step = 1 | 2 | 3 | 'done'

type FarmRole = 'proprietario' | 'gerente' | 'veterinario' | 'caseiro' | ''
type AnimalCount = 'ate_30' | '30_100' | '100_300' | 'mais_300' | ''

interface FormData {
  owner_name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  farm_role: FarmRole
  animal_count: AnimalCount
  milk_active: boolean | null
}

const ROLES = [
  { value: 'proprietario', label: 'Proprietário', desc: 'Dono da fazenda, acesso completo', icon: Crown },
  { value: 'gerente', label: 'Gerente', desc: 'Gestão operacional e financeira', icon: ClipboardList },
  { value: 'veterinario', label: 'Veterinário', desc: 'Foco em saúde e procedimentos', icon: Stethoscope },
  { value: 'caseiro', label: 'Caseiro / Operador', desc: 'Registro de animais e atividades', icon: Wrench },
] as const

const ANIMAL_COUNTS = [
  { value: 'ate_30', label: 'Até 30' },
  { value: '30_100', label: '30 a 100' },
  { value: '100_300', label: '100 a 300' },
  { value: 'mais_300', label: 'Mais de 300' },
] as const

const ROLE_LABELS: Record<string, string> = {
  proprietario: 'Proprietário',
  gerente: 'Gerente',
  veterinario: 'Veterinário',
  caseiro: 'Caseiro / Operador',
}

const ANIMAL_COUNT_LABELS: Record<string, string> = {
  ate_30: 'Até 30',
  '30_100': '30 a 100',
  '100_300': '100 a 300',
  mais_300: 'Mais de 300',
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function getPasswordStrength(password: string): { bars: number; label: string; color: string } {
  if (!password) return { bars: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { bars: 1, label: 'Fraca', color: 'bg-red-500' }
  if (score <= 2) return { bars: 2, label: 'Média', color: 'bg-yellow-500' }
  if (score <= 3) return { bars: 3, label: 'Boa', color: 'bg-blue-500' }
  return { bars: 4, label: 'Forte', color: 'bg-green-500' }
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [form, setForm] = useState<FormData>({
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    farm_role: '',
    animal_count: '',
    milk_active: null,
  })

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validateStep1(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.owner_name.trim()) errs.owner_name = 'Nome obrigatório'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email inválido'
    if (form.password.length < 8) errs.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Senhas não coincidem'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function goToStep2() {
    if (!validateStep1()) return
    setEmailChecking(true)
    try {
      const res = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      if (res.ok) {
        const { exists } = await res.json()
        if (exists) {
          setErrors(prev => ({ ...prev, email: 'email_exists' }))
          setEmailChecking(false)
          return
        }
      }
      // non-OK (admin not configured or error) — advance and let Supabase validate on submit
    } catch {
      // network error — advance and let Supabase validate on submit
    }
    setEmailChecking(false)
    setStep(2)
  }

  async function handleSubmit() {
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Erro ao criar conta')
      setLoading(false)
      return
    }

    const trialEndsAt = format(addDays(new Date(), 90), 'yyyy-MM-dd')

    const milkActive = form.milk_active === true
    console.log('[register] inserting farm with milk_active:', milkActive, '(form value:', form.milk_active, ')')

    const { error: farmError } = await supabase.from('farms').insert({
      owner_id: authData.user.id,
      name: 'Minha Fazenda',
      owner_name: toTitleCase(form.owner_name),
      phone: form.phone || null,
      milk_active: milkActive,
      milkings_per_day: 1,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
    }).select().single()

    if (farmError) {
      toast.error('Conta criada mas erro ao configurar fazenda. Faça login e configure no onboarding.')
      router.push('/login')
      return
    }

    setStep('done')
    setLoading(false)
  }

  const strength = getPasswordStrength(form.password)

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_155)] to-[oklch(0.32_0.08_155)] p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 text-center space-y-5">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800">Conta criada!</h2>
                <p className="text-sm text-gray-500 mt-1">Revise seus dados abaixo.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-medium text-gray-800">{toTitleCase(form.owner_name)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Função</span>
                  <span className="font-medium text-gray-800">{ROLE_LABELS[form.farm_role] ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Animais</span>
                  <span className="font-medium text-gray-800">{ANIMAL_COUNT_LABELS[form.animal_count] ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Módulo leite</span>
                  <span className="font-medium text-gray-800">{form.milk_active ? 'Sim' : 'Não'}</span>
                </div>
                <div className="flex justify-between border-t pt-2.5">
                  <span className="text-gray-500">Plano</span>
                  <span className="font-medium text-green-600">Trial 90 dias</span>
                </div>
              </div>

              <Button
                onClick={() => router.push('/app/onboarding')}
                className="w-full h-11 font-semibold bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
              >
                Configurar minha fazenda
              </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalSteps = 3
  const currentStep = step as number

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.06_155)] to-[oklch(0.32_0.08_155)] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="bg-[oklch(0.55_0.15_145)] rounded-xl p-2.5">
            <CowIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-bold text-white">FazendaGest</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress */}
          <div className="px-6 pt-5 pb-4 border-b">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[oklch(0.55_0.15_145)] rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all duration-200',
                    s < currentStep ? 'bg-[oklch(0.55_0.15_145)]' :
                    s === currentStep ? 'bg-[oklch(0.55_0.15_145)] scale-125' :
                    'bg-gray-200'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Back button */}
            {currentStep > 1 && (
              <button
                onClick={() => setStep(prev => (prev as number) - 1 as Step)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors -mt-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            )}

            {/* ── STEP 1: Seus dados ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Seus dados</h2>
                  <p className="text-sm text-gray-500">Passo 1 de 3</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="owner_name">Nome completo *</Label>
                  <Input
                    id="owner_name"
                    placeholder="João Silva"
                    value={form.owner_name}
                    onChange={e => set('owner_name', e.target.value)}
                    onBlur={e => set('owner_name', toTitleCase(e.target.value))}
                    className={cn('h-10', errors.owner_name && 'border-red-500')}
                  />
                  {errors.owner_name && <p className="text-xs text-red-500">{errors.owner_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className={cn('h-10', errors.email && 'border-red-500')}
                    autoComplete="email"
                  />
                  {errors.email && errors.email !== 'email_exists' && (
                    <p className="text-xs text-red-500">{errors.email}</p>
                  )}
                  {errors.email === 'email_exists' && (
                    <p className="text-xs text-red-500">
                      Este e-mail já está cadastrado.{' '}
                      <Link href="/login" className="underline font-medium">Faça login.</Link>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    onChange={e => set('phone', maskPhone(e.target.value))}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      className={cn('h-10 pr-10', errors.password && 'border-red-500')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(n => (
                          <div
                            key={n}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              n <= strength.bars ? strength.color : 'bg-gray-200'
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn('text-xs', strength.bars <= 1 ? 'text-red-500' : strength.bars <= 2 ? 'text-yellow-600' : 'text-green-600')}>
                        Senha {strength.label}
                      </p>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      className={cn('h-10 pr-10', errors.confirmPassword && 'border-red-500')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>

                <Button
                  onClick={goToStep2}
                  disabled={emailChecking}
                  className="w-full h-11 font-semibold bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
                >
                  {emailChecking ? 'Verificando...' : 'Continuar'}
                </Button>
              </div>
            )}

            {/* ── STEP 2: Função na fazenda ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Função na fazenda</h2>
                  <p className="text-sm text-gray-500">Isso nos ajuda a personalizar sua experiência.</p>
                </div>

                <div className="space-y-2">
                  {ROLES.map(role => {
                    const Icon = role.icon
                    const selected = form.farm_role === role.value
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => set('farm_role', role.value as FarmRole)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                          selected
                            ? 'border-[oklch(0.55_0.15_145)] bg-[oklch(0.97_0.03_145)]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <div className={cn(
                          'rounded-lg p-2 shrink-0',
                          selected ? 'bg-[oklch(0.55_0.15_145)]' : 'bg-gray-100'
                        )}>
                          <Icon className={cn('h-4 w-4', selected ? 'text-white' : 'text-gray-500')} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{role.label}</p>
                          <p className="text-xs text-gray-500">{role.desc}</p>
                        </div>
                        {selected && (
                          <CheckCircle2 className="h-4 w-4 text-[oklch(0.55_0.15_145)] ml-auto shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>

                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.farm_role}
                  className="w-full h-11 font-semibold bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)] disabled:opacity-40"
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* ── STEP 3: Perfil da fazenda ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Perfil da fazenda</h2>
                  <p className="text-sm text-gray-500">Passo 3 de 3</p>
                </div>

                {/* Animal count */}
                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Quantos animais você tem?</p>
                    <p className="text-xs text-gray-500">Só para entender melhor o seu perfil.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ANIMAL_COUNTS.map(opt => {
                      const selected = form.animal_count === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set('animal_count', opt.value as AnimalCount)}
                          className={cn(
                            'py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all',
                            selected
                              ? 'border-[oklch(0.55_0.15_145)] bg-[oklch(0.97_0.03_145)] text-[oklch(0.45_0.15_145)]'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Milk */}
                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Sua fazenda produz leite?</p>
                    <p className="text-xs text-gray-500">Ativa o módulo de leite com controle de produção e receita.</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      { value: true, label: 'Sim, produzo leite', icon: Milk },
                      { value: false, label: 'Não, só gado de corte', icon: Beef },
                    ].map(opt => {
                      const Icon = opt.icon
                      const selected = form.milk_active === opt.value
                      return (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => set('milk_active', opt.value)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                            selected
                              ? 'border-[oklch(0.55_0.15_145)] bg-[oklch(0.97_0.03_145)]'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          )}
                        >
                          <div className={cn(
                            'rounded-lg p-2 shrink-0',
                            selected ? 'bg-[oklch(0.55_0.15_145)]' : 'bg-gray-100'
                          )}>
                            <Icon className={cn('h-4 w-4', selected ? 'text-white' : 'text-gray-500')} />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                          {selected && (
                            <CheckCircle2 className="h-4 w-4 text-[oklch(0.55_0.15_145)] ml-auto shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !form.animal_count || form.milk_active === null}
                  className="w-full h-11 font-semibold bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)] disabled:opacity-40"
                >
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-gray-400">
              Já tem conta?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-4">
          90 dias grátis · Sem cartão de crédito
        </p>
      </div>
    </div>
  )
}
