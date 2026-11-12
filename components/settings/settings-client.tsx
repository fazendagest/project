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
import { todaySP } from '@/lib/today'

type AreaUnit = 'alq' | 'ha'
const HA_PER_ALQ = 4.84
const AREA_UNITS: Record<AreaUnit, { label: string; plural: string }> = {
  alq: { label: 'Alqueires', plural: 'alqueires goianos' },
  ha: { label: 'Hectares', plural: 'hectares' },
}
const parseArea = (v: string) => {
  // Com vírgula, o ponto é de milhar (1.234,5); sem vírgula, o ponto é a casa decimal (77.44).
  const t = v.trim()
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return v.trim() && Number.isFinite(n) && n > 0 ? n : null
}
/** Valor digitado na unidade escolhida para hectares (o que vai para o banco). */
const toHectares = (v: string, unit: AreaUnit) => {
  const n = parseArea(v)
  return n == null ? null : Math.round((unit === 'alq' ? n * HA_PER_ALQ : n) * 100) / 100
}
/** Hectares do banco para o texto do campo na unidade escolhida. */
const toUnit = (ha: number | string | null | undefined, unit: AreaUnit) => {
  if (ha == null || ha === '' || !(Number(ha) > 0)) return ''
  const n = unit === 'alq' ? Number(ha) / HA_PER_ALQ : Number(ha)
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false })
}
/** A conta na outra unidade, ao lado do campo. */
const otherUnitText = (v: string, unit: AreaUnit) => {
  const ha = toHectares(v, unit)
  if (ha == null) return ''
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return unit === 'alq' ? `Dá ${fmt(ha)} hectares.` : `Dá ${fmt(ha / HA_PER_ALQ)} alqueires goianos.`
}

export function SettingsClient({ farm, userEmail }: { farm: Farm | null; userEmail: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [milkActive, setMilkActive] = useState(farm?.milk_active ?? false)
  const [milkLoading, setMilkLoading] = useState(false)
  // Área em alqueire goiano (como o fazendeiro pensa) ou hectare; grava sempre em hectares (Tião, revisão, item 4).
  const [unit, setUnit] = useState<AreaUnit>('alq')
  const [form, setForm] = useState({
    name: farm?.name ?? 'Minha Fazenda',
    location: farm?.location ?? '',
    area_hectares: toUnit(farm?.area_hectares, 'alq'),
    pasture_hectares: toUnit(farm?.pasture_hectares, 'alq'),
  })

  function changeUnit(next: AreaUnit) {
    if (next === unit) return
    setForm(p => ({
      ...p,
      area_hectares: toUnit(toHectares(p.area_hectares, unit), next),
      pasture_hectares: toUnit(toHectares(p.pasture_hectares, unit), next),
    }))
    setUnit(next)
  }

  async function handleMilkToggle(checked: boolean) {
    if (!farm) return
    setMilkActive(checked)
    setMilkLoading(true)
    const { error } = await supabase.from('farms').update({ milk_active: checked }).eq('id', farm.id)
    if (error) {
      toast.error('Erro ao atualizar módulo de leite')
      setMilkActive(!checked)
    } else {
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
      const date = todaySP()
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
      area_hectares: toHectares(form.area_hectares, unit),
      pasture_hectares: toHectares(form.pasture_hectares, unit),
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
              <Label>Medir a área em</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medir a área em">
                {(Object.keys(AREA_UNITS) as AreaUnit[]).map(u => (
                  <Button key={u} type="button" role="radio" aria-checked={unit === u}
                    variant={unit === u ? 'default' : 'outline'} onClick={() => changeUnit(u)}>
                    {AREA_UNITS[u].label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">1 alqueire goiano = 4,84 hectares.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Área total da fazenda ({AREA_UNITS[unit].plural})</Label>
              <Input id="area" type="text" inputMode="decimal" value={form.area_hectares}
                onChange={e => setForm(p => ({ ...p, area_hectares: e.target.value }))} placeholder="0" />
              <p className="text-xs text-muted-foreground">{otherUnitText(form.area_hectares, unit)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasture">Área de pasto ({AREA_UNITS[unit].plural})</Label>
              <Input id="pasture" type="text" inputMode="decimal" value={form.pasture_hectares}
                onChange={e => setForm(p => ({ ...p, pasture_hectares: e.target.value }))} placeholder="0" />
              <p className="text-xs text-muted-foreground">
                Só o que é pasto, sem lavoura, mata e sede. Serve para saber quanto gado o pasto aguenta.
                {' '}{otherUnitText(form.pasture_hectares, unit)}
              </p>
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
