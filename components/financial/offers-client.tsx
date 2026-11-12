'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions } from '@/components/ui/form-actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CardList, RecordCard } from '@/components/ui/record-card'
import { DataCard } from '@/components/ui/data-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MobileActionBar } from '@/components/layout/page-header'
import { animalCategory, formatBRL, formatDate, parseBRL } from '@/lib/helpers'
import { toTitleCase } from '@/lib/utils'
import { ARROBA_BASIS, DEFAULT_BASIS, type ArrobaBasis } from '@/lib/sale-arroba'
import type { IfagPrices } from '@/lib/market-reference'
import {
  bestOffers, computeOffer, isOpenOffer, paymentText, OFFER_DAYS,
  type OfferAnimal, type OfferResult, type SaleOffer,
} from '@/lib/sale-offers'

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const name = (a: OfferAnimal) => a.name || a.code

type FormState = {
  buyer_name: string
  animal_ids: string[]
  price_kind: 'arroba' | 'cabeca'
  price: string
  arroba_basis: ArrobaBasis
  est_arrobas: string
  freight_by: 'comprador' | 'vendedor'
  freight_value: string
  payment: 'vista' | 'prazo'
  payment_days: string
  offer_date: string
  notes: string
}

const empty = (today: string): FormState => ({
  buyer_name: '', animal_ids: [], price_kind: 'arroba', price: '', arroba_basis: DEFAULT_BASIS, est_arrobas: '',
  freight_by: 'comprador', freight_value: '', payment: 'vista', payment_days: '', offer_date: today, notes: '',
})

/** Escolha entre duas ou três opções, com botões do mesmo tamanho. */
function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={`grid gap-2 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="radiogroup" aria-label={label}>
        {options.map(([k, text]) => (
          <Button key={k} type="button" role="radio" aria-checked={value === k}
            variant={value === k ? 'default' : 'outline'} className="h-11 px-2" onClick={() => onChange(k)}>
            {text}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function OffersClient({ initialOffers, animals, farmId, ifag, today }: {
  initialOffers: SaleOffer[]
  animals: OfferAnimal[]
  farmId: string
  ifag: IfagPrices | null
  today: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [offers, setOffers] = useState(initialOffers)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => empty(today))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const byId = useMemo(() => new Map(animals.map(a => [a.id, a])), [animals])
  const active = animals.filter(a => a.status === 'ativo')
  const visible = offers.filter(o => isOpenOffer(o, byId, today))
  const results = useMemo(() => new Map(visible.map(o => [o.id, computeOffer(o, byId, ifag)])), [visible, byId, ifag])
  const best = bestOffers(visible, results)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const selected = form.animal_ids.map(id => byId.get(id)).filter((a): a is OfferAnimal => !!a)
  const missingWeight = form.price_kind === 'arroba' ? selected.filter(a => !(a.weight_arrobas && a.weight_arrobas > 0)).length : 0

  // Prévia da conta no formulário, antes de salvar.
  const preview: OfferResult | null = useMemo(() => {
    const price = parseBRL(form.price)
    if (!price || form.animal_ids.length === 0) return null
    return computeOffer({
      id: 'previa', buyer_name: form.buyer_name, animal_ids: form.animal_ids, price_kind: form.price_kind, price,
      arroba_basis: form.arroba_basis, est_arrobas: Number(form.est_arrobas.replace(',', '.')) || null,
      freight_by: form.freight_by, freight_value: parseBRL(form.freight_value), payment: form.payment,
      payment_days: parseInt(form.payment_days, 10) || null, offer_date: form.offer_date, notes: null,
    }, byId, ifag)
  }, [form, byId, ifag])

  function openNew() {
    setForm(empty(today))
    setSearch('')
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const price = parseBRL(form.price)
    if (!form.buyer_name.trim()) return toast.error('Informe o comprador')
    if (form.animal_ids.length === 0) return toast.error('Marque os animais da oferta')
    if (!price || price <= 0) return toast.error('Informe o preço')
    const est = Number(form.est_arrobas.replace(',', '.'))
    if (missingWeight > 0 && !(est > 0 && est < 100)) return toast.error('Informe o peso estimado em @ (se não pesou, estime)')
    const freight = form.freight_by === 'vendedor' ? parseBRL(form.freight_value) : null
    if (form.freight_by === 'vendedor' && (freight == null || freight < 0)) return toast.error('Informe quanto você paga de frete')
    setSaving(true)
    const { data, error } = await supabase.from('sale_offers').insert({
      farm_id: farmId,
      buyer_name: form.buyer_name.trim(),
      animal_ids: form.animal_ids,
      price_kind: form.price_kind,
      price,
      arroba_basis: form.arroba_basis,
      est_arrobas: missingWeight > 0 ? est : null,
      freight_by: form.freight_by,
      freight_value: freight,
      payment: form.payment,
      payment_days: form.payment === 'prazo' ? parseInt(form.payment_days, 10) || null : null,
      offer_date: form.offer_date,
      notes: form.notes.trim() || null,
    }).select('*').single()
    setSaving(false)
    if (error) return toast.error('Erro: ' + error.message)
    setOffers(prev => [data as SaleOffer, ...prev])
    setOpen(false)
    toast.success('Oferta anotada')
    router.refresh()
  }

  async function remove() {
    if (!confirmId) return
    setDeleting(true)
    const { error } = await supabase.from('sale_offers').delete().eq('id', confirmId).eq('farm_id', farmId)
    setDeleting(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setOffers(prev => prev.filter(o => o.id !== confirmId))
    setConfirmId(null)
    router.refresh()
  }

  const priceText = (o: SaleOffer) =>
    o.price_kind === 'cabeca' ? `${money(o.price)} por cabeça` : `${money(o.price)} por ${ARROBA_BASIS[o.arroba_basis].short}`
  const animalsText = (r: OfferResult) =>
    r.animals.length <= 3 ? r.animals.map(name).join(', ') : `${r.animals.length} animais: ${r.animals.slice(0, 3).map(name).join(', ')} e mais ${r.animals.length - 3}`
  const refText = (r: OfferResult) =>
    r.refPerHead == null ? 'sem referência' : `${money(r.refPerHead)} por cabeça${r.belowPct != null ? `, ${r.belowPct}% abaixo` : ''}`
  const closeLink = (o: SaleOffer) => `/app/financial/movements?aba=vendas&oferta=${o.id}`

  return (
    <div>
      <div className="mb-4 hidden items-center justify-between md:flex">
        <p className="text-sm text-muted-foreground">Só você vê. Nada é enviado ao comprador. Cada oferta some depois de {OFFER_DAYS} dias ou quando os animais dela forem vendidos.</p>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Anotar oferta</Button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground md:hidden">Só você vê. Nada é enviado ao comprador. Cada oferta some depois de {OFFER_DAYS} dias ou quando os animais dela forem vendidos.</p>

      <CardList empty="Nenhuma oferta anotada. Quando um comprador fizer uma oferta, anote aqui para comparar.">
        {visible.map(o => {
          const r = results.get(o.id)!
          return (
            <RecordCard
              key={o.id}
              title={<>{o.buyer_name}{best.has(o.id) && <Badge className="ml-2">Melhor líquido</Badge>}</>}
              subtitle={`${animalsText(r)}. ${formatDate(o.offer_date)}, ${paymentText(o)}`}
              amount={r.net != null ? money(r.net) : 'falta peso'}
              fields={[
                { label: 'Preço', value: priceText(o) },
                ...(r.gross != null ? [{ label: 'Bruto', value: money(r.gross) }] : []),
                ...(r.funrural != null ? [{ label: 'Funrural 1,63%', value: `-${money(r.funrural)}` }] : []),
                ...(r.freight > 0 ? [{ label: 'Frete seu', value: `-${money(r.freight)}` }] : []),
                ...(r.netPerHead != null ? [{ label: 'Líquido por cabeça', value: money(r.netPerHead) }] : []),
                { label: 'Goiás', value: refText(r) },
              ]}
              footer={
                <div className="space-y-2">
                  {r.noWeight > 0 && o.price_kind === 'arroba' && <p className="text-xs text-muted-foreground">{r.noWeight === r.animals.length ? 'Peso estimado' : `${r.noWeight} pelo peso estimado`} ({o.est_arrobas}&nbsp;@ vivo cada).</p>}
                  <Link href={closeLink(o)}><Button variant="outline" className="h-11 w-full">Fechar com esta</Button></Link>
                </div>
              }
              onDelete={() => setConfirmId(o.id)}
            />
          )
        })}
      </CardList>

      {/* Tabela cabe em 1366 px (achado b do teste do Tião): as colunas de palavras quebram linha. */}
      <DataCard className="hidden md:block">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma oferta anotada. Quando um comprador fizer uma oferta, anote aqui para comparar.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprador</TableHead>
                <TableHead>Animais</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Funrural e frete</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Goiás</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(o => {
                const r = results.get(o.id)!
                return (
                  <TableRow key={o.id}>
                    <TableCell className="min-w-[140px] whitespace-normal font-medium">
                      {o.buyer_name}
                      {best.has(o.id) && <Badge className="ml-2">Melhor líquido</Badge>}
                      <span className="block text-xs font-normal text-muted-foreground">{formatDate(o.offer_date)}, {paymentText(o)}</span>
                    </TableCell>
                    <TableCell className="max-w-[160px] whitespace-normal">{animalsText(r)}</TableCell>
                    <TableCell className="max-w-[150px] whitespace-normal">
                      {priceText(o)}
                      {r.noWeight > 0 && o.price_kind === 'arroba' && <span className="block text-xs text-muted-foreground">peso estimado: {o.est_arrobas}&nbsp;@ vivo</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.gross != null ? money(r.gross) : 'falta peso'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.funrural != null ? `-${money(r.funrural + r.freight)}` : 'sem conta'}
                      {r.freight > 0 && <span className="block text-xs text-muted-foreground">frete seu {money(r.freight)}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.net != null ? money(r.net) : 'sem conta'}
                      {r.netPerHead != null && <span className="block text-xs font-normal text-muted-foreground">{money(r.netPerHead)} por cabeça</span>}
                    </TableCell>
                    <TableCell className="max-w-[150px] whitespace-normal text-sm">{refText(r)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={closeLink(o)}><Button variant="outline" size="sm">Fechar com esta</Button></Link>
                        <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Excluir a oferta de ${o.buyer_name}`} onClick={() => setConfirmId(o.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>

      <MobileActionBar>
        <Button className="h-12 w-full gap-2 text-base" onClick={openNew}><Plus className="h-5 w-5" /> Anotar oferta</Button>
      </MobileActionBar>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Anotar oferta</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="buyer">Comprador *</Label>
              <Input id="buyer" value={form.buyer_name} maxLength={120}
                onChange={e => set('buyer_name', e.target.value)}
                onBlur={e => set('buyer_name', toTitleCase(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Animais da oferta *</Label>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, código ou categoria" />
              <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {active
                  .filter(a => {
                    const q = search.trim().toLowerCase()
                    return !q || a.code.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q) || animalCategory(a).toLowerCase().includes(q)
                  })
                  .map(a => {
                    const checked = form.animal_ids.includes(a.id)
                    return (
                      <li key={a.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted">
                          <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked}
                            onChange={() => set('animal_ids', checked ? form.animal_ids.filter(x => x !== a.id) : [...form.animal_ids, a.id])} />
                          <span className="min-w-0 flex-1 truncate">{a.name ?? 'Sem nome'} <span className="font-mono text-xs text-muted-foreground">{a.code}</span></span>
                          <span className="text-xs text-muted-foreground">{animalCategory(a)}</span>
                        </label>
                      </li>
                    )
                  })}
              </ul>
              <p className="text-xs text-muted-foreground">{form.animal_ids.length} selecionado(s).</p>
            </div>
            <Choice label="O preço é" value={form.price_kind} options={[['arroba', 'Por @'], ['cabeca', 'Por cabeça']]} onChange={v => set('price_kind', v)} />
            {form.price_kind === 'arroba' && (
              <Choice label="A arroba é de quê?" value={form.arroba_basis} options={[['vivo', ARROBA_BASIS.vivo.label], ['carcaca', ARROBA_BASIS.carcaca.label]]} onChange={v => set('arroba_basis', v)} />
            )}
            <div className="space-y-2">
              <Label htmlFor="price">{form.price_kind === 'arroba' ? 'R$ por @ *' : 'R$ por cabeça *'}</Label>
              <Input id="price" inputMode="decimal" value={form.price}
                onChange={e => set('price', e.target.value)}
                onBlur={() => { const n = parseBRL(form.price); if (n !== null) set('price', formatBRL(n)) }} />
            </div>
            {missingWeight > 0 && (
              <div className="space-y-2">
                <Label htmlFor="est">Peso médio estimado por cabeça (@ vivo) *</Label>
                <Input id="est" inputMode="decimal" value={form.est_arrobas} onChange={e => set('est_arrobas', e.target.value)} />
                <p className="text-xs text-muted-foreground">{missingWeight === 1 ? '1 animal não tem peso' : `${missingWeight} animais não têm peso`} no cadastro. Se não pesou, estime.</p>
              </div>
            )}
            <Choice label="Quem paga o frete?" value={form.freight_by} options={[['comprador', 'O comprador'], ['vendedor', 'Eu']]} onChange={v => set('freight_by', v)} />
            {form.freight_by === 'vendedor' && (
              <div className="space-y-2">
                <Label htmlFor="freight">Quanto você paga de frete (R$) *</Label>
                <Input id="freight" inputMode="decimal" value={form.freight_value}
                  onChange={e => set('freight_value', e.target.value)}
                  onBlur={() => { const n = parseBRL(form.freight_value); if (n !== null) set('freight_value', formatBRL(n)) }} />
              </div>
            )}
            <Choice label="Pagamento" value={form.payment} options={[['vista', 'À vista'], ['prazo', 'A prazo']]} onChange={v => set('payment', v)} />
            {form.payment === 'prazo' && (
              <div className="space-y-2">
                <Label htmlFor="days">Em quantos dias (opcional)</Label>
                <Input id="days" type="number" min="1" max="720" step="1" value={form.payment_days} onChange={e => set('payment_days', e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="date">Data da oferta</Label>
              <Input id="date" type="date" value={form.offer_date} max={today} onChange={e => set('offer_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observação</Label>
              <Input id="notes" value={form.notes} maxLength={500} onChange={e => set('notes', e.target.value)} />
            </div>
            {preview && (
              <div className="space-y-0.5 rounded-lg border bg-muted/40 px-3 py-2 text-sm tabular-nums">
                {preview.gross == null ? (
                  <p>Falta o peso para fazer a conta.</p>
                ) : (
                  <>
                    <p>Bruto {money(preview.gross)}, Funrural -{money(preview.funrural ?? 0)}{preview.freight > 0 ? `, frete -${money(preview.freight)}` : ''}.</p>
                    <p className="font-semibold">Líquido {money(preview.net ?? 0)} ({money(preview.netPerHead ?? 0)} por cabeça).</p>
                  </>
                )}
                <p>Referência de Goiás: {refText(preview)}.</p>
              </div>
            )}
            <FormActions onCancel={() => setOpen(false)} isLoading={saving} submitLabel="Anotar" />
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={o => !o && setConfirmId(null)}
        title="Excluir esta oferta?"
        description="Some só daqui. Nenhuma venda é mexida."
        onConfirm={remove}
        loading={deleting}
        confirmLabel="Excluir"
      />
    </div>
  )
}
