'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, last12Months, monthLabel } from '@/lib/helpers'
import { format, getYear } from 'date-fns'

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

      const [sales, purchases, feed, opExp, health] = await Promise.all([
        supabase.from('animal_sales').select('sale_price, animal_id').eq('farm_id', farmId).gte('sale_date', start).lte('sale_date', end),
        supabase.from('animal_purchases').select('purchase_price, animal_id').eq('farm_id', farmId).gte('purchase_date', start).lte('purchase_date', end),
        supabase.from('feed_records').select('cost_total').eq('farm_id', farmId).gte('date', start).lte('date', end),
        supabase.from('operational_expenses').select('amount').eq('farm_id', farmId).gte('date', start).lte('date', end),
        supabase.from('health_records').select('cost').eq('farm_id', farmId).gte('application_date', start).lte('application_date', end),
      ])

      const revenue = sales.data?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
      const cmvPurchase = purchases.data?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0
      const cmvFeed = feed.data?.reduce((s, r) => s + (r.cost_total || 0), 0) ?? 0
      const cmvHealth = health.data?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0
      const cmv = cmvPurchase + cmvFeed + cmvHealth
      const grossProfit = revenue - cmv
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      const opExpenses = opExp.data?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0
      const netProfit = grossProfit - opExpenses
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

      setData([
        { label: 'Receita Bruta (Vendas)', value: revenue, isTotal: true },
        { label: 'CMV — Custo dos Animais Vendidos', value: -cmv },
        { label: '  · Custo de Compra', value: -cmvPurchase },
        { label: '  · Custo de Ração', value: -cmvFeed },
        { label: '  · Custo de Saúde', value: -cmvHealth },
        { label: 'Lucro Bruto', value: grossProfit, isProfit: true },
        { label: 'Margem Bruta', value: grossMargin, isPercentage: true },
        { label: 'Despesas Operacionais', value: -opExpenses },
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
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8" />)}
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
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={
                    row.isPercentage ? 'text-primary' :
                    row.value >= 0 ? 'text-green-700' : 'text-red-700'
                  }>
                    {row.isPercentage
                      ? `${row.value.toFixed(1)}%`
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
