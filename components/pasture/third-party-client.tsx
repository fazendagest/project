'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { MobileActionBar } from '@/components/layout/page-header'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatDate, formatCurrency, parseBRL, formatBRL } from '@/lib/helpers'
import {
  DEAL_TYPES, HERD_KINDS, herdUA, isOnFarm, monthlyRent,
  type DealType, type HerdKind, type ThirdPartyHerd,
} from '@/lib/third-party'

const today = () => new Date().toISOString().slice(0, 10)
const num = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d })

type FormState = {
  owner_name: string
  owner_phone: string
  deal_type: DealType
  agreed_value: string
  partnership_terms: string
  settled_value: string
  herd_kind: HerdKind
  head_count: string
  entry_date: string
  exit_date: string
  gta_number: string
  brucelose_tb_exam: boolean
  exam_date: string
  notes: string
}

const empty = (): FormState => ({
  owner_name: '', owner_phone: '', deal_type: 'aluguel', agreed_value: '', partnership_terms: '', settled_value: '',
  herd_kind: 'boi', head_count: '', entry_date: today(), exit_date: '', gta_number: '',
  brucelose_tb_exam: false, exam_date: '', notes: '',
})

const fromHerd = (h: ThirdPartyHerd): FormState => ({
  owner_name: h.owner_name,
  owner_phone: h.owner_phone ?? '',
  deal_type: h.deal_type,
  agreed_value: h.agreed_value != null ? formatBRL(Number(h.agreed_value)) : '',
  partnership_terms: h.partnership_terms ?? '',
  settled_value: h.settled_value != null ? formatBRL(Number(h.settled_value)) : '',
  herd_kind: h.herd_kind,
  head_count: String(h.head_count),
  entry_date: h.entry_date,
  exit_date: h.exit_date ?? '',
  gta_number: h.gta_number ?? '',
  brucelose_tb_exam: h.brucelose_tb_exam,
  exam_date: h.exam_date ?? '',
  notes: h.notes ?? '',
})

/** Gado de terceiros no pasto (Tião, P3): quem é o dono, como é o acerto, quantas cabeças e os documentos. */
export function ThirdPartyClient({ initialHerds, farmId }: { initialHerds: ThirdPartyHerd[]; farmId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [herds, setHerds] = useState(initialHerds)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const day = today()
  const onFarm = herds.filter(h => isOnFarm(h, day))
  const heads = onFarm.reduce((s, h) => s + h.head_count, 0)
  const ua = onFarm.reduce((s, h) => s + herdUA(h), 0)
  const rent = onFarm.reduce((s, h) => s + monthlyRent(h), 0)

  function openNew() {
    setEditingId(null)
    setForm(empty())
    setOpen(true)
  }
  function openEdit(h: ThirdPartyHerd) {
    setEditingId(h.id)
    setForm(fromHerd(h))
    setOpen(true)
  }
  function close() {
    setOpen(false)
    setEditingId(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const count = parseInt(form.head_count, 10)
    if (!form.owner_name.trim()) return toast.error('Diga quem é o dono do gado')
    if (!count || count <= 0) return toast.error('Diga quantas cabeças')
    if (form.exit_date && form.exit_date < form.entry_date) return toast.error('A saída não pode ser antes da entrada')
    const rentValue = form.deal_type === 'aluguel' ? parseBRL(form.agreed_value) : null
    if (form.deal_type === 'aluguel' && rentValue == null) return toast.error('Diga quanto ele paga por cabeça por mês')
    setSaving(true)
    const payload = {
      farm_id: farmId,
      owner_name: form.owner_name.trim(),
      owner_phone: form.owner_phone.trim() || null,
      deal_type: form.deal_type,
      agreed_value: rentValue,
      partnership_terms: form.deal_type === 'parceria' ? form.partnership_terms.trim() || null : null,
      settled_value: form.deal_type === 'parceria' ? parseBRL(form.settled_value) : null,
      herd_kind: form.herd_kind,
      head_count: count,
      entry_date: form.entry_date,
      exit_date: form.exit_date || null,
      gta_number: form.gta_number.trim() || null,
      brucelose_tb_exam: form.brucelose_tb_exam,
      exam_date: form.brucelose_tb_exam ? form.exam_date || null : null,
      notes: form.notes.trim() || null,
    }
    const query = editingId
      ? supabase.from('third_party_herds').update(payload).eq('id', editingId).eq('farm_id', farmId).select('*').single()
      : supabase.from('third_party_herds').insert(payload).select('*').single()
    const { data, error } = await query
    setSaving(false)
    if (error) return toast.error('Erro: ' + error.message)
    setHerds(prev => [data as ThirdPartyHerd, ...prev.filter(h => h.id !== data.id)].sort((a, b) => b.entry_date.localeCompare(a.entry_date)))
    toast.success(editingId ? 'Lote atualizado' : 'Lote registrado')
    close()
    router.refresh()
  }

  async function remove(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('third_party_herds').delete().eq('id', id).eq('farm_id', farmId)
    setDeleting(false)
    setConfirmId(null)
    if (error) return toast.error('Erro ao excluir')
    setHerds(prev => prev.filter(h => h.id !== id))
    toast.success('Lote excluído')
    router.refresh()
  }

  const dealText = (h: ThirdPartyHerd) =>
    h.deal_type === 'aluguel'
      ? `${formatCurrency(Number(h.agreed_value ?? 0))} por cabeça por mês`
      : h.settled_value != null
        ? `Parceria, acerto de ${formatCurrency(Number(h.settled_value))}`
        : `Parceria${h.partnership_terms ? `: ${h.partnership_terms}` : ''}`

  const statusBadges = (h: ThirdPartyHerd) => (
    <div className="flex flex-wrap gap-1.5">
      {isOnFarm(h, day)
        ? <Badge className="bg-green-100 text-green-800">No pasto</Badge>
        : <Badge className="bg-muted text-muted-foreground">Saiu em {formatDate(h.exit_date!)}</Badge>}
      {!h.brucelose_tb_exam && <Badge className="bg-amber-100 text-amber-900">Sem exame de brucelose e tuberculose</Badge>}
      {!h.gta_number && <Badge className="bg-amber-100 text-amber-900">Sem GTA</Badge>}
    </div>
  )

  return (
    <div className="pb-24 md:pb-0">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="rounded-lg bg-muted/40 p-3 text-sm flex-1">
          {onFarm.length === 0 ? (
            <p className="text-muted-foreground">Nenhum gado de terceiros no pasto agora.</p>
          ) : (
            <>
              <p>
                No pasto agora: <span className="font-semibold tabular-nums">{heads}</span> {heads === 1 ? 'cabeça' : 'cabeças'} de terceiros
                <span className="text-muted-foreground tabular-nums"> ({num(ua)}&nbsp;UA)</span>
              </p>
              {rent > 0 && (
                <p className="mt-1">Aluguel: <span className="font-semibold tabular-nums">{formatCurrency(rent)}</span> por mês</p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Conta na lotação do pasto. Fica fora do valor do rebanho, porque o gado não é seu.
          </p>
        </div>
        <Button className="hidden md:inline-flex gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Novo lote</Button>
      </div>

      <CardList empty="Nenhum lote de terceiros lançado ainda.">
        {herds.map(h => (
          <RecordCard
            key={h.id}
            title={h.owner_name}
            subtitle={`${h.head_count} ${HERD_KINDS[h.herd_kind].label.toLowerCase()}, desde ${formatDate(h.entry_date)}`}
            fields={[
              { label: DEAL_TYPES[h.deal_type].label, value: dealText(h) },
              ...(h.gta_number ? [{ label: 'GTA', value: h.gta_number }] : []),
              ...(h.brucelose_tb_exam ? [{ label: 'Exame', value: h.exam_date ? formatDate(h.exam_date) : 'sim, sem data' }] : []),
            ]}
            footer={statusBadges(h)}
            onEdit={() => openEdit(h)}
            onDelete={() => setConfirmId(h.id)}
          />
        ))}
      </CardList>

      <DataCard className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dono</TableHead>
              <TableHead>Gado</TableHead>
              <TableHead>Acerto</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {herds.length === 0 && <EmptyState colSpan={6} message="Nenhum lote de terceiros lançado ainda" />}
            {herds.map(h => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.owner_name}</TableCell>
                <TableCell className="tabular-nums">{h.head_count} {HERD_KINDS[h.herd_kind].label.toLowerCase()}</TableCell>
                <TableCell>{dealText(h)}</TableCell>
                <TableCell>{formatDate(h.entry_date)}</TableCell>
                <TableCell>{statusBadges(h)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label="Excluir" onClick={() => setConfirmId(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataCard>

      <MobileActionBar>
        <Button className="h-12 w-full gap-2 text-base" onClick={openNew}><Plus className="h-5 w-5" /> Novo lote</Button>
      </MobileActionBar>

      <Dialog open={open} onOpenChange={o => { if (!o) close() }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar lote' : 'Novo lote de terceiros'}</DialogTitle>
            <DialogDescription>Gado de outra pessoa no seu pasto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Dono do gado *</Label>
              <Input id="owner_name" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_phone">Telefone do dono</Label>
              <Input id="owner_phone" type="tel" inputMode="tel" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Como é o acerto *</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como é o acerto">
                {(Object.keys(DEAL_TYPES) as DealType[]).map(t => (
                  <Button key={t} type="button" role="radio" aria-checked={form.deal_type === t}
                    variant={form.deal_type === t ? 'default' : 'outline'} className="h-11" onClick={() => set('deal_type', t)}>
                    {DEAL_TYPES[t].label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{DEAL_TYPES[form.deal_type].hint}</p>
            </div>
            {form.deal_type === 'aluguel' ? (
              <div className="space-y-2">
                <Label htmlFor="agreed_value">Valor por cabeça por mês (R$) *</Label>
                <Input id="agreed_value" inputMode="decimal" value={form.agreed_value}
                  onChange={e => set('agreed_value', e.target.value)}
                  onBlur={() => { const n = parseBRL(form.agreed_value); if (n != null) set('agreed_value', formatBRL(n)) }} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="partnership_terms">Como foi combinado</Label>
                  <Input id="partnership_terms" placeholder="Ex.: 30% do ganho de peso" value={form.partnership_terms}
                    onChange={e => set('partnership_terms', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settled_value">Quanto recebeu no acerto (R$)</Label>
                  <Input id="settled_value" inputMode="decimal" value={form.settled_value}
                    onChange={e => set('settled_value', e.target.value)}
                    onBlur={() => { const n = parseBRL(form.settled_value); if (n != null) set('settled_value', formatBRL(n)) }} />
                  <p className="text-xs text-muted-foreground">Preencha quando acertar. Entra no ano da data de saída.</p>
                </div>
              </>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-3">
              <div className="space-y-2">
                <Label>Que gado é</Label>
                <Select value={form.herd_kind} onValueChange={v => set('herd_kind', (v || 'boi') as HerdKind)}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HERD_KINDS) as HerdKind[]).map(k => <SelectItem key={k} value={k}>{HERD_KINDS[k].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="head_count">Cabeças *</Label>
                <Input id="head_count" type="number" inputMode="numeric" min={1} value={form.head_count}
                  onChange={e => set('head_count', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Entrada *</Label>
                <Input id="entry_date" type="date" required value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exit_date">Saída</Label>
                <Input id="exit_date" type="date" min={form.entry_date} value={form.exit_date} onChange={e => set('exit_date', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gta_number">Número da GTA</Label>
              <Input id="gta_number" value={form.gta_number} onChange={e => set('gta_number', e.target.value)} />
              <p className="text-xs text-muted-foreground">Guia de Trânsito Animal: o documento que acompanha o gado na estrada. Peça ao dono.</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border p-3 min-h-11 cursor-pointer">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={form.brucelose_tb_exam}
                  onChange={e => set('brucelose_tb_exam', e.target.checked)} />
                <span className="text-sm">
                  Chegou com exame de brucelose e tuberculose
                  <span className="block text-xs text-muted-foreground">Peça o atestado antes de o gado entrar: protege o seu rebanho.</span>
                </span>
              </label>
              {form.brucelose_tb_exam && (
                <div className="space-y-2">
                  <Label htmlFor="exam_date">Data do exame</Label>
                  <Input id="exam_date" type="date" max={today()} value={form.exam_date} onChange={e => set('exam_date', e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp_notes">Observação</Label>
              <Input id="tp_notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <FormActions onCancel={close} isLoading={saving} />
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={o => !o && setConfirmId(null)}
        title="Excluir lote"
        description="Tem certeza que deseja excluir este lote? Se o gado só saiu do pasto, edite e preencha a data de saída."
        onConfirm={async () => { if (confirmId) await remove(confirmId) }}
        loading={deleting}
      />
    </div>
  )
}
