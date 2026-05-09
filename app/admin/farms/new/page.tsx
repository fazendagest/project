'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

const PLANS = ['trial', 'básico', 'profissional', 'fazenda']

export default function NewFarmPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [form, setForm] = useState({
    email: '',
    password: '',
    farmName: '',
    ownerName: '',
    phone: '',
    city: '',
    state: '',
    plan: 'trial',
    trialEndsAt: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.email || !form.password || !form.farmName) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        farmName: form.farmName,
        ownerName: form.ownerName,
        phone: form.phone,
        city: form.city,
        state: form.state,
        plan: form.plan,
        trialEndsAt: form.trialEndsAt || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Erro ao criar conta')
      setLoading(false)
      return
    }

    setCreated({ email: form.email, password: form.password })
    toast.success('Conta criada com sucesso!')
    setLoading(false)
  }

  async function handleCopy() {
    if (!created) return
    const text = `Email: ${created.email}\nSenha: ${created.password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (created) {
    return (
      <div className="p-8 max-w-lg">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Conta criada!</h2>
          </div>

          <p className="text-sm text-gray-600">
            Envie as credenciais abaixo para o fazendeiro:
          </p>

          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1">
            <p><span className="text-gray-500">Email:</span> {created.email}</p>
            <p><span className="text-gray-500">Senha:</span> {created.password}</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar credenciais'}
            </Button>
            <Button
              onClick={() => router.push('/admin/farms')}
              className="bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
            >
              Ver todas as fazendas
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/farms"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Fazenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Criar conta para novo fazendeiro</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Credenciais de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="fazendeiro@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Senha Provisória <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="text"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados da Fazenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="farmName">
                Nome da Fazenda <span className="text-red-500">*</span>
              </Label>
              <Input
                id="farmName"
                placeholder="Ex: Fazenda Santa Maria"
                value={form.farmName}
                onChange={e => set('farmName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ownerName">Nome do Proprietário</Label>
              <Input
                id="ownerName"
                placeholder="Nome completo"
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Cidade"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">Estado</Label>
                <select
                  id="state"
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">UF</option>
                  {ESTADOS.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plano e Período Trial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <select
                value={form.plan}
                onChange={e => set('plan', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PLANS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trialEndsAt">Data Fim do Trial</Label>
              <Input
                id="trialEndsAt"
                type="date"
                value={form.trialEndsAt}
                onChange={e => set('trialEndsAt', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Se vazio, será 90 dias a partir de hoje.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.push('/admin/farms')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </div>
  )
}
