import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, speciesLabel } from '@/lib/helpers'
import type { PlantelRow } from '@/lib/plantel-utils'

export function PlantelSummaryTable({ rows, title = 'Valor do Plantel' }: { rows: PlantelRow[]; title?: string }) {
  if (rows.length === 0) return null

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const totalCusto = rows.reduce((s, r) => s + r.custo_investido, 0)
  const totalMercado = rows.some(r => r.valor_mercado != null)
    ? rows.reduce((s, r) => s + (r.valor_mercado ?? 0), 0)
    : null
  const totalLucro = totalMercado != null ? totalMercado - totalCusto : null

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Espécie</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Custo Investido</TableHead>
              <TableHead className="text-right">Valor de Mercado</TableHead>
              <TableHead className="text-right">Lucro Estimado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.species}>
                <TableCell className="font-medium">{speciesLabel(r.species)}</TableCell>
                <TableCell className="text-right">{r.qty}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.custo_investido)}</TableCell>
                <TableCell className="text-right">
                  {r.valor_mercado != null ? formatCurrency(r.valor_mercado) : '—'}
                </TableCell>
                <TableCell className={`text-right font-semibold ${r.lucro_estimado != null ? (r.lucro_estimado >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
                  {r.lucro_estimado != null ? formatCurrency(r.lucro_estimado) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="text-right font-bold">{totalQty}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(totalCusto)}</TableCell>
              <TableCell className="text-right font-bold">
                {totalMercado != null ? formatCurrency(totalMercado) : '—'}
              </TableCell>
              <TableCell className={`text-right font-bold ${totalLucro != null ? (totalLucro >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
                {totalLucro != null ? formatCurrency(totalLucro) : '—'}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
