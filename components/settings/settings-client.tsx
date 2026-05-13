'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Farm } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Leaf, Download, Milk } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'

export function SettingsClient({ farm, userEmail }: { farm: Farm | null; userEmail: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [milkActive, setMilkActive] = useState(farm?.milk_active ?? false)
  const [milkLoading, setMilkLoading] = useState(false)
  const [form, setForm] = useState({
    name: farm?.name ?? 'Minha Fazenda',
    location: farm?.location ?? '',
    area_hectares: farm?.area_hectares?.toString() ?? '',
  })

  async function handleMilkToggle(checked: boolean) {
    if (!farm) return
    setMilkLoading(true)
    const { error } = await supabase.from('farms').update({ milk_active: checked }).eq('id', farm.id)
    if (error) {
      toast.error('Erro ao atualizar módulo de leite')
      setMilkActive(!checked)
    } else {
      setMilkActive(checked)
      toast.success(checked ? 'Módulo de leite ativado!' : 'Módulo de leite desativado.')
      router.refresh()
    }
    setMilkLoading(false)
  }

  async function handleExport() {
    if (!farm) return
    setExporting(true)
    try {
      const farmId = farm.id
      const [
        { data: animals },
        { data: health_records },
        { data: reproduction_records },
        { data: feed_stock },
        { data: feed_records },
        { data: animal_purchases },
        { data: animal_sales },
        { data: operational_expenses },
      ] = await Promise.all([
        supabase.from('animals').select('*').eq('farm_id', farmId),
        supabase.from('health_records').select('*').eq('farm_id', farmId),
        supabase.from('reproduction_records').select('*').eq('farm_id', farmId),
        supabase.from('feed_stock').select('*').eq('farm_id', farmId),
        supabase.from('feed_records').select('*').eq('farm_id', farmId),
        supabase.from('animal_purchases').select('*').eq('farm_id', farmId),
        supabase.from('animal_sales').select('*').eq('farm_id', farmId),
        supabase.from('operational_expenses').select('*').eq('farm_id', farmId),
      ])

      const backup = {
        exported_at: new Date().toISOString(),
        farm: { id: farm.id, name: farm.name, location: farm.location, area_hectares: farm.area_hectares },
        animals: animals ?? [],
        health_records: health_records ?? [],
        reproduction_records: reproduction_records ?? [],
        feed_stock: feed_stock ?? [],
        feed_records: feed_records ?? [],
        animal_purchases: animal_purchases ?? [],
        animal_sales: animal_sales ?? [],
        operational_expenses: operational_expenses ?? [],
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `fazendagest-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exportado com sucesso!')
    } catch {
      toast.error('Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

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
              <Input id="name" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                onBlur={e => setForm(p => ({ ...p, name: toTitleCase(e.target.value) }))}
                required />
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5 text-primary" />
            Módulos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Produção de Leite</p>
              <p className="text-xs text-muted-foreground">Ativa o item "Leite" no menu lateral</p>
            </div>
            <Switch
              checked={milkActive}
              onCheckedChange={handleMilkToggle}
              disabled={milkLoading || !farm}
            />
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Backup de Dados</CardTitle>
          <CardDescription>
            Exporta todos os dados da fazenda em formato JSON para guardar como cópia de segurança.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={exporting || !farm}
            variant="outline"
            className="w-full h-12"
          >
            {exporting
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Exportando...</>
              : <><Download className="mr-2 h-5 w-5" />Exportar todos os dados</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
