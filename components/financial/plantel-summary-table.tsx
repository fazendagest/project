import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, speciesLabel } from '@/lib/helpers'
import { formatCurrencyShort } from '@/lib/utils'
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
                <TableCell className="text-right">
                  <span title={formatCurrency(r.custo_investido)} className="cursor-help">{formatCurrencyShort(r.custo_investido)}</span>
                </TableCell>
                <TableCell className="text-right">
                  {r.valor_mercado != null
                    ? <span title={formatCurrency(r.valor_mercado)} className="cursor-help">{formatCurrencyShort(r.valor_mercado)}</span>
                    : '—'}
                </TableCell>
                <TableCell className={`text-right font-semibold ${r.lucro_estimado != null ? (r.lucro_estimado >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
                  {r.lucro_estimado != null
                    ? <span title={formatCurrency(r.lucro_estimado)} className="cursor-help">{formatCurrencyShort(r.lucro_estimado)}</span>
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell className="text-right font-bold">{totalQty}</TableCell>
              <TableCell className="text-right font-bold">
                <span title={formatCurrency(totalCusto)} className="cursor-help">{formatCurrencyShort(totalCusto)}</span>
              </TableCell>
              <TableCell className="text-right font-bold">
                {totalMercado != null
                  ? <span title={formatCurrency(totalMercado)} className="cursor-help">{formatCurrencyShort(totalMercado)}</span>
                  : '—'}
              </TableCell>
              <TableCell className={`text-right font-bold ${totalLucro != null ? (totalLucro >= 0 ? 'text-green-700' : 'text-red-700') : ''}`}>
                {totalLucro != null
                  ? <span title={formatCurrency(totalLucro)} className="cursor-help">{formatCurrencyShort(totalLucro)}</span>
                  : '—'}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
