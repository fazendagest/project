'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { HealthRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FormActions } from '@/components/ui/form-actions'
import { toast } from 'sonner'
import { parseBRL, formatBRL } from '@/lib/helpers'
import { toTitleCase } from '@/lib/utils'

interface HealthFormProps {
  farmId: string
  animals: { id: string; code: string; name?: string; species: string }[]
  record?: HealthRecord
  mode: 'create' | 'edit'
}

export function HealthForm({ farmId, animals, record, mode }: HealthFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [multipleAnimals, setMultipleAnimals] = useState(false)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>(record ? [record.animal_id] : [])
  const [speciesFilter, setSpeciesFilter] = useState('all')
  const [form, setForm] = useState({
    animal_id: record?.animal_id ?? '',
    type: record?.type ?? 'vacina',
    product_name: record?.product_name ?? '',
    dose: record?.dose ?? '',
    application_date: record?.application_date ?? new Date().toISOString().slice(0, 10),
    next_due_date: record?.next_due_date ?? '',
    applied_by: record?.applied_by ?? '',
    cost: record?.cost != null ? formatBRL(record.cost) : '',
    notes: record?.notes ?? '',
  })

  const filteredAnimals = animals.filter(a =>
    speciesFilter === 'all' || a.species === speciesFilter
  )

  function set(k: string, v: string | null) {
    if (v === null) return; setForm(prev => ({ ...prev, [k]: v }))
  }

  function toggleAnimal(id: string) {
    setSelectedAnimals(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleAllAnimals() {
    setSelectedAnimals(prev =>
      prev.length === filteredAnimals.length ? [] : filteredAnimals.map(a => a.id)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.product_name) return toast.error('Produto é obrigatório')

    if (mode === 'create' && multipleAnimals && selectedAnimals.length === 0) {
      return toast.error('Selecione pelo menos um animal')
    }
    if (mode === 'create' && !multipleAnimals && !form.animal_id) {
      return toast.error('Selecione um animal')
    }

    setLoading(true)

    const base = {
      farm_id: farmId,
      type: form.type,
      product_name: form.product_name,
      dose: form.dose || null,
      application_date: form.application_date,
      next_due_date: form.next_due_date || null,
      applied_by: form.applied_by || null,
      cost: parseBRL(form.cost) ?? 0,
      notes: form.notes || null,
    }

    let error
    if (mode === 'edit') {
      ;({ error } = await supabase.from('health_records').update(base).eq('id', record!.id).eq('farm_id', farmId))
    } else if (multipleAnimals) {
      const inserts = selectedAnimals.map(animal_id => ({ ...base, animal_id }))
      ;({ error } = await supabase.from('health_records').insert(inserts))
    } else {
      ;({ error } = await supabase.from('health_records').insert({ ...base, animal_id: form.animal_id }))
    }

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else {
      toast.success(mode === 'create'
        ? `Registro(s) criado(s) para ${multipleAnimals ? selectedAnimals.length : 1} animal(is)`
        : 'Registro atualizado!'
      )
      router.refresh()
      router.push('/app/health')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Seleção de Animal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {mode === 'create' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiple"
                  checked={multipleAnimals}
                  onCheckedChange={v => setMultipleAnimals(!!v)}
                />
                <Label htmlFor="multiple">Aplicar em múltiplos animais</Label>
              </div>
            )}

            {mode === 'create' && multipleAnimals ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={speciesFilter} onValueChange={v => v && setSpeciesFilter(v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Filtrar espécie" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="bovino">Bovino</SelectItem>
                      <SelectItem value="equino">Equino</SelectItem>
                      <SelectItem value="suino">Suíno</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={toggleAllAnimals}>
                    {selectedAnimals.length === filteredAnimals.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {filteredAnimals.map(a => (
                    <div key={a.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={a.id}
                        checked={selectedAnimals.includes(a.id)}
                        onCheckedChange={() => toggleAnimal(a.id)}
                      />
                      <Label htmlFor={a.id} className="cursor-pointer font-normal">
                        <span className="font-mono font-semibold">{a.code}</span>
                        {a.name ? ` · ${a.name}` : ''} ({a.species})
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{selectedAnimals.length} animal(is) selecionado(s)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Animal *</Label>
                <Select value={form.animal_id} onValueChange={v => set('animal_id', v)} disabled={mode === 'edit'}>
                  <SelectTrigger><SelectValue placeholder="Selecione o animal" /></SelectTrigger>
                  <SelectContent>
                    {animals.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code}{a.name ? ` · ${a.name}` : ''} ({a.species})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detalhes do Procedimento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacina">Vacina</SelectItem>
                  <SelectItem value="vermifugacao">Vermifugação</SelectItem>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Produto / Procedimento *</Label>
              <Input id="product_name" value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                onBlur={e => set('product_name', toTitleCase(e.target.value))}
                placeholder="Ex: Vacina Aftosa, Ivermectina..." required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dose">Dose</Label>
                <Input id="dose" value={form.dose} onChange={e => set('dose', e.target.value)} placeholder="Ex: 5ml" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Custo (R$)</Label>
                <Input id="cost" type="text" inputMode="decimal" value={form.cost}
                  onChange={e => set('cost', e.target.value)}
                  onBlur={() => { const n = parseBRL(form.cost); if (n !== null) set('cost', formatBRL(n)) }}
                  placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="application_date">Data Aplicação *</Label>
                <Input id="application_date" type="date" value={form.application_date}
                  onChange={e => set('application_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_due_date">Próxima Aplicação</Label>
                <Input id="next_due_date" type="date" value={form.next_due_date}
                  onChange={e => set('next_due_date', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applied_by">Aplicado por</Label>
              <Input id="applied_by" value={form.applied_by} onChange={e => set('applied_by', e.target.value)}
                placeholder="Nome do veterinário ou responsável" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Notas adicionais..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <FormActions
        onCancel={() => router.push('/app/health')}
        submitLabel={mode === 'create' ? 'Registrar' : 'Salvar Alterações'}
        isLoading={loading}
        variant="page"
      />
    </form>
  )
}
