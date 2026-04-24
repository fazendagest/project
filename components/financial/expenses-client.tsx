'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { OperationalExpense, AnimalPurchase, AnimalSale } from '@/types'
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
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { formatDate, formatCurrency, expenseCategoryLabel } from '@/lib/helpers'
import Link from 'next/link'

export function ExpensesClient({
  initialExpenses,
  initialPurchases,
  initialSales,
  farmId,
}: {
  initialExpenses: OperationalExpense[]
  initialPurchases: (AnimalPurchase & { animal?: any })[]
  initialSales: (AnimalSale & { animal?: any })[]
  farmId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [purchases, setPurchases] = useState(initialPurchases)
  const [sales, setSales] = useState(initialSales)
  const [expDialog, setExpDialog] = useState(false)
  const [saleDialog, setSaleDialog] = useState(false)
  const [purchaseDialog, setPurchaseDialog] = useState(false)
  const [delConfirm, setDelConfirm] = useState<{ type: string; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expLoading, setExpLoading] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  const [expForm, setExpForm] = useState({ category: 'mao_de_obra', date: new Date().toISOString().slice(0,10), amount: '', description: '', notes: '' })
  const [saleForm, setSaleForm] = useState({ animal_code: '', buyer_name: '', sale_date: new Date().toISOString().slice(0,10), sale_price: '', weight_kg: '', price_per_kg: '', sale_type: 'venda', notes: '' })
  const [purchaseForm, setPurchaseForm] = useState({ animal_code: '', seller_name: '', purchase_date: new Date().toISOString().slice(0,10), purchase_price: '', weight_kg: '', notes: '' })

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expForm.description || !expForm.amount) return toast.error('Preencha todos os campos obrigatórios')
    setExpLoading(true)
    const { data, error } = await supabase.from('operational_expenses').insert({
      farm_id: farmId,
      category: expForm.category,
      date: expForm.date,
      amount: parseFloat(expForm.amount),
      description: expForm.description,
      notes: expForm.notes || null,
    }).select().single()
    if (error) toast.error('Erro: ' + error.message)
    else { setExpenses(prev => [data, ...prev]); setExpDialog(false); toast.success('Despesa registrada!') }
    setExpLoading(false)
  }

  async function saveSale(e: React.FormEvent) {
    e.preventDefault()
    const { data: animal } = await supabase.from('animals').select('id, species').eq('code', saleForm.animal_code).eq('farm_id', farmId).single()
    if (!animal) return toast.error('Animal não encontrado com este código')
    setSaleLoading(true)
    const { data, error } = await supabase.from('animal_sales').insert({
      farm_id: farmId,
      animal_id: animal.id,
      buyer_name: saleForm.buyer_name || null,
      sale_date: saleForm.sale_date,
      sale_price: parseFloat(saleForm.sale_price),
      weight_kg: saleForm.weight_kg ? parseFloat(saleForm.weight_kg) : null,
      price_per_kg: saleForm.price_per_kg ? parseFloat(saleForm.price_per_kg) : null,
      sale_type: saleForm.sale_type,
      notes: saleForm.notes || null,
    }).select('*, animal:animal_id(code, name)').single()

    if (error) { toast.error('Erro: ' + error.message); setSaleLoading(false); return }

    await supabase.from('animals').update({ status: saleForm.sale_type }).eq('id', animal.id)
    setSales(prev => [data, ...prev])
    setSaleDialog(false)
    toast.success('Venda registrada! Status do animal atualizado.')
    router.refresh()
    setSaleLoading(false)
  }

  async function savePurchase(e: React.FormEvent) {
    e.preventDefault()
    const { data: animal } = await supabase.from('animals').select('id').eq('code', purchaseForm.animal_code).eq('farm_id', farmId).single()
    if (!animal) return toast.error('Animal não encontrado com este código')
    setPurchaseLoading(true)
    const { data, error } = await supabase.from('animal_purchases').insert({
      farm_id: farmId,
      animal_id: animal.id,
      seller_name: purchaseForm.seller_name || null,
      purchase_date: purchaseForm.purchase_date,
      purchase_price: parseFloat(purchaseForm.purchase_price) || 0,
      weight_kg: purchaseForm.weight_kg ? parseFloat(purchaseForm.weight_kg) : null,
      notes: purchaseForm.notes || null,
    }).select('*, animal:animal_id(code, name)').single()
    if (error) toast.error('Erro: ' + error.message)
    else { setPurchases(prev => [data, ...prev]); setPurchaseDialog(false); toast.success('Compra registrada!') }
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
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
          <TabsTrigger value="sales">Vendas ({sales.length})</TabsTrigger>
          <TabsTrigger value="purchases">Compras ({purchases.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
            </p>
            <Button onClick={() => setExpDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Despesa</Button>
          </div>
          <div className="rounded-lg border overflow-x-auto">
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
                {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma despesa</TableCell></TableRow>}
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
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(sales.reduce((s, r) => s + r.sale_price, 0))}</p>
            <Button onClick={() => setSaleDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Registrar Venda</Button>
          </div>
          <div className="rounded-lg border overflow-x-auto">
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
                {sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda</TableCell></TableRow>}
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
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Total: {formatCurrency(purchases.reduce((s, p) => s + p.purchase_price, 0))}</p>
            <Button onClick={() => setPurchaseDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Registrar Compra</Button>
          </div>
          <div className="rounded-lg border overflow-x-auto">
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
                {purchases.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma compra</TableCell></TableRow>}
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
                    <TableCell><div className="flex justify-end"><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'purchase', id: p.id })}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
                <Input type="number" step="0.01" min="0.01" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} required />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código do Animal *</Label>
                <Input value={saleForm.animal_code} onChange={e => setSaleForm(p => ({ ...p, animal_code: e.target.value }))} placeholder="Ex: BOV-001" required />
              </div>
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
                <Input type="number" step="0.01" min="0" value={saleForm.sale_price} onChange={e => setSaleForm(p => ({ ...p, sale_price: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={saleForm.weight_kg} onChange={e => setSaleForm(p => ({ ...p, weight_kg: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço/kg</Label>
                <Input type="number" step="0.01" value={saleForm.price_per_kg} onChange={e => setSaleForm(p => ({ ...p, price_per_kg: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comprador</Label>
              <Input value={saleForm.buyer_name} onChange={e => setSaleForm(p => ({ ...p, buyer_name: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaleDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saleLoading}>{saleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Compra de Animal</DialogTitle></DialogHeader>
          <form onSubmit={savePurchase} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">O animal deve estar previamente cadastrado.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código do Animal *</Label>
                <Input value={purchaseForm.animal_code} onChange={e => setPurchaseForm(p => ({ ...p, animal_code: e.target.value }))} placeholder="Ex: BOV-001" required />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm(p => ({ ...p, purchase_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0" value={purchaseForm.purchase_price} onChange={e => setPurchaseForm(p => ({ ...p, purchase_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={purchaseForm.weight_kg} onChange={e => setPurchaseForm(p => ({ ...p, weight_kg: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Input value={purchaseForm.seller_name} onChange={e => setPurchaseForm(p => ({ ...p, seller_name: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={purchaseLoading}>{purchaseLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
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
