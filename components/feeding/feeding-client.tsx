'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FeedStock, FeedRecord } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MobileActionBar } from '@/components/layout/page-header'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'
import { formatDate, formatCurrency, formatNumber, speciesLabel, parseBRL, formatBRL } from '@/lib/helpers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormActions } from '@/components/ui/form-actions'

/**
 * Cada linha de feed_stock é UMA compra (data, quantidade, preço). O estoque de um
 * produto é a soma das compras com o mesmo nome e unidade. Assim uma compra nova
 * nunca apaga a anterior no Fluxo de Caixa e no DRE (que leem feed_stock pela data).
 * Decisão de 11/11/2026 (opção A).
 */
const QUICK_PRODUCTS = ['Sal Mineral', 'Milho', 'Ração']

const UNIT_LABEL: Record<string, string> = { kg: 'kg', saco: 'saco(s)', fardo: 'fardo(s)', litro: 'litro(s)', outro: 'unid.' }

type ProductGroup = {
  key: string
  name: string
  unit: string
  quantity: number
  min: number
  rows: FeedStock[]
}

const today = () => new Date().toISOString().slice(0, 10)

/** Quantidade comprada (o estoque da linha cai com o consumo; o total pago não). */
function boughtQuantity(p: FeedStock) {
  return p.total_cost != null && p.cost_per_unit ? Number(p.total_cost) / Number(p.cost_per_unit) : Number(p.current_quantity)
}

export function FeedingClient({
  initialStock,
  initialRecords,
  farmId,
}: {
  initialStock: FeedStock[]
  initialRecords: (FeedRecord & { feed_stock?: { product_name?: string; unit?: string } | null })[]
  farmId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [purchases, setPurchases] = useState<FeedStock[]>(initialStock)
  const [records, setRecords] = useState(initialRecords)
  const [purchaseDialog, setPurchaseDialog] = useState<FeedStock | 'new' | null>(null)
  const [consumeDialog, setConsumeDialog] = useState(false)
  const [delConfirm, setDelConfirm] = useState<{ type: 'purchase' | 'record'; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const emptyPurchase = { product_name: '', unit: 'saco', quantity: '', cost_per_unit: '', purchase_date: today(), min_quantity: '' }
  const [form, setForm] = useState(emptyPurchase)
  const [consumeForm, setConsumeForm] = useState({ species: 'bovino', group_key: '', date: today(), quantity_used: '', notes: '' })

  const sortedPurchases = useMemo(
    () => [...purchases].sort((a, b) => (b.purchase_date ?? '').localeCompare(a.purchase_date ?? '')),
    [purchases],
  )

  const groups: ProductGroup[] = useMemo(() => {
    const map = new Map<string, ProductGroup>()
    for (const p of purchases) {
      const key = `${p.product_name.trim().toLowerCase()}|${p.unit}`
      const g = map.get(key) ?? { key, name: p.product_name, unit: p.unit, quantity: 0, min: 0, rows: [] }
      g.quantity += Number(p.current_quantity ?? 0)
      g.min = Math.max(g.min, Number(p.min_quantity ?? 0))
      g.rows.push(p)
      map.set(key, g)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [purchases])

  const knownNames = useMemo(
    () => Array.from(new Set([...QUICK_PRODUCTS, ...purchases.map(p => p.product_name)])),
    [purchases],
  )

  const qty = parseFloat(form.quantity.replace(',', '.')) || 0
  const unitCost = parseBRL(form.cost_per_unit) ?? 0
  const total = qty * unitCost

  function openNew(productName = '') {
    const last = productName ? sortedPurchases.find(p => p.product_name === productName) : undefined
    setForm({
      ...emptyPurchase,
      product_name: productName,
      unit: last?.unit ?? 'saco',
      cost_per_unit: last ? formatBRL(last.cost_per_unit) : '',
      min_quantity: last?.min_quantity ? String(last.min_quantity) : '',
    })
    setPurchaseDialog('new')
  }

  function openEdit(p: FeedStock) {
    setForm({
      product_name: p.product_name,
      unit: p.unit,
      quantity: String(Math.round(boughtQuantity(p) * 100) / 100),
      cost_per_unit: formatBRL(p.cost_per_unit),
      purchase_date: p.purchase_date ?? today(),
      min_quantity: p.min_quantity ? String(p.min_quantity) : '',
    })
    setPurchaseDialog(p)
  }

  async function savePurchase() {
    if (!form.product_name.trim()) return toast.error('Informe o produto')
    if (qty <= 0) return toast.error('Informe a quantidade comprada')
    if (unitCost <= 0) return toast.error('Informe o preço por unidade')
    setSaving(true)
    const payload = {
      farm_id: farmId,
      product_name: toTitleCase(form.product_name.trim()),
      unit: form.unit,
      current_quantity: qty,
      min_quantity: parseFloat(form.min_quantity.replace(',', '.')) || 0,
      cost_per_unit: unitCost,
      purchase_date: form.purchase_date || today(),
      total_cost: total,
      last_updated: new Date().toISOString(),
    }
    if (purchaseDialog === 'new') {
      const { data, error } = await supabase.from('feed_stock').insert(payload).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setPurchases(prev => [...prev, data]); toast.success('Compra registrada'); router.refresh(); setPurchaseDialog(null) }
    } else if (purchaseDialog) {
      // mantém o que já foi consumido desta compra
      const consumed = Math.max(0, boughtQuantity(purchaseDialog) - Number(purchaseDialog.current_quantity))
      payload.current_quantity = Math.max(0, qty - consumed)
      const { data, error } = await supabase.from('feed_stock').update(payload).eq('id', purchaseDialog.id).eq('farm_id', farmId).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setPurchases(prev => prev.map(x => x.id === data.id ? data : x)); toast.success('Compra corrigida'); router.refresh(); setPurchaseDialog(null) }
    }
    setSaving(false)
  }

  async function deletePurchase(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('feed_stock').delete().eq('id', id).eq('farm_id', farmId)
    if (error) toast.error('Erro ao excluir')
    else { setPurchases(prev => prev.filter(s => s.id !== id)); toast.success('Compra excluída'); router.refresh() }
    setDeleting(false)
    setDelConfirm(null)
  }

  /** Consumo (opcional): tira do estoque começando pela compra mais antiga. */
  async function registerConsume(e: React.FormEvent) {
    e.preventDefault()
    const group = groups.find(g => g.key === consumeForm.group_key)
    if (!group) return toast.error('Selecione o produto')
    const used = parseFloat(consumeForm.quantity_used.replace(',', '.'))
    if (!used || used <= 0) return toast.error('Informe a quantidade')
    if (used > group.quantity) return toast.error(`Só há ${formatNumber(group.quantity)} ${UNIT_LABEL[group.unit]} em estoque`)
    setSaving(true)

    const rows = [...group.rows]
      .filter(r => Number(r.current_quantity) > 0)
      .sort((a, b) => (a.purchase_date ?? '').localeCompare(b.purchase_date ?? ''))
    let remaining = used
    let cost = 0
    const updates: { id: string; current_quantity: number }[] = []
    for (const r of rows) {
      if (remaining <= 0) break
      const take = Math.min(remaining, Number(r.current_quantity))
      cost += take * Number(r.cost_per_unit)
      remaining -= take
      updates.push({ id: r.id, current_quantity: Number(r.current_quantity) - take })
    }

    const { data: newRecord, error } = await supabase
      .from('feed_records')
      .insert({
        farm_id: farmId,
        species: consumeForm.species,
        feed_stock_id: rows[0]?.id ?? null,
        date: consumeForm.date,
        quantity_used: used,
        cost_total: cost,
        notes: consumeForm.notes || null,
      })
      .select('*, feed_stock:feed_stock_id(product_name, unit)')
      .single()

    if (error) {
      toast.error('Erro: ' + error.message)
    } else {
      for (const u of updates) {
        await supabase.from('feed_stock')
          .update({ current_quantity: u.current_quantity, last_updated: new Date().toISOString() })
          .eq('id', u.id).eq('farm_id', farmId)
      }
      setPurchases(prev => prev.map(p => {
        const u = updates.find(x => x.id === p.id)
        return u ? { ...p, current_quantity: u.current_quantity } : p
      }))
      setRecords(prev => [newRecord, ...prev])
      toast.success('Consumo registrado')
      router.refresh()
      setConsumeDialog(false)
      setConsumeForm({ species: 'bovino', group_key: '', date: today(), quantity_used: '', notes: '' })
    }
    setSaving(false)
  }

  async function deleteRecord(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('feed_records').delete().eq('id', id).eq('farm_id', farmId)
    if (error) toast.error('Erro ao excluir')
    else { setRecords(prev => prev.filter(r => r.id !== id)); toast.success('Registro excluído'); router.refresh() }
    setDeleting(false)
    setDelConfirm(null)
  }

  return (
    <div className="pb-24 md:pb-0">
      <div className="hidden md:flex justify-end mb-4 -mt-2">
        <Button onClick={() => openNew()} className="gap-2"><Plus className="h-4 w-4" /> Registrar compra</Button>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList className="mb-4">
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="consume">Consumo</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <p className="text-sm text-muted-foreground mb-4">
            Toda compra de sal, milho ou ração entra aqui. O valor vai direto para o Fluxo de Caixa e para o investido de cada animal.
          </p>
          {sortedPurchases.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center space-y-3">
              <p className="font-medium">Nenhuma compra lançada ainda</p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PRODUCTS.map(n => (
                  <Button key={n} variant="outline" className="h-11 md:h-9 rounded-full" onClick={() => openNew(n)}>
                    <Plus className="h-4 w-4" /> {n}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedPurchases.map(p => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(p.purchase_date)}, {formatNumber(boughtQuantity(p), 0)} {UNIT_LABEL[p.unit]} a {formatCurrency(p.cost_per_unit)}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums whitespace-nowrap">{formatCurrency(p.total_cost ?? p.current_quantity * p.cost_per_unit)}</span>
                  <Button size="icon" variant="ghost" aria-label="Corrigir compra" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir compra" className="text-destructive" onClick={() => setDelConfirm({ type: 'purchase', id: p.id })}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="stock">
          <p className="text-sm text-muted-foreground mb-4">Quanto ainda tem de cada produto (compras menos o consumo registrado).</p>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nada em estoque. Registre uma compra.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {groups.map(g => {
                const low = g.min > 0 && g.quantity <= g.min
                return (
                  <li key={g.key} className={`rounded-lg border bg-card p-3 ${low ? 'border-amber-400' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{g.name}</p>
                      {low && <Badge className="bg-amber-100 text-amber-900"><AlertTriangle /> Acabando</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Em estoque: <span className="font-medium text-foreground tabular-nums">{formatNumber(g.quantity, 0)} {UNIT_LABEL[g.unit]}</span>
                      {g.min > 0 && <>, avisa abaixo de {formatNumber(g.min, 0)}</>}
                    </p>
                    <Button variant="outline" className="mt-3 h-11 md:h-9 w-full gap-2" onClick={() => openNew(g.name)}>
                      <Plus className="h-4 w-4" /> Registrar compra de {g.name}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="consume">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <p className="text-sm text-muted-foreground">Opcional: serve só para controlar o estoque. O custo já entrou na compra.</p>
            <Button variant="outline" onClick={() => setConsumeDialog(true)} className="gap-2 shrink-0" disabled={groups.length === 0}>
              <Plus className="h-4 w-4" /> Registrar consumo
            </Button>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && <EmptyState colSpan={5} message="Nenhum consumo registrado" />}
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>{r.species === 'geral' ? 'Todos' : speciesLabel(r.species)}</TableCell>
                    <TableCell>{r.feed_stock?.product_name ?? 'Produto excluído'}</TableCell>
                    <TableCell>{formatNumber(r.quantity_used, 0)} {r.feed_stock?.unit ? UNIT_LABEL[r.feed_stock.unit] : ''}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="text-destructive" aria-label="Excluir consumo"
                          onClick={() => setDelConfirm({ type: 'record', id: r.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>
      </Tabs>

      <MobileActionBar>
        <Button className="h-12 w-full gap-2 text-base" onClick={() => openNew()}>
          <Plus className="h-5 w-5" /> Registrar compra
        </Button>
      </MobileActionBar>

      {/* Compra */}
      <Dialog open={purchaseDialog !== null} onOpenChange={o => !o && setPurchaseDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{purchaseDialog === 'new' ? 'Registrar compra' : 'Corrigir compra'}</DialogTitle>
            <DialogDescription>Como está na nota ou no caderno: o que comprou, quanto e por quanto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feed-product">Produto *</Label>
              {purchaseDialog === 'new' && (
                <div className="flex flex-wrap gap-2">
                  {QUICK_PRODUCTS.map(n => (
                    <Button key={n} type="button" variant={form.product_name === n ? 'default' : 'outline'}
                      className="h-11 md:h-9 rounded-full" onClick={() => setForm(p => ({ ...p, product_name: n }))}>
                      {n}
                    </Button>
                  ))}
                </div>
              )}
              <Input id="feed-product" list="feed-products" value={form.product_name}
                onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
                placeholder="Ou escreva: Sal Proteinado, Silagem..." className="h-11 text-base md:h-9 md:text-sm" />
              <datalist id="feed-products">{knownNames.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-date">Data da compra *</Label>
              <Input id="feed-date" type="date" value={form.purchase_date}
                onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="h-11 text-base md:h-9 md:text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="feed-qty">Quantidade *</Label>
                <Input id="feed-qty" inputMode="decimal" value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="10" className="h-11 text-base md:h-9 md:text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unit} onValueChange={v => v && setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="h-11 md:h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saco">Saco</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="fardo">Fardo</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-price">Preço de cada {form.unit === 'kg' ? 'kg' : form.unit} (R$) *</Label>
              <Input id="feed-price" inputMode="decimal" value={form.cost_per_unit}
                onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))}
                onBlur={() => { const n = parseBRL(form.cost_per_unit); if (n !== null) setForm(p => ({ ...p, cost_per_unit: formatBRL(n) })) }}
                placeholder="25,00" className="h-11 text-base md:h-9 md:text-sm" />
            </div>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Total da compra: <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="feed-min">Avisar quando sobrar menos de (opcional)</Label>
              <Input id="feed-min" inputMode="decimal" value={form.min_quantity}
                onChange={e => setForm(p => ({ ...p, min_quantity: e.target.value }))} placeholder="2" className="h-11 text-base md:h-9 md:text-sm" />
            </div>
          </div>
          <FormActions
            onCancel={() => setPurchaseDialog(null)}
            onSubmit={savePurchase}
            submitLabel={purchaseDialog === 'new' ? 'Registrar compra' : 'Salvar correção'}
            isLoading={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Consumo (opcional) */}
      <Dialog open={consumeDialog} onOpenChange={o => !o && setConsumeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar consumo</DialogTitle>
            <DialogDescription>Opcional. Tira do estoque; o custo já foi contado na compra.</DialogDescription>
          </DialogHeader>
          <form onSubmit={registerConsume} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={consumeForm.group_key} onValueChange={v => v && setConsumeForm(p => ({ ...p, group_key: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.key} value={g.key}>
                      {g.name} ({formatNumber(g.quantity, 0)} {UNIT_LABEL[g.unit]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Para quais animais</Label>
              <Select value={consumeForm.species} onValueChange={v => v && setConsumeForm(p => ({ ...p, species: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bovino">Gado</SelectItem>
                  <SelectItem value="suino">Porcos</SelectItem>
                  <SelectItem value="equino">Cavalos</SelectItem>
                  <SelectItem value="geral">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input inputMode="decimal" value={consumeForm.quantity_used}
                  onChange={e => setConsumeForm(p => ({ ...p, quantity_used: e.target.value }))} placeholder="0" required />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={consumeForm.date}
                  onChange={e => setConsumeForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={consumeForm.notes} onChange={e => setConsumeForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" />
            </div>
            <FormActions onCancel={() => setConsumeDialog(false)} submitLabel="Registrar" isLoading={saving} />
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delConfirm}
        onOpenChange={o => !o && setDelConfirm(null)}
        title={delConfirm?.type === 'purchase' ? 'Excluir compra' : 'Excluir consumo'}
        description={delConfirm?.type === 'purchase'
          ? 'A compra sai do estoque e do Fluxo de Caixa. Esta ação não pode ser desfeita.'
          : 'O consumo sai do histórico. A quantidade não volta para o estoque.'}
        onConfirm={async () => { if (delConfirm) { if (delConfirm.type === 'purchase') await deletePurchase(delConfirm.id); else await deleteRecord(delConfirm.id) } }}
        loading={deleting}
      />
    </div>
  )
}
