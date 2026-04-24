'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Farm } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Leaf } from 'lucide-react'

export function SettingsClient({ farm, userEmail }: { farm: Farm | null; userEmail: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: farm?.name ?? 'Minha Fazenda',
    location: farm?.location ?? '',
    area_hectares: farm?.area_hectares?.toString() ?? '',
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!farm) return
    setLoading(true)
    const { error } = await supabase.from('farms').update({
      name: form.name,
      location: form.location || null,
      area_hectares: form.area_hectares ? parseFloat(form.area_hectares) : null,
    }).eq('id', farm.id)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else toast.success('Configurações salvas!')
    setLoading(false)
  }

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            Dados da Fazenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Fazenda *</Label>
              <Input id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input id="location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Cidade, Estado" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Área (hectares)</Label>
              <Input id="area" type="number" step="0.01" min="0" value={form.area_hectares}
                onChange={e => setForm(p => ({ ...p, area_hectares: e.target.value }))} placeholder="0,00" />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email</Label>
            <p className="text-sm font-medium mt-1">{userEmail}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Para alterar senha ou email, use a opção de recuperação no login.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Armazenamento de Fotos</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As fotos dos animais são armazenadas no Supabase Storage no bucket{' '}
            <code className="bg-muted px-1 rounded">animal-photos</code>.
            Certifique-se de criar este bucket com acesso público no painel do Supabase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
