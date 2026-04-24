import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/helpers'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export async function RecentTransactions({ farmId }: { farmId: string }) {
  const supabase = await createClient()

  const [{ data: sales }, { data: purchases }] = await Promise.all([
    supabase
      .from('animal_sales')
      .select('id, sale_price, sale_date, sale_type, animal:animal_id(code, name)')
      .eq('farm_id', farmId)
      .order('sale_date', { ascending: false })
      .limit(5),
    supabase
      .from('animal_purchases')
      .select('id, purchase_price, purchase_date, animal:animal_id(code, name)')
      .eq('farm_id', farmId)
      .order('purchase_date', { ascending: false })
      .limit(5),
  ])

  const all = [
    ...(sales?.map(s => ({
      type: 'sale' as const,
      amount: s.sale_price,
      date: s.sale_date,
      animal: s.animal as any,
      label: s.sale_type === 'abate' ? 'Abate' : 'Venda',
    })) ?? []),
    ...(purchases?.map(p => ({
      type: 'purchase' as const,
      amount: p.purchase_price,
      date: p.purchase_date,
      animal: p.animal as any,
      label: 'Compra',
    })) ?? []),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimas Transações</CardTitle>
      </CardHeader>
      <CardContent>
        {!all.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação registrada</p>
        ) : (
          <div className="space-y-3">
            {all.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${t.type === 'sale' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {t.type === 'sale'
                      ? <ArrowUpRight className="h-4 w-4 text-green-700" />
                      : <ArrowDownLeft className="h-4 w-4 text-red-700" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t.label} · {t.animal?.code ?? '—'}
                      {t.animal?.name ? ` (${t.animal.name})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${t.type === 'sale' ? 'text-green-700' : 'text-red-700'}`}>
                  {t.type === 'sale' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
