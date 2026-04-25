'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { last12Months, monthLabel, formatCurrency } from '@/lib/helpers'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartData {
  month: string
  Receita: number
  Despesas: number
  Lucro: number
}

export function DashboardCharts({ farmId }: { farmId: string }) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const months = last12Months().slice(-6)

      const results = await Promise.all(
        months.map(async (m) => {
          const [year, month] = m.split('-')
          const start = `${m}-01`
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
          const end = `${m}-${lastDay}`

          const [sales, purchases, feed, ops, health] = await Promise.all([
            supabase.from('animal_sales').select('sale_price').eq('farm_id', farmId).gte('sale_date', start).lte('sale_date', end),
            supabase.from('animal_purchases').select('purchase_price').eq('farm_id', farmId).gte('purchase_date', start).lte('purchase_date', end),
            supabase.from('feed_stock').select('total_cost').eq('farm_id', farmId).gte('purchase_date', start).lte('purchase_date', end),
            supabase.from('operational_expenses').select('amount').eq('farm_id', farmId).gte('date', start).lte('date', end),
            supabase.from('health_records').select('cost').eq('farm_id', farmId).gte('application_date', start).lte('application_date', end),
          ])

          const receita = sales.data?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
          const despesas =
            (purchases.data?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0) +
            (feed.data?.reduce((s, r) => s + (r.total_cost || 0), 0) ?? 0) +
            (ops.data?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0) +
            (health.data?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0)

          return {
            month: monthLabel(m),
            Receita: receita,
            Despesas: despesas,
            Lucro: receita - despesas,
          }
        })
      )

      setData(results)
      setLoading(false)
    }
    load()
  }, [farmId])

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Receita x Despesa x Lucro</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita x Despesa x Lucro (últimos 6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Legend />
            <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
