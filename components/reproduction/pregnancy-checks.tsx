'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PregnancyCheck } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { CardList, RecordCard } from '@/components/ui/record-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormActions } from '@/components/ui/form-actions'
import { toast } from 'sonner'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'

export type CheckFemale = { id: string; code: string; name?: string | null }

const resultColor = { prenhe: 'bg-blue-100 text-blue-800', vazia: 'bg-amber-100 text-amber-900' } as const
const resultLabel = { prenhe: 'Prenhe', vazia: 'Vazia' } as const

const today = () => new Date().toISOString().slice(0, 10)

/** Gestação média de vaca de corte, para sugerir a previsão do parto (estimativa do Tião, 11/11/2026). */
export const GESTATION_DAYS = 290
/** Cobertura mais antiga que ainda pode ter dado esta prenhez (Tião, 11/11/2026). */
export const MAX_COVERAGE_DAYS = 300
const DAY = 86_400_000
const addDays = (iso: string, days: number) => new Date(new Date(iso + 'T12:00:00').getTime() + days * DAY).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / DAY)

/** Última cobertura feita antes do exame e há no máximo 300 dias; sem ela, não há sugestão. */
function coverageFor(dates: string[] | undefined, exam: string) {
  return (dates ?? [])
    .filter(d => d < exam && daysBetween(d, exam) <= MAX_COVERAGE_DAYS)
    .sort()
    .at(-1)
}

/**
 * Diagnóstico de gestação (pedido do Tião, 11/11/2026): o veterinário confirma por toque ou ultrassom
 * se a vaca ou a novilha está prenhe. A vazia é candidata a venda; o Dashboard mostra a taxa de prenhez.
 */
export function PregnancyChecks({
  initialChecks,
  females,
  coverages = {},
  farmId,
  open,
  onOpenChange,
}: {
  initialChecks: (PregnancyCheck & { animal?: { code: string; name?: string | null } })[]
  females: CheckFemale[]
  /** Coberturas e inseminações de cada fêmea (id → datas AAAA-MM-DD), para sugerir o parto. */
  coverages?: Record<string, string[]>
  farmId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [checks, setChecks] = useState(initialChecks)
  const [form, setForm] = useState({ animal_id: '', exam_date: today(), result: '' as '' | 'prenhe' | 'vazia', expected_birth_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const name = (a?: { code: string; name?: string | null }) => a?.name || a?.code || 'animal não informado'
  const selected = females.find(f => f.id === form.animal_id)
  const coverage = form.animal_id ? coverageFor(coverages[form.animal_id], form.exam_date) : undefined
  const suggestedBirth = coverage ? addDays(coverage, GESTATION_DAYS) : null

  // Prenhe com cobertura válida: sugere o parto (cobertura + 290 dias) se o campo estiver vazio.
  function pick(patch: Partial<typeof form>) {
    setForm(p => {
      const next = { ...p, ...patch }
      const cov = next.animal_id ? coverageFor(coverages[next.animal_id], next.exam_date) : undefined
      if (next.result === 'prenhe' && !next.expected_birth_date && cov) next.expected_birth_date = addDays(cov, GESTATION_DAYS)
      return next
    })
  }

  function reset() {
    setForm({ animal_id: '', exam_date: today(), result: '', expected_birth_date: '', notes: '' })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.animal_id) return toast.error('Escolha a vaca ou a novilha')
    if (!form.result) return toast.error('Diga se está prenhe ou vazia')
    setSaving(true)
    const { data, error } = await supabase.from('pregnancy_checks').insert({
      farm_id: farmId,
      animal_id: form.animal_id,
      exam_date: form.exam_date,
      result: form.result,
      expected_birth_date: form.result === 'prenhe' && form.expected_birth_date ? form.expected_birth_date : null,
      notes: form.notes || null,
    }).select('*, animal:animal_id(code, name)').single()
    setSaving(false)
    if (error) return toast.error('Erro: ' + error.message)
    setChecks(prev => [data, ...prev].sort((a, b) => b.exam_date.localeCompare(a.exam_date)))
    toast.success(`Diagnóstico de ${name(selected)} registrado`)
    reset()
    onOpenChange(false)
    router.refresh()
  }

  async function remove(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('pregnancy_checks').delete().eq('id', id).eq('farm_id', farmId)
    setDeleting(false)
    setConfirmId(null)
    if (error) return toast.error('Erro ao excluir')
    setChecks(prev => prev.filter(c => c.id !== id))
    toast.success('Diagnóstico excluído')
    router.refresh()
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        O veterinário confirma por toque ou ultrassom se a vaca está prenhe. Vaca vazia come o mesmo pasto sem dar bezerro: vale avaliar a venda com o veterinário.
      </p>

      <CardList empty="Nenhum diagnóstico lançado ainda.">
        {checks.map(c => (
          <RecordCard
            key={c.id}
            href={`/app/animals/${c.animal_id}`}
            title={name(c.animal)}
            titleNote={c.animal?.name ? c.animal.code : undefined}
            subtitle={`Exame em ${formatDate(c.exam_date)}`}
            fields={c.result === 'prenhe' && c.expected_birth_date ? [{ label: 'Parto previsto', value: formatDate(c.expected_birth_date) }] : undefined}
            footer={<Badge className={resultColor[c.result]}>{resultLabel[c.result]}</Badge>}
            onDelete={() => setConfirmId(c.id)}
          />
        ))}
      </CardList>

      <DataCard className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fêmea</TableHead>
              <TableHead>Exame</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Parto previsto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.length === 0 && <EmptyState colSpan={5} message="Nenhum diagnóstico lançado ainda" />}
            {checks.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/app/animals/${c.animal_id}`} className="font-medium text-primary hover:underline">{name(c.animal)}</Link>
                  {c.animal?.name && <span className="ml-1 font-mono text-xs text-muted-foreground">{c.animal.code}</span>}
                </TableCell>
                <TableCell>{formatDate(c.exam_date)}</TableCell>
                <TableCell><Badge className={resultColor[c.result]}>{resultLabel[c.result]}</Badge></TableCell>
                <TableCell>{c.result === 'prenhe' && c.expected_birth_date ? formatDate(c.expected_birth_date) : 'não informado'}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label="Excluir" onClick={() => setConfirmId(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>

      <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o) }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo diagnóstico</DialogTitle>
            <DialogDescription>Resultado do toque ou do ultrassom.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vaca ou novilha *</Label>
              <Select value={form.animal_id} onValueChange={v => pick({ animal_id: String(v ?? ''), expected_birth_date: '' })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {females.map(f => <SelectItem key={f.id} value={f.id}>{f.name || f.code}{f.name ? ` (${f.code})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {females.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma vaca ou novilha ativa com 1 ano ou mais.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_date">Data do exame</Label>
              <Input id="exam_date" type="date" value={form.exam_date} max={today()} required
                onChange={e => pick({ exam_date: e.target.value, expected_birth_date: form.expected_birth_date === suggestedBirth ? '' : form.expected_birth_date })} />
            </div>
            <div className="space-y-2">
              <Label>Resultado *</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Resultado">
                {(['prenhe', 'vazia'] as const).map(r => (
                  <Button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={form.result === r}
                    variant={form.result === r ? 'default' : 'outline'}
                    className={cn('h-11')}
                    onClick={() => pick({ result: r })}
                  >
                    {resultLabel[r]}
                  </Button>
                ))}
              </div>
            </div>
            {form.result === 'prenhe' && (
              <div className="space-y-2">
                <Label htmlFor="expected_birth_date">Previsão do parto (se o veterinário disse)</Label>
                <Input id="expected_birth_date" type="date" value={form.expected_birth_date} min={form.exam_date}
                  onChange={e => setForm(p => ({ ...p, expected_birth_date: e.target.value }))} />
                {suggestedBirth && form.expected_birth_date === suggestedBirth && (
                  <p className="text-xs text-muted-foreground">Sugestão: cobertura de {formatDate(coverage!)} mais {GESTATION_DAYS} dias (estimativa). Troque se o veterinário disse outra data.</p>
                )}
              </div>
            )}
            {form.result === 'vazia' && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Ela vai aparecer no Dashboard, em Vazias: avaliar venda.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="check_notes">Observação</Label>
              <Input id="check_notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <FormActions onCancel={() => { reset(); onOpenChange(false) }} isLoading={saving} />
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={o => !o && setConfirmId(null)}
        title="Excluir diagnóstico"
        description="Tem certeza que deseja excluir este diagnóstico?"
        onConfirm={async () => { if (confirmId) await remove(confirmId) }}
        loading={deleting}
      />
    </div>
  )
}
