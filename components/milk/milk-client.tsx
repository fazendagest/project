'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MilkProduction, MilkPayment } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Droplets, TrendingUp, DollarSign } from 'lucide-react'
import { formatDate, formatCurrency, formatNumber, parseBRL, formatBRL, monthLabel } from '@/lib/helpers'
import { toTitleCase } from '@/lib/utils'

interface Props {
  farmId: string
  initialProduction: MilkProduction[]
  initialPayments: MilkPayment[]
  todayStr: string
  monthStart: string
  monthEnd: string
  yearStart: string
  currentMonth: string
}

function statsProduction(records: MilkProduction[], todayStr: string, monthStart: string, monthEnd: string) {
  const monthRecords = records.filter(r => r.date >= monthStart && r.date <= monthEnd)
  const todayTotal = records.filter(r => r.date === todayStr).reduce((s, r) => s + Number(r.total_liters), 0)
  const monthTotal = monthRecords.reduce((s, r) => s + Number(r.total_liters), 0)
  const daysElapsed = Math.max(1, new Date(todayStr).getDate())
  const dailyAvg = monthTotal / daysElapsed
  return { todayTotal, monthTotal, dailyAvg }
}

function statsPayments(payments: MilkPayment[], currentMonth: string, yearStart: string) {
  const monthPayments = payments.filter(p => p.reference_month?.slice(0, 7) === currentMonth)
  const yearPayments = payments.filter(p => (p.reference_month ?? '') >= yearStart)
  const monthRevenue = monthPayments.reduce((s, p) => s + Number(p.total_amount ?? 0), 0)
  const yearRevenue = yearPayments.reduce((s, p) => s + Number(p.total_amount ?? 0), 0)
  const allLiters = payments.reduce((s, p) => s + Number(p.total_liters ?? 0), 0)
  const allRevenue = payments.reduce((s, p) => s + Number(p.total_amount ?? 0), 0)
  const avgPrice = allLiters > 0 ? allRevenue / allLiters : 0
  return { monthRevenue, yearRevenue, avgPrice }
}

export function MilkClient({
  farmId, initialProduction, initialPayments,
  todayStr, monthStart, monthEnd, yearStart, currentMonth,
}: Props) {
  const supabase = createClient()
  const [production, setProduction] = useState<MilkProduction[]>(initialProduction)
  const [payments, setPayments] = useState<MilkPayment[]>(initialPayments)

  // Production dialog
  const [prodDialog, setProdDialog] = useState<MilkProduction | null | 'new'>(null)
  const [prodForm, setProdForm] = useState({ date: todayStr, total_liters: '', notes: '' })
  const [prodLoading, setProdLoading] = useState(false)

  // Payment dialog
  const [payDialog, setPayDialog] = useState<MilkPayment | null | 'new'>(null)
  const [payForm, setPayForm] = useState({
    reference_month: currentMonth,
    payment_date: todayStr,
    buyer_name: '',
    total_liters: '',
    price_per_liter: '',
    notes: '',
  })
  const [payLoading, setPayLoading] = useState(false)

  const [delConfirm, setDelConfirm] = useState<{ type: 'prod' | 'pay'; id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Computed stats
  const ps = statsProduction(production, todayStr, monthStart, monthEnd)
  const qs = statsPayments(payments, currentMonth, yearStart)

  // Computed payment total
  const payTotal = (() => {
    const liters = parseFloat(payForm.total_liters) || 0
    const price = parseBRL(payForm.price_per_liter) ?? 0
    return liters * price
  })()

  function openProdNew() {
    setProdForm({ date: todayStr, total_liters: '', notes: '' })
    setProdDialog('new')
  }

  function openProdEdit(r: MilkProduction) {
    setProdForm({ date: r.date, total_liters: String(r.total_liters), notes: r.notes ?? '' })
    setProdDialog(r)
  }

  async function saveProd() {
    const liters = parseFloat(prodForm.total_liters)
    if (!prodForm.date || !liters || liters <= 0) return toast.error('Data e litros são obrigatórios')
    setProdLoading(true)

    const payload = { farm_id: farmId, date: prodForm.date, total_liters: liters, notes: prodForm.notes || null }

    if (prodDialog === 'new') {
      const { data, error } = await supabase.from('milk_production').insert(payload).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setProduction(prev => [data, ...prev].sort((a, b) => b.date.localeCompare(a.date))); toast.success('Produção registrada!') }
    } else {
      const r = prodDialog as MilkProduction
      const { data, error } = await supabase.from('milk_production').update(payload).eq('id', r.id).eq('farm_id', farmId).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setProduction(prev => prev.map(x => x.id === r.id ? data : x)); toast.success('Atualizado!') }
    }

    setProdDialog(null)
    setProdLoading(false)
  }

  function openPayNew() {
    setPayForm({ reference_month: currentMonth, payment_date: todayStr, buyer_name: '', total_liters: '', price_per_liter: '', notes: '' })
    setPayDialog('new')
  }

  function openPayEdit(p: MilkPayment) {
    setPayForm({
      reference_month: p.reference_month?.slice(0, 7) ?? currentMonth,
      payment_date: p.payment_date ?? todayStr,
      buyer_name: p.buyer_name ?? '',
      total_liters: p.total_liters != null ? String(p.total_liters) : '',
      price_per_liter: p.price_per_liter != null ? formatBRL(Number(p.price_per_liter)) : '',
      notes: p.notes ?? '',
    })
    setPayDialog(p)
  }

  async function savePay() {
    if (!payForm.reference_month) return toast.error('Mês de referência obrigatório')
    setPayLoading(true)

    const liters = parseFloat(payForm.total_liters) || null
    const price = parseBRL(payForm.price_per_liter) ?? null
    const total = liters && price ? liters * price : (parseBRL(payForm.total_liters) ?? null)

    const payload = {
      farm_id: farmId,
      reference_month: payForm.reference_month + '-01',
      payment_date: payForm.payment_date || null,
      buyer_name: payForm.buyer_name || null,
      total_liters: liters,
      price_per_liter: price,
      total_amount: liters && price ? liters * price : null,
      notes: payForm.notes || null,
    }

    if (payDialog === 'new') {
      const { data, error } = await supabase.from('milk_payments').insert(payload).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setPayments(prev => [data, ...prev].sort((a, b) => (b.reference_month ?? '').localeCompare(a.reference_month ?? ''))); toast.success('Pagamento registrado!') }
    } else {
      const p = payDialog as MilkPayment
      const { data, error } = await supabase.from('milk_payments').update(payload).eq('id', p.id).eq('farm_id', farmId).select().single()
      if (error) toast.error('Erro: ' + error.message)
      else { setPayments(prev => prev.map(x => x.id === p.id ? data : x)); toast.success('Atualizado!') }
    }

    setPayDialog(null)
    setPayLoading(false)
  }

  async function deleteProd(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('milk_production').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { setProduction(prev => prev.filter(r => r.id !== id)); toast.success('Excluído!') }
    setDeleting(false)
    setDelConfirm(null)
  }

  async function deletePay(id: string) {
    setDeleting(true)
    const { error } = await supabase.from('milk_payments').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { setPayments(prev => prev.filter(p => p.id !== id)); toast.success('Excluído!') }
    setDeleting(false)
    setDelConfirm(null)
  }

  return (
    <div>
      <Tabs defaultValue="producao">
        <TabsList className="mb-6">
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        {/* ── ABA PRODUÇÃO ── */}
        <TabsContent value="producao" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="h-4 w-4" />
                  <p className="text-sm">Produção hoje</p>
                </div>
                <p className="text-2xl font-bold">{formatNumber(ps.todayTotal, 0)} L</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm">Média diária do mês</p>
                </div>
                <p className="text-2xl font-bold">{formatNumber(ps.dailyAvg, 1)} L</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="h-4 w-4" />
                  <p className="text-sm">Total do mês</p>
                </div>
                <p className="text-2xl font-bold">{formatNumber(ps.monthTotal, 0)} L</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{production.length} registro(s)</p>
            <Button onClick={openProdNew} className="gap-2">
              <Plus className="h-4 w-4" /> Registrar produção
            </Button>
          </div>

          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Total (litros)</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {production.length === 0 && <EmptyState colSpan={4} message="Nenhum registro de produção" />}
                {production.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="font-medium">{formatNumber(r.total_liters, 0)} L</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.notes ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openProdEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'prod', id: r.id })}>
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

        {/* ── ABA PAGAMENTOS ── */}
        <TabsContent value="pagamentos" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-sm">Receita do mês</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(qs.monthRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm">Receita acumulada do ano</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(qs.yearRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Droplets className="h-4 w-4" />
                  <p className="text-sm">Preço médio / litro</p>
                </div>
                <p className="text-2xl font-bold">{qs.avgPrice > 0 ? formatCurrency(qs.avgPrice) : '—'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{payments.length} registro(s)</p>
            <Button onClick={openPayNew} className="gap-2">
              <Plus className="h-4 w-4" /> Registrar pagamento
            </Button>
          </div>

          <DataCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês ref.</TableHead>
                  <TableHead>Laticínio</TableHead>
                  <TableHead>Volume (L)</TableHead>
                  <TableHead>Preço/L</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 && <EmptyState colSpan={6} message="Nenhum pagamento registrado" />}
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.reference_month ? monthLabel(p.reference_month.slice(0, 7)) : '—'}</TableCell>
                    <TableCell>{p.buyer_name ?? '—'}</TableCell>
                    <TableCell>{p.total_liters != null ? formatNumber(Number(p.total_liters), 0) + ' L' : '—'}</TableCell>
                    <TableCell>{p.price_per_liter != null ? formatCurrency(Number(p.price_per_liter)) : '—'}</TableCell>
                    <TableCell className="font-medium text-green-700">{p.total_amount != null ? formatCurrency(Number(p.total_amount)) : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openPayEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDelConfirm({ type: 'pay', id: p.id })}>
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

      {/* Dialog: produção */}
      <Dialog open={prodDialog !== null} onOpenChange={o => !o && setProdDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{prodDialog === 'new' ? 'Registrar Produção' : 'Editar Produção'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="prod-date">Data *</Label>
              <Input id="prod-date" type="date" value={prodForm.date}
                onChange={e => setProdForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-liters">Total de litros *</Label>
              <Input id="prod-liters" type="number" min="0" step="1" placeholder="0"
                value={prodForm.total_liters}
                onChange={e => setProdForm(p => ({ ...p, total_liters: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-notes">Observações</Label>
              <Input id="prod-notes" placeholder="Opcional"
                value={prodForm.notes}
                onChange={e => setProdForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProdDialog(null)}>Cancelar</Button>
            <Button onClick={saveProd} disabled={prodLoading}>
              {prodLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: pagamento */}
      <Dialog open={payDialog !== null} onOpenChange={o => !o && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{payDialog === 'new' ? 'Registrar Pagamento' : 'Editar Pagamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pay-month">Mês de referência *</Label>
                <Input id="pay-month" type="month" value={payForm.reference_month}
                  onChange={e => setPayForm(p => ({ ...p, reference_month: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Data do pagamento</Label>
                <Input id="pay-date" type="date" value={payForm.payment_date}
                  onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-buyer">Laticínio</Label>
              <Input id="pay-buyer" placeholder="Ex: Laticínios Bela Vista"
                value={payForm.buyer_name}
                onChange={e => setPayForm(p => ({ ...p, buyer_name: e.target.value }))}
                onBlur={e => setPayForm(p => ({ ...p, buyer_name: toTitleCase(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pay-liters">Volume (litros)</Label>
                <Input id="pay-liters" type="number" min="0" step="1" placeholder="0"
                  value={payForm.total_liters}
                  onChange={e => setPayForm(p => ({ ...p, total_liters: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-price">Preço por litro (R$)</Label>
                <Input id="pay-price" type="text" inputMode="decimal" placeholder="0,00"
                  value={payForm.price_per_liter}
                  onChange={e => setPayForm(p => ({ ...p, price_per_liter: e.target.value }))}
                  onBlur={() => { const n = parseBRL(payForm.price_per_liter); if (n !== null) setPayForm(p => ({ ...p, price_per_liter: formatBRL(n) })) }} />
              </div>
            </div>
            {payTotal > 0 && (
              <p className="text-sm font-medium text-green-700">
                Valor total calculado: {formatCurrency(payTotal)}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Observações</Label>
              <Input id="pay-notes" placeholder="Opcional"
                value={payForm.notes}
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={savePay} disabled={payLoading}>
              {payLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delConfirm}
        onOpenChange={o => !o && setDelConfirm(null)}
        title="Excluir registro"
        description="Tem certeza? Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (!delConfirm) return
          if (delConfirm.type === 'prod') await deleteProd(delConfirm.id)
          else await deletePay(delConfirm.id)
        }}
        loading={deleting}
      />
    </div>
  )
}
