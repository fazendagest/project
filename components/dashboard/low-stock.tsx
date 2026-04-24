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

  const low = data?.filter(s => s.current_quantity <= s.min_quantity) ?? []

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
