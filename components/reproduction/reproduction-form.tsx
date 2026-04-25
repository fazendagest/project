'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ReproductionRecord, Species } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { calcExpectedBirth } from '@/lib/helpers'

interface ReproFormProps {
  farmId: string
  females: { id: string; code: string; name?: string; species: Species }[]
  males: { id: string; code: string; name?: string; species: Species }[]
  record?: ReproductionRecord
  mode: 'create' | 'edit'
}

export function ReproductionForm({ farmId, females, males, record, mode }: ReproFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [maleSource, setMaleSource] = useState<'plantel' | 'externo'>(
    record?.external_male_name ? 'externo' : 'plantel'
  )
  const [form, setForm] = useState({
    female_id: record?.female_id ?? '',
    male_id: record?.male_id ?? '',
    external_male_name: record?.external_male_name ?? '',
    coverage_date: record?.coverage_date ?? new Date().toISOString().slice(0, 10),
    expected_birth_date: record?.expected_birth_date ?? '',
    status: record?.status ?? 'coberta',
    notes: record?.notes ?? '',
  })

  function set(k: string, v: string | null) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'coverage_date' || k === 'female_id') {
        const femaleId = k === 'female_id' ? v : next.female_id
        const coverage = k === 'coverage_date' ? v : next.coverage_date
        const female = females.find(f => f.id === femaleId)
        if (female && coverage) {
          next.expected_birth_date = calcExpectedBirth(coverage, female.species)
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.female_id) return toast.error('Selecione a fêmea')
    setLoading(true)

    const payload = {
      farm_id: farmId,
      female_id: form.female_id,
      male_id: maleSource === 'plantel' && form.male_id && form.male_id !== 'none' ? form.male_id : null,
      external_male_name: maleSource === 'externo' && form.external_male_name ? form.external_male_name : null,
      coverage_date: form.coverage_date,
      expected_birth_date: form.expected_birth_date || null,
      status: form.status,
      notes: form.notes || null,
    }

    let error
    if (mode === 'create') {
      ;({ error } = await supabase.from('reproduction_records').insert(payload))
    } else {
      ;({ error } = await supabase.from('reproduction_records').update(payload).eq('id', record!.id))
    }

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else {
      toast.success(mode === 'create' ? 'Cobertura registrada!' : 'Registro atualizado!')
      router.push('/reproduction')
      router.refresh()
    }
    setLoading(false)
  }

  const selectedFemale = females.find(f => f.id === form.female_id)
  const availableMales = males.filter(m => !selectedFemale || m.species === selectedFemale.species)

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Dados da Cobertura</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fêmea *</Label>
              <Select value={form.female_id} onValueChange={v => set('female_id', v)} disabled={mode === 'edit'}>
                <SelectTrigger><SelectValue placeholder="Selecione a fêmea" /></SelectTrigger>
                <SelectContent>
                  {females.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.code}{f.name ? ` · ${f.name}` : ''} ({f.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Reprodutor</Label>
                <div className="flex gap-0.5 rounded-md border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      maleSource === 'plantel'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setMaleSource('plantel')}
                  >
                    Meu plantel
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      maleSource === 'externo'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setMaleSource('externo')}
                  >
                    Externo
                  </button>
                </div>
              </div>

              {maleSource === 'plantel' ? (
                <Select value={form.male_id} onValueChange={v => set('male_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Inseminação / Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Inseminação Artificial</SelectItem>
                    {availableMales.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code}{m.name ? ` · ${m.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.external_male_name}
                  onChange={e => set('external_male_name', e.target.value)}
                  placeholder="Ex: Touro Nelore - Fazenda do João"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage_date">Data da Cobertura *</Label>
              <Input id="coverage_date" type="date" value={form.coverage_date}
                onChange={e => set('coverage_date', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_birth_date">Data Prevista do Parto</Label>
              <Input id="expected_birth_date" type="date" value={form.expected_birth_date}
                onChange={e => set('expected_birth_date', e.target.value)} />
              {selectedFemale && form.coverage_date && (
                <p className="text-xs text-muted-foreground">
                  Calculado automaticamente ({selectedFemale.species}: {
                    { bovino: 283, equino: 340, suino: 114 }[selectedFemale.species]
                  } dias)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coberta">Coberta</SelectItem>
                  <SelectItem value="prenha">Prenha (confirmado)</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="h-12 px-8" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {mode === 'create' ? 'Registrar Cobertura' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" className="h-12" onClick={() => router.push('/reproduction')}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
