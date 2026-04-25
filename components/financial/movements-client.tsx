'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { OperationalExpense, AnimalPurchase, AnimalSale, FeedStock, HealthRecord, Animal } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, formatCurrency, formatNumber, expenseCategoryLabel, healthTypeLabel, parseBRL, formatBRL } from '@/lib/helpers'
import Link from 'next/link'

const today = new Date().toISOString().slice(0, 10)

export function ExpensesClient({
  initialExpenses,
  initialPurchases,
  initialSales,
  initialFeedStock,
  initialHealthRecords,
  initialAnimals,
  farmId,
}: {
  initialExpenses: OperationalExpense[]
  initialPurchases: (AnimalPurchase & { animal?: any })[]
  initialSales: (AnimalSale & { animal?: any })[]
  initialFeedStock: FeedStock[]
  initialHealthRecords: (HealthRecord & { animal?: any })[]
  initialAnimals: Pick<Animal, 'id' | 'code' | 'name'>[]
  farmId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [purchases, setPurchases] = useState(initialPurchases)
  const [sales, setSales] = useState(initialSales)
  const feedStock = initialFeedStock
  const healthRecords = initialHealthRecords

  const [expDialog, setExpDialog] = useState(false)
  const [saleDialog, setSaleDialog] = useState(false)
  // null = closed | string (uuid) = editing that purchase id
  const [purchaseDialog, setPurchaseDialog] = useState<string | null>(null)
  const [delConfirm, setDelConfirm] = useState<{ type: string; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expLoading, setExpLoading] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  const [expForm, setExpForm] = useState({ category: 'mao_de_obra', date: today, amount: '', description: '', notes: '' })
  const [saleForm, setSaleForm] = useState({ animal_id: '', buyer_name: '', sale_date: today, sale_price: '', weight_kg: '', price_per_kg: '', sale_type: 'venda', notes: '' })
  const [purchaseForm, setPurchaseForm] = useState({
    seller_name: '',
    purchase_date: today,
    purchase_price: '',
    weight_kg: '',
    notes: '',
  })

  const editingPurchase = purchaseDialog ? purchases.find(p => p.id === purchaseDialog) : null

  function openEditPurchase(p: AnimalPurchase & { animal?: any }) {
    setPurchaseForm({
      seller_name: p.seller_name ?? '',
      purchase_date: p.purchase_date,
      purchase_price: p.purchase_price > 0 ? formatBRL(p.purchase_price) : '',
      weight_kg: p.weight_kg ? String(p.weight_kg) : '',
      notes: p.notes ?? '',
    })
    setPurchaseDialog(p.id)
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expForm.description || !expForm.amount) return toast.error('Preencha todos os campos obrigatórios')
    setExpLoading(true)
    const { data, error } = await supabase.from('operational_expenses').insert({
      farm_id: farmId,
      category: expForm.category,
      date: expForm.date,
      amount: parseBRL(expForm.amount) ?? 0,
      description: expForm.description,
      notes: expForm.notes || null,
    }).select().single()
    if (error) toast.error('Erro: ' + error.message)
    else { setExpenses(prev => [data, ...prev]); setExpDialog(false); toast.success('Despesa registrada!') }
    setExpLoading(false)
  }

  async function saveSale(e: React.FormEvent) {
    e.preventDefault()
    if (!saleForm.animal_id) return toast.error('Selecione um animal')
    setSaleLoading(true)
    const { data, error } = await supabase.from('animal_sales').insert({
      farm_id: farmId,
      animal_id: saleForm.animal_id,
      buyer_name: saleForm.buyer_name || null,
      sale_date: saleForm.sale_date,
      sale_price: parseBRL(saleForm.sale_price) ?? 0,
      weight_kg: saleForm.weight_kg ? parseFloat(saleForm.weight_kg) : null,
      price_per_kg: parseBRL(saleForm.price_per_kg),
      sale_type: saleForm.sale_type,
      notes: saleForm.notes || null,
    }).select('*, animal:animal_id(code, name)').single()

    if (error) { toast.error('Erro: ' + error.message); setSaleLoading(false); return }

    await supabase.from('animals').update({ status: saleForm.sale_type }).eq('id', saleForm.animal_id)
    setSales(prev => [data, ...prev])
    setSaleDialog(false)
    toast.success('Venda registrada! Status do animal atualizado.')
    router.refresh()
    setSaleLoading(false)
  }

  async function updatePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!purchaseDialog) return
    setPurchaseLoading(true)
    const { data, error } = await supabase.from('animal_purchases').update({
      seller_name: purchaseForm.seller_name || null,
      purchase_date: purchaseForm.purchase_date,
      purchase_price: parseBRL(purchaseForm.purchase_price) ?? 0,
      weight_kg: purchaseForm.weight_kg ? parseFloat(purchaseForm.weight_kg) : null,
      notes: purchaseForm.notes || null,
    }).eq('id', purchaseDialog).select('*, animal:animal_id(code, name)').single()
    if (error) toast.error('Erro: ' + error.message)
    else {
      setPurchases(prev => prev.map(p => p.id === purchaseDialog ? data : p))
      setPurchaseDialog(null)
      toast.success('Compra atualizada!')
    }
    setPurchaseLoading(false)
  }

  async function handleDelete() {
    if (!delConfirm) return
    setDeleting(true)
    let error
    if (delConfirm.type === 'expense') {
      ;({ error } = await supabase.from('operational_expenses').delete().eq('id', delConfirm.id))
      if (!error) setExpenses(prev => prev.filter(e => e.id !== delConfirm.id))
    } else if (delConfirm.type === 'sale') {
      ;({ error } = await supabase.from('animal_sales').delete().eq('id', delConfirm.id))
      if (!error) setSales(prev => prev.filter(s => s.id !== delConfirm.id))
    } else {
      ;({ error } = await supabase.from('animal_purchases').delete().eq('id', delConfirm.id))
      if (!error) setPurchases(prev => prev.filter(p => p.id !== delConfirm.id))
    }
    if (error) toast.error('Erro ao excluir')
    else toast.success('Excluído com sucesso')
    setDeleting(false)
    setDelConfirm(null)
  }

  return (
    <div>
      <Tabs defaultValue="expenses">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
          <TabsTrigger value="purchases">Compras ({purchases.length})</TabsTrigger>
          <TabsTrigger value="feeding">Alimentação ({feedStock.length})</TabsTrigger>
          <TabsTrigger value="health">Saúde ({healthRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
            <Button onClick={() => setExpDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Despesa</Button>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 && <EmptyState colSpan={5} message="Nenhuma despesa" />}
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell><Badge variant="outline">{expenseCategoryLabel(e.category)}</Badge></TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatCurrency(e.amount)}</TableCell>
                    <TableCell><div className="flex justify-end"><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'expense', id: e.id })}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>

        <TabsContent value="sales">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(sales.reduce((s, r) => s + r.sale_price, 0))}</p>
            <Button onClick={() => { setSaleForm({ animal_id: '', buyer_name: '', sale_date: today, sale_price: '', weight_kg: '', price_per_kg: '', sale_type: 'venda', notes: '' }); setSaleDialog(true) }} className="gap-2"><Plus className="h-4 w-4" /> Registrar Venda</Button>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && <EmptyState colSpan={7} message="Nenhuma venda" />}
                {sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.sale_date)}</TableCell>
                    <TableCell>
                      <Link href={`/animals/${s.animal_id}`} className="font-mono font-semibold text-primary hover:underline">
                        {(s.animal as any)?.code ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{s.buyer_name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.sale_type}</Badge></TableCell>
                    <TableCell>{s.weight_kg ?? '—'}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatCurrency(s.sale_price)}</TableCell>
                    <TableCell><div className="flex justify-end"><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'sale', id: s.id })}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>

        <TabsContent value="purchases">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(purchases.reduce((s, p) => s + p.purchase_price, 0))}</p>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 && <EmptyState colSpan={6} message="Nenhuma compra" />}
                {purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.purchase_date)}</TableCell>
                    <TableCell>
                      <Link href={`/animals/${p.animal_id}`} className="font-mono font-semibold text-primary hover:underline">
                        {(p.animal as any)?.code ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{p.seller_name ?? '—'}</TableCell>
                    <TableCell>{p.weight_kg ?? '—'}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatCurrency(p.purchase_price)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditPurchase(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'purchase', id: p.id })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>

        <TabsContent value="feeding">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(feedStock.reduce((s, r) => s + (r.total_cost ?? 0), 0))}
              {' '}· Entradas de estoque lançadas em <Link href="/feeding" className="text-primary hover:underline">Alimentação</Link>
            </p>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data da Compra</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo/Unid.</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedStock.length === 0 && <EmptyState colSpan={5} message="Nenhuma entrada de estoque registrada" />}
                {feedStock.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.purchase_date ? formatDate(r.purchase_date) : '—'}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>{formatNumber(r.current_quantity)} {r.unit}</TableCell>
                    <TableCell>{formatCurrency(r.cost_per_unit)}/{r.unit}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatCurrency(r.total_cost ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>

        <TabsContent value="health">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(healthRecords.reduce((s, r) => s + (r.cost ?? 0), 0))}
              {' '}· Registros lançados em <Link href="/health" className="text-primary hover:underline">Saúde</Link>
            </p>
          </div>
          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto / Procedimento</TableHead>
                  <TableHead>Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthRecords.length === 0 && <EmptyState colSpan={5} message="Nenhum registro de saúde com custo" />}
                {healthRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.application_date)}</TableCell>
                    <TableCell>
                      <Link href={`/animals/${r.animal_id}`} className="font-mono font-semibold text-primary hover:underline">
                        {(r.animal as any)?.code ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{healthTypeLabel(r.type)}</Badge></TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatCurrency(r.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataCard>
        </TabsContent>
      </Tabs>

      {/* Expense Dialog */}
      <Dialog open={expDialog} onOpenChange={setExpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Despesa Operacional</DialogTitle></DialogHeader>
          <form onSubmit={saveExpense} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={expForm.category} onValueChange={v => v && setExpForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['mao_de_obra','energia','manutencao','transporte','equipamento','veterinario','outro'].map(c => (
                    <SelectItem key={c} value={c}>{expenseCategoryLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="text" inputMode="decimal" value={expForm.amount}
                  onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))}
                  onBlur={() => { const n = parseBRL(expForm.amount); if (n !== null) setExpForm(p => ({ ...p, amount: formatBRL(n) })) }}
                  placeholder="0,00" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva a despesa" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={expLoading}>{expLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleDialog} onOpenChange={setSaleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Venda / Abate</DialogTitle></DialogHeader>
          <form onSubmit={saveSale} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Animal *</Label>
              {initialAnimals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum animal ativo cadastrado.</p>
              ) : (
                <Select value={saleForm.animal_id} onValueChange={v => v && setSaleForm(p => ({ ...p, animal_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um animal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {initialAnimals.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code}{a.name ? ` · ${a.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={saleForm.sale_type} onValueChange={v => v && setSaleForm(p => ({ ...p, sale_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venda">Venda</SelectItem>
                    <SelectItem value="abate">Abate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={saleForm.sale_date} onChange={e => setSaleForm(p => ({ ...p, sale_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="text" inputMode="decimal" value={saleForm.sale_price}
                  onChange={e => setSaleForm(p => ({ ...p, sale_price: e.target.value }))}
                  onBlur={() => { const n = parseBRL(saleForm.sale_price); if (n !== null) setSaleForm(p => ({ ...p, sale_price: formatBRL(n) })) }}
                  placeholder="0,00" required />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={saleForm.weight_kg} onChange={e => setSaleForm(p => ({ ...p, weight_kg: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço/kg (R$)</Label>
                <Input type="text" inputMode="decimal" value={saleForm.price_per_kg}
                  onChange={e => setSaleForm(p => ({ ...p, price_per_kg: e.target.value }))}
                  onBlur={() => { const n = parseBRL(saleForm.price_per_kg); if (n !== null) setSaleForm(p => ({ ...p, price_per_kg: formatBRL(n) })) }}
                  placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comprador</Label>
              <Input value={saleForm.buyer_name} onChange={e => setSaleForm(p => ({ ...p, buyer_name: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaleDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saleLoading || !saleForm.animal_id}>{saleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog — edit only */}
      <Dialog open={purchaseDialog !== null} onOpenChange={o => !o && setPurchaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={updatePurchase} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Animal</Label>
              <p className="text-sm font-mono font-semibold">
                {(editingPurchase?.animal as any)?.code ?? '—'}
                {(editingPurchase?.animal as any)?.name ? ` · ${(editingPurchase?.animal as any)?.name}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm(p => ({ ...p, purchase_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="text" inputMode="decimal" value={purchaseForm.purchase_price}
                  onChange={e => setPurchaseForm(p => ({ ...p, purchase_price: e.target.value }))}
                  onBlur={() => { const n = parseBRL(purchaseForm.purchase_price); if (n !== null) setPurchaseForm(p => ({ ...p, purchase_price: formatBRL(n) })) }}
                  placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={purchaseForm.weight_kg} onChange={e => setPurchaseForm(p => ({ ...p, weight_kg: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input value={purchaseForm.seller_name} onChange={e => setPurchaseForm(p => ({ ...p, seller_name: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={purchaseLoading}>
                {purchaseLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delConfirm}
        onOpenChange={o => !o && setDelConfirm(null)}
        title="Excluir Registro"
        description="Tem certeza que deseja excluir este registro?"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
