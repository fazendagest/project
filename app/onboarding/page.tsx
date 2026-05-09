'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    phone: '',
    city: '',
    state: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim() || !form.owner_name.trim()) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: farm, error } = await supabase
      .from('farms')
      .insert({
        owner_id: user.id,
        name: form.name.trim(),
        owner_name: form.owner_name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
      })
      .select()
      .single()

    if (error || !farm) {
      toast.error('Erro ao criar fazenda: ' + (error?.message ?? 'tente novamente'))
      setLoading(false)
      return
    }

    await supabase.from('user_farms').insert({
      user_id: user.id,
      farm_id: farm.id,
      role: 'owner',
    })

    toast.success('Fazenda criada com sucesso!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-[oklch(0.55_0.15_145)] rounded-xl p-3">
            <CowIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="font-bold text-2xl text-gray-800">FazendaGest</p>
            <p className="text-sm text-gray-500">Gestão Rural Inteligente</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Bem-vindo!</CardTitle>
            <CardDescription>
              Configure sua fazenda para começar a usar o sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nome da Fazenda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Fazenda Santa Maria"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="owner_name">
                  Seu Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="owner_name"
                  placeholder="Nome completo"
                  value={form.owner_name}
                  onChange={e => set('owner_name', e.target.value)}
                  required
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
                    placeholder="Sua cidade"
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

              <Button
                type="submit"
                className="w-full bg-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.48_0.15_145)]"
                disabled={loading}
              >
                {loading ? 'Criando fazenda...' : 'Começar a usar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
