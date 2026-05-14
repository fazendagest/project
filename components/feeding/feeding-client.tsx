'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { FeedStock, FeedRecord } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Package, AlertTriangle, Loader2 } from 'lucide-react'
import { toTitleCase } from '@/lib/utils'
import { formatDate, formatCurrency, formatNumber, speciesLabel, parseBRL, formatBRL } from '@/lib/helpers'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'

type StockWithStatus = FeedStock & { low?: boolean }

export function FeedingClient({
  initialStock,
  initialRecords,
  farmId,
}: {
  initialStock: FeedStock[]
  initialRecords: (FeedRecord & { feed_stock?: any })[]
  farmId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [stock, setStock] = useState<StockWithStatus[]>(
    initialStock.map(s => ({ ...s, low: s.current_quantity <= s.min_quantity }))
  )
  const [records, setRecords] = useState(initialRecords)
  const [stockDialog, setStockDialog] = useState<FeedStock | null | 'new'>(null)
  const [consumeDialog, setConsumeDialog] = useState(false)
  const [delConfirm, setDelConfirm] = useState<{ type: 'stock' | 'record'; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [stockForm, setStockForm] = useState({
    product_name: '', unit: 'kg', current_quantity: '', min_quantity: '', cost_per_unit: '',
    purchase_date: new Date().toISOString().slice(0, 10),
  })
  const [consumeForm, setConsumeForm] = useState({
    species: 'bovino', feed_stock_id: '', date: new Date().toISOString().slice(0,10),
    quantity_used: '', notes: '',
  })
  const [stockLoading, setStockLoading] = useState(false)
  const [consumeLoading, setConsumeLoading] = useState(false)

  function openStockNew() {
    setStockForm({ product_name: '', unit: 'kg', current_quantity: '', min_quantity: '', cost_per_unit: '', purchase_date: new Date().toISOString().slice(0, 10) })
    setStockDialog('new')
  }

  function openStockEdit(s: FeedStock) {
    setStockForm({
      product_name: s.product_name,
      unit: s.unit,
      current_quantity: s.current_quantity.toString(),
      min_quantity: s.min_quantity.toString(),
      cost_per_unit: formatBRL(s.cost_per_unit),
      purchase_date: s.purchase_date ?? new Date().toISOString().slice(0, 10),
    })
    setStockDialog(s)
  }

  async function saveStock() {
    if (!stockForm.product_name) return toast.error('Informe o produto')
    setStockLoading(true)
    const qty = parseFloat(stockForm.current_quantity) || 0
    const costPerUnit = parseBRL(stockForm.cost_per_unit) ?? 0
    const payload = {
      farm_id: farmId,
      product_name: stockForm.product_name,
      unit: stockForm.unit,
      current_quantity: qty,
      min_quantity: parseFloat(stockForm.min_quantity) || 0,
      cost_per_unit: costPerUnit,
      purchase_date: stockForm.purchase_date || null,
      total_cost: qty * costPerUnit,
      last_updated: new Date().toISOString(),
    }
    if (stockDialog === 'new') {
      const { data, error } = await supabase.from('feed_stock').insert(payload).select().single()
      if (error) { toast.error('Erro: ' + error.message) }
      else { setStock(prev => [...prev, { ...data, low: data.current_quantity <= data.min_quantity }]); toast.success('Produto criado!'); router.refresh() }
    } else {
      const s = stockDialog as FeedStock
      const { data, error } = await supabase.from('feed_stock').update(payload).eq('id', s.id).eq('farm_id', farmId).select().single()
      if (error) { toast.error('Erro: ' + error.message) }
      else { setStock(prev => prev.map(x => x.id === s.id ? { ...data, low: data.current_quantity <= data.min_quantity } : x)); toast.success('Atualizado!'); router.refresh() }
    }
    setStockDialog(null)
    setStockLoading(false)
  }

  async function deleteStock(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('feed_stock').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { setStock(prev => prev.filter(s => s.id !== id)); toast.success('Produto excluído'); router.refresh() }
    setDeleting(false)
    setDelConfirm(null)
  }

  async function registerConsume(e: React.FormEvent) {
    e.preventDefault()
    if (!consumeForm.feed_stock_id) return toast.error('Selecione o produto')
    const qty = parseFloat(consumeForm.quantity_used)
    if (!qty || qty <= 0) return toast.error('Informe a quantidade')
    setConsumeLoading(true)

    const selectedStock = stock.find(s => s.id === consumeForm.feed_stock_id)!
    const costTotal = qty * selectedStock.cost_per_unit

    const { data: newRecord, error } = await supabase
      .from('feed_records')
      .insert({
        farm_id: farmId,
        species: consumeForm.species,
        feed_stock_id: consumeForm.feed_stock_id,
        date: consumeForm.date,
        quantity_used: qty,
        cost_total: costTotal,
        notes: consumeForm.notes || null,
      })
      .select('*, feed_stock:feed_stock_id(product_name, unit)')
      .single()

    if (error) {
      toast.error('Erro: ' + error.message)
    } else {
      await supabase
        .from('feed_stock')
        .update({ current_quantity: selectedStock.current_quantity - qty, last_updated: new Date().toISOString() })
        .eq('id', selectedStock.id)
        .eq('farm_id', farmId)

      setStock(prev => prev.map(s =>
        s.id === selectedStock.id
          ? { ...s, current_quantity: s.current_quantity - qty, low: (s.current_quantity - qty) <= s.min_quantity }
          : s
      ))
      setRecords(prev => [newRecord, ...prev])
      toast.success('Consumo registrado!')
      router.refresh()
      setConsumeDialog(false)
      setConsumeForm({ species: 'bovino', feed_stock_id: '', date: new Date().toISOString().slice(0,10), quantity_used: '', notes: '' })
    }
    setConsumeLoading(false)
  }

  async function deleteRecord(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('feed_records').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { setRecords(prev => prev.filter(r => r.id !== id)); toast.success('Registro excluído'); router.refresh() }
    setDeleting(false)
    setDelConfirm(null)
  }

  return (
    <div>
      <Tabs defaultValue="stock">
        <TabsList className="mb-4">
          <TabsTrigger value="stock">Estoque</TabsTrigger>
          <TabsTrigger value="consume">Consumo</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{stock.length} produto(s)</p>
            <Button onClick={openStockNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
          </div>

          {stock.length === 0 ? (
            <DataCard>
              <Table>
                <TableBody>
                  <EmptyState colSpan={1} message="Nenhum produto cadastrado no estoque" />
                </TableBody>
              </Table>
            </DataCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stock.map(s => (
                <Card key={s.id} className={s.low ? 'border-red-200' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{s.product_name}</h3>
                      </div>
                      {s.low && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estoque atual</span>
                        <span className={`font-semibold ${s.low ? 'text-red-600' : ''}`}>
                          {formatNumber(s.current_quantity)} {s.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estoque mínimo</span>
                        <span>{formatNumber(s.min_quantity)} {s.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo unitário</span>
                        <span>{formatCurrency(s.cost_per_unit)}/{s.unit}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openStockEdit(s)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDelConfirm({ type: 'stock', id: s.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="consume">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{records.length} registro(s)</p>
            <Button onClick={() => setConsumeDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Registrar Consumo
            </Button>
          </div>

          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Espécie</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && <EmptyState colSpan={6} message="Nenhum registro de consumo" />}
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell><Badge variant="outline">{speciesLabel(r.species)}</Badge></TableCell>
                    <TableCell>{(r.feed_stock as any)?.product_name ?? '—'}</TableCell>
                    <TableCell>{formatNumber(r.quantity_used)} {(r.feed_stock as any)?.unit ?? ''}</TableCell>
                    <TableCell>{formatCurrency(r.cost_total)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="text-destructive"
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

      {/* Stock Dialog */}
      <Dialog open={stockDialog !== null} onOpenChange={o => !o && setStockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{stockDialog === 'new' ? 'Novo Produto' : 'Editar Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input value={stockForm.product_name}
                onChange={e => setStockForm(p => ({ ...p, product_name: e.target.value }))}
                onBlur={e => setStockForm(p => ({ ...p, product_name: toTitleCase(e.target.value) }))}
                placeholder="Ex: Ração bovino adulto" />
            </div>
            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <Input type="date" value={stockForm.purchase_date} onChange={e => setStockForm(p => ({ ...p, purchase_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={stockForm.unit} onValueChange={v => v && setStockForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="saco">Saco</SelectItem>
                    <SelectItem value="fardo">Fardo</SelectItem>
                    <SelectItem value="litro">Litro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo por Unidade (R$)</Label>
                <Input type="text" inputMode="decimal" value={stockForm.cost_per_unit}
                  onChange={e => setStockForm(p => ({ ...p, cost_per_unit: e.target.value }))}
                  onBlur={() => { const n = parseBRL(stockForm.cost_per_unit); if (n !== null) setStockForm(p => ({ ...p, cost_per_unit: formatBRL(n) })) }}
                  placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Quantidade Atual</Label>
                <Input type="number" step="0.01" min="0" value={stockForm.current_quantity}
                  onChange={e => setStockForm(p => ({ ...p, current_quantity: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Quantidade Mínima</Label>
                <Input type="number" step="0.01" min="0" value={stockForm.min_quantity}
                  onChange={e => setStockForm(p => ({ ...p, min_quantity: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialog(null)}>Cancelar</Button>
            <Button onClick={saveStock} disabled={stockLoading}>
              {stockLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consume Dialog */}
      <Dialog open={consumeDialog} onOpenChange={o => !o && setConsumeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Consumo</DialogTitle>
          </DialogHeader>
          <form onSubmit={registerConsume} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Espécie</Label>
              <Select value={consumeForm.species} onValueChange={v => v && setConsumeForm(p => ({ ...p, species: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bovino">Bovino</SelectItem>
                  <SelectItem value="equino">Equino</SelectItem>
                  <SelectItem value="suino">Suíno</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select value={consumeForm.feed_stock_id} onValueChange={v => v && setConsumeForm(p => ({ ...p, feed_stock_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {stock.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.product_name} ({formatNumber(s.current_quantity)} {s.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input type="number" step="0.01" min="0.01" value={consumeForm.quantity_used}
                  onChange={e => setConsumeForm(p => ({ ...p, quantity_used: e.target.value }))} placeholder="0" required />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={consumeForm.date}
                  onChange={e => setConsumeForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
            </div>
            {consumeForm.feed_stock_id && consumeForm.quantity_used && (
              <p className="text-sm text-primary">
                Custo estimado: {formatCurrency(
                  parseFloat(consumeForm.quantity_used) *
                  (stock.find(s => s.id === consumeForm.feed_stock_id)?.cost_per_unit ?? 0)
                )}
              </p>
            )}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={consumeForm.notes} onChange={e => setConsumeForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConsumeDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={consumeLoading}>
                {consumeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delConfirm}
        onOpenChange={o => !o && setDelConfirm(null)}
        title="Excluir"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={async () => { if (delConfirm) { if (delConfirm.type === 'stock') { await deleteStock(delConfirm.id) } else { await deleteRecord(delConfirm.id) } } }}
        loading={deleting}
      />
    </div>
  )
}
