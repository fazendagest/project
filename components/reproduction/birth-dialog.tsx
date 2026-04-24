'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReproductionRecord } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface BirthDialogProps {
  record: ReproductionRecord & { female?: any }
  farmId: string
  onSuccess: (updated: ReproductionRecord) => void
  onClose: () => void
}

export function BirthDialog({ record, farmId, onSuccess, onClose }: BirthDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [birthDate, setBirthDate] = useState(new Date().toISOString().slice(0, 10))
  const [offspringCount, setOffspringCount] = useState(1)
  const [offspringSex, setOffspringSex] = useState<'M' | 'F'>('M')

  const female = record.female as any
  const species = female?.species ?? 'bovino'

  async function handleSubmit() {
    if (!birthDate) return toast.error('Informe a data do parto')
    setLoading(true)

    const { data: updated, error: reproError } = await supabase
      .from('reproduction_records')
      .update({
        status: 'parida',
        actual_birth_date: birthDate,
        offspring_count: offspringCount,
      })
      .eq('id', record.id)
      .select()
      .single()

    if (reproError) {
      toast.error('Erro ao registrar parto: ' + reproError.message)
      setLoading(false)
      return
    }

    const offspringInserts = []
    for (let i = 0; i < offspringCount; i++) {
      const { data: codeData } = await supabase.rpc('next_animal_code', {
        p_farm_id: farmId,
        p_species: species,
      })

      offspringInserts.push({
        farm_id: farmId,
        code: codeData ?? `${species.substring(0, 3).toUpperCase()}-NOVO${i + 1}`,
        species,
        sex: offspringSex,
        birth_date: birthDate,
        entry_date: birthDate,
        entry_type: 'nascimento',
        status: 'ativo',
        notes: `Nascido de ${female?.code ?? 'desconhecida'} em ${birthDate}`,
      })
    }

    if (offspringInserts.length > 0) {
      const { error: insertError } = await supabase.from('animals').insert(offspringInserts)
      if (insertError) {
        toast.error('Parto registrado, mas erro ao criar filhotes: ' + insertError.message)
      } else {
        toast.success(`Parto registrado! ${offspringCount} filhote(s) criado(s) automaticamente.`)
      }
    }

    onSuccess(updated)
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Parto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Fêmea: <strong>{female?.code}{female?.name ? ` · ${female.name}` : ''}</strong>
          </p>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Data do Parto *</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offspring">Número de Filhotes</Label>
            <Input
              id="offspring"
              type="number"
              min="1"
              max="20"
              value={offspringCount}
              onChange={e => setOffspringCount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Sexo dos Filhotes (para criação automática)</Label>
            <Select value={offspringSex} onValueChange={v => v && setOffspringSex(v as 'M' | 'F')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Macho(s)</SelectItem>
                <SelectItem value="F">Fêmea(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            Os filhotes serão criados automaticamente como novos animais com código sequencial e tipo de entrada "nascimento".
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Parto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
