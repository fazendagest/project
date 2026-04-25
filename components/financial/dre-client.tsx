'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, last12Months, monthLabel } from '@/lib/helpers'

interface DRERow {
  label: string
  value: number
  isTotal?: boolean
  isProfit?: boolean
  isPercentage?: boolean
}

export function DREClient({ farmId }: { farmId: string }) {
  const supabase = createClient()
  const months = last12Months()
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1])
  const [data, setData] = useState<DRERow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [year, month] = selectedMonth.split('-')
      const start = `${selectedMonth}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const end = `${selectedMonth}-${lastDay}`

      // First pass: sales + all period costs in parallel
      const [salesRes, feedStockRes, opExpRes, healthRes] = await Promise.all([
        supabase.from('animal_sales').select('sale_price, animal_id').eq('farm_id', farmId).gte('sale_date', start).lte('sale_date', end),
        supabase.from('feed_stock').select('total_cost').eq('farm_id', farmId).gte('purchase_date', start).lte('purchase_date', end),
        supabase.from('operational_expenses').select('amount').eq('farm_id', farmId).gte('date', start).lte('date', end),
        supabase.from('health_records').select('cost, animal_id').eq('farm_id', farmId).gte('application_date', start).lte('application_date', end),
      ])

      const revenue = salesRes.data?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
      const soldAnimalIds = [...new Set(salesRes.data?.map(r => r.animal_id).filter(Boolean) ?? [])] as string[]
      const allHealthRecords = healthRes.data ?? []

      // Second pass: CMV components only for sold animals
      let cmvPurchase = 0
      let cmvFeed = 0
      let cmvHealth = 0

      if (soldAnimalIds.length > 0) {
        const [purchasesRes, feedRecordsRes] = await Promise.all([
          // Purchase price: all-time (animal may have been bought in a prior period)
          supabase.from('animal_purchases').select('purchase_price').eq('farm_id', farmId).in('animal_id', soldAnimalIds),
          // Feed: period-scoped for sold animals
          supabase.from('feed_records').select('cost_total').eq('farm_id', farmId).in('animal_id', soldAnimalIds).gte('date', start).lte('date', end),
        ])
        cmvPurchase = purchasesRes.data?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0
        cmvFeed = feedRecordsRes.data?.reduce((s, r) => s + (r.cost_total || 0), 0) ?? 0
        // Health for sold animals comes from already-fetched records (no extra query)
        cmvHealth = allHealthRecords.filter(r => soldAnimalIds.includes(r.animal_id)).reduce((s, r) => s + (r.cost || 0), 0)
      }

      const cmv = cmvPurchase + cmvFeed + cmvHealth
      const grossProfit = revenue - cmv
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      // OpEx: feed stock + health for non-sold animals + operational
      const feedStockCost = feedStockRes.data?.reduce((s, r) => s + (r.total_cost || 0), 0) ?? 0
      const opExpenses = opExpRes.data?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0
      const generalHealthCost = allHealthRecords.filter(r => !soldAnimalIds.includes(r.animal_id)).reduce((s, r) => s + (r.cost || 0), 0)
      const totalOpEx = feedStockCost + generalHealthCost + opExpenses
      const netProfit = grossProfit - totalOpEx
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

      setData([
        { label: 'Receita Bruta (Vendas)', value: revenue, isTotal: true },
        { label: 'CMV — Custo dos Animais Vendidos', value: -cmv },
        { label: '  · Custo de Compra', value: -cmvPurchase },
        { label: '  · Custo de Ração (animais vendidos)', value: -cmvFeed },
        { label: '  · Custo de Saúde (animais vendidos)', value: -cmvHealth },
        { label: 'Lucro Bruto', value: grossProfit, isProfit: true },
        { label: 'Margem Bruta', value: grossMargin, isPercentage: true },
        { label: 'Despesas Operacionais', value: -totalOpEx },
        { label: '  · Compras de Ração', value: -feedStockCost },
        { label: '  · Saúde', value: -generalHealthCost },
        { label: '  · Outras Despesas', value: -opExpenses },
        { label: 'Lucro Líquido', value: netProfit, isProfit: true, isTotal: true },
        { label: 'Margem Líquida', value: netMargin, isPercentage: true },
      ])
      setLoading(false)
    }
    load()
  }, [selectedMonth, farmId])

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Select value={selectedMonth} onValueChange={v => v && setSelectedMonth(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DRE — {monthLabel(selectedMonth)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {data?.map((row, i) => (
                <div
                  key={i}
                  className={`flex justify-between py-2 px-3 rounded ${
                    row.isTotal ? 'bg-muted font-semibold text-base' :
                    row.isProfit ? 'font-semibold' : 'text-sm'
                  }`}
                >
                  <span className="text-muted-foreground min-w-0 mr-2">{row.label}</span>
                  <span className={`shrink-0 ${
                    row.isPercentage ? 'text-primary' :
                    row.value >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {row.isPercentage
                      ? `${row.value.toFixed(1)}%`
                      : row.isProfit
                        ? (row.value < 0 ? `-${formatCurrency(Math.abs(row.value))}` : formatCurrency(row.value))
                        : formatCurrency(Math.abs(row.value))
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
