import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

export async function LowStock({ farmId }: { farmId: string }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('feed_stock')
    .select('product_name, current_quantity, min_quantity, unit')
    .eq('farm_id', farmId)

  // Cada linha é uma compra: soma por produto e só avisa quem tem mínimo definido.
  const byProduct = new Map<string, { product_name: string; unit: string; current_quantity: number; min_quantity: number }>()
  for (const s of data ?? []) {
    const key = `${s.product_name.trim().toLowerCase()}|${s.unit}`
    const g = byProduct.get(key) ?? { product_name: s.product_name, unit: s.unit, current_quantity: 0, min_quantity: 0 }
    g.current_quantity += Number(s.current_quantity ?? 0)
    g.min_quantity = Math.max(g.min_quantity, Number(s.min_quantity ?? 0))
    byProduct.set(key, g)
  }
  const low = Array.from(byProduct.values()).filter(s => s.min_quantity > 0 && s.current_quantity <= s.min_quantity)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Estoque Baixo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!low.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Estoque em dia</p>
        ) : (
          <ul className="space-y-2">
            {low.map((s, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{s.product_name}</span>
                <Badge variant="destructive" className="text-xs ml-2 shrink-0">
                  {s.current_quantity} {s.unit}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
