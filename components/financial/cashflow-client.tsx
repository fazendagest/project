'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, last12Months, monthLabel } from '@/lib/helpers'

interface MonthData {
  month: string
  Entradas: number
  Saídas: number
  Saldo: number
}

export function CashflowClient({ farmId }: { farmId: string }) {
  const supabase = createClient()
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const months = last12Months()
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

          const entradas = sales.data?.reduce((s, r) => s + (r.sale_price || 0), 0) ?? 0
          const saidas =
            (purchases.data?.reduce((s, r) => s + (r.purchase_price || 0), 0) ?? 0) +
            (feed.data?.reduce((s, r) => s + (r.total_cost || 0), 0) ?? 0) +
            (ops.data?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0) +
            (health.data?.reduce((s, r) => s + (r.cost || 0), 0) ?? 0)

          return { month: monthLabel(m), Entradas: entradas, Saídas: saidas, Saldo: entradas - saidas }
        })
      )
      setData(results)
      setLoading(false)
    }
    load()
  }, [farmId])

  const totalInflow = data.reduce((s, d) => s + d.Entradas, 0)
  const totalOutflow = data.reduce((s, d) => s + d.Saídas, 0)
  const totalBalance = totalInflow - totalOutflow

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Entradas</p>
            <p className="text-xl sm:text-lg md:text-xl lg:text-2xl font-bold text-green-700 truncate">{formatCurrency(totalInflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Saídas</p>
            <p className="text-xl sm:text-lg md:text-xl lg:text-2xl font-bold text-red-700 truncate">{formatCurrency(totalOutflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Saldo Acumulado</p>
            <p className={`text-xl sm:text-lg md:text-xl lg:text-2xl font-bold truncate ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Fluxo de Caixa — Últimos 12 Meses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Area type="monotone" dataKey="Entradas" stroke="#22c55e" fill="url(#colorEntradas)" />
              <Area type="monotone" dataKey="Saídas" stroke="#ef4444" fill="url(#colorSaidas)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detalhamento Mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right text-green-700">Entradas</TableHead>
                  <TableHead className="text-right text-red-700">Saídas</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.month}</TableCell>
                    <TableCell className="text-right text-green-700">{formatCurrency(d.Entradas)}</TableCell>
                    <TableCell className="text-right text-red-700">{formatCurrency(d.Saídas)}</TableCell>
                    <TableCell className={`text-right font-semibold ${d.Saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(d.Saldo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
