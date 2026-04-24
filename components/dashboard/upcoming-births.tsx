import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/helpers'
import { Baby } from 'lucide-react'
import { format, addDays } from 'date-fns'

export async function UpcomingBirths({ farmId }: { farmId: string }) {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const in30 = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('reproduction_records')
    .select('*, female:female_id(code, name, species)')
    .eq('farm_id', farmId)
    .in('status', ['coberta', 'prenha'])
    .gte('expected_birth_date', today)
    .lte('expected_birth_date', in30)
    .order('expected_birth_date')
    .limit(5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Baby className="h-4 w-4 text-pink-500" />
          Partos nos próximos 30 dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum parto previsto</p>
        ) : (
          <ul className="space-y-2">
            {data.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">
                    {(r.female as any)?.code ?? '—'}
                    {(r.female as any)?.name ? ` · ${(r.female as any).name}` : ''}
                  </span>
                  <span className="text-muted-foreground ml-2 capitalize">
                    {(r.female as any)?.species}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDate(r.expected_birth_date)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
