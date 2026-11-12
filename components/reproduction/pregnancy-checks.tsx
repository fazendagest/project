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
import { toast } from 'sonner'
import Link from 'next/link'
import { Loader2, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { todaySP } from '@/lib/today'

export type CheckFemale = { id: string; code: string; name?: string | null }

const resultColor = { prenhe: 'bg-blue-100 text-blue-800', vazia: 'bg-amber-100 text-amber-900' } as const
const resultLabel = { prenhe: 'Prenhe', vazia: 'Vazia' } as const

const today = todaySP

/** Gestação média de vaca de corte, para sugerir a previsão do parto (estimativa do Tião, 11/11/2026). */
export const GESTATION_DAYS = 290
/** Cobertura mais antiga que ainda pode ter dado esta prenhez (Tião, 11/11/2026). */
export const MAX_COVERAGE_DAYS = 300
const DAY = 86_400_000
const addDays = (iso: string, days: number) => new Date(new Date(iso + 'T12:00:00').getTime() + days * DAY).toISOString().slice(0, 10)
const daysBetween = (from: string, to: string) => Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / DAY)

/** Gestação em meses para a conta pelo toque: parto = exame + (9,5 - meses) x 30 dias (Tião, teste do P1). */
export const GESTATION_MONTHS = 9.5

/** Última cobertura feita antes do exame e há no máximo 300 dias; sem ela, não há sugestão. */
function coverageFor(dates: string[] | undefined, exam: string) {
  return (dates ?? [])
    .filter(d => d < exam && daysBetween(d, exam) <= MAX_COVERAGE_DAYS)
    .sort()
    .at(-1)
}

/**
 * Previsão do parto: pela cobertura lançada (cobertura + 290 dias) ou, sem ela, pelos meses de prenhez que
 * o veterinário fala no toque (touro solto no pasto quase nunca tem cobertura lançada; Tião, teste do P1).
 */
function birthSuggestion(coverage: string | undefined, exam: string, months: string) {
  if (coverage) return { date: addDays(coverage, GESTATION_DAYS), source: 'cobertura' as const }
  const m = Number(months.replace(',', '.'))
  if (months && Number.isFinite(m) && m > 0 && m < GESTATION_MONTHS) {
    return { date: addDays(exam, Math.round((GESTATION_MONTHS - m) * 30)), source: 'toque' as const }
  }
  return null
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
  const [form, setForm] = useState({ animal_id: '', exam_date: today(), result: '' as '' | 'prenhe' | 'vazia', months: '', expected_birth_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** Lançadas desde que abriu o formulário (toque em série no curral; Tião, revisão do sistema, item 3). */
  const [batch, setBatch] = useState<string[]>([])

  const name = (a?: { code: string; name?: string | null }) => a?.name || a?.code || 'animal não informado'
  const selected = females.find(f => f.id === form.animal_id)
  const coverage = form.animal_id ? coverageFor(coverages[form.animal_id], form.exam_date) : undefined
  const suggestion = birthSuggestion(coverage, form.exam_date, form.months)
  const suggestedBirth = suggestion?.date ?? null

  // Quem já tem toque nos últimos 12 meses antes da data do exame vai para o fim da lista.
  const lastExam = new Map<string, string>()
  for (const c of checks) {
    if (c.exam_date <= form.exam_date && c.exam_date > addDays(form.exam_date, -365) && c.exam_date > (lastExam.get(c.animal_id) ?? '')) {
      lastExam.set(c.animal_id, c.exam_date)
    }
  }
  const orderedFemales = [...females].sort((a, b) => Number(lastExam.has(a.id)) - Number(lastExam.has(b.id)))

  // Prenhe: sugere o parto se o campo estiver vazio ou ainda com a sugestão anterior (não apaga o que foi digitado).
  function pick(patch: Partial<typeof form>) {
    setForm(p => {
      const prevCov = p.animal_id ? coverageFor(coverages[p.animal_id], p.exam_date) : undefined
      const prevSug = birthSuggestion(prevCov, p.exam_date, p.months)?.date ?? ''
      const next = { ...p, ...patch }
      if (next.expected_birth_date === prevSug) next.expected_birth_date = ''
      const cov = next.animal_id ? coverageFor(coverages[next.animal_id], next.exam_date) : undefined
      const sug = birthSuggestion(cov, next.exam_date, next.months)
      if (next.result === 'prenhe' && !next.expected_birth_date && sug) next.expected_birth_date = sug.date
      return next
    })
  }

  function reset() {
    setForm({ animal_id: '', exam_date: today(), result: '', months: '', expected_birth_date: '', notes: '' })
    setBatch([])
  }

  /** next: guarda e deixa o formulário aberto com a mesma data e observação, para a próxima vaca. */
  async function save(e: React.FormEvent, mode: 'next' | 'close' = 'close') {
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
      notes: [form.result === 'prenhe' && form.months ? `${form.months} meses no toque` : '', form.notes].filter(Boolean).join('. ') || null,
    }).select('*, animal:animal_id(code, name)').single()
    setSaving(false)
    if (error) return toast.error('Erro: ' + error.message)
    setChecks(prev => [data, ...prev].sort((a, b) => b.exam_date.localeCompare(a.exam_date)))
    toast.success(`Diagnóstico de ${name(selected)} registrado`)
    router.refresh()
    if (mode === 'next') {
      setBatch(prev => [...prev, name(selected)])
      setForm(p => ({ ...p, animal_id: '', result: '', months: '', expected_birth_date: '' }))
      return
    }
    reset()
    onOpenChange(false)
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
          <form onSubmit={e => save(e, 'next')} className="space-y-4 py-2">
            {batch.length > 0 && (
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                Lançadas agora ({batch.length}): {batch.join(', ')}.
              </p>
            )}
            <div className="space-y-2">
              <Label>Vaca ou novilha *</Label>
              <Select value={form.animal_id} onValueChange={v => pick({ animal_id: String(v ?? ''), expected_birth_date: '' })}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {orderedFemales.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name || f.code}{f.name ? ` (${f.code})` : ''}
                      {lastExam.has(f.id) ? `, já tem toque em ${formatDate(lastExam.get(f.id)!)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {females.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma vaca ou novilha ativa com 1 ano ou mais.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_date">Data do exame</Label>
              <Input id="exam_date" type="date" value={form.exam_date} max={today()} required
                onChange={e => pick({ exam_date: e.target.value })} />
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
            {form.result === 'prenhe' && !coverage && (
              <div className="space-y-2">
                <Label htmlFor="months">Meses de prenhez (o veterinário fala no toque)</Label>
                <Input id="months" inputMode="decimal" placeholder="Ex.: 4" value={form.months}
                  onChange={e => pick({ months: e.target.value.replace(/[^0-9,.]/g, '').slice(0, 4) })} />
              </div>
            )}
            {form.result === 'prenhe' && (
              <div className="space-y-2">
                <Label htmlFor="expected_birth_date">Previsão do parto (se o veterinário disse)</Label>
                <Input id="expected_birth_date" type="date" value={form.expected_birth_date} min={form.exam_date}
                  onChange={e => setForm(p => ({ ...p, expected_birth_date: e.target.value }))} />
                {suggestion && form.expected_birth_date === suggestedBirth && (
                  <p className="text-xs text-muted-foreground">
                    {suggestion.source === 'cobertura'
                      ? `Sugestão: cobertura de ${formatDate(coverage!)} mais ${GESTATION_DAYS} dias (estimativa). Troque se o veterinário disse outra data.`
                      : 'Estimativa pelo toque; troque se o veterinário disse outra data.'}
                  </p>
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
            {/* Dois botões do mesmo tamanho (regra de modal); fechar sem salvar fica no X do diálogo. */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button type="button" variant="outline" className="h-11 whitespace-normal leading-tight" disabled={saving}
                onClick={e => save(e as unknown as React.FormEvent, 'close')}>
                Salvar e fechar
              </Button>
              <Button type="submit" className="h-11 whitespace-normal leading-tight" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar e lançar a próxima
              </Button>
            </div>
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
