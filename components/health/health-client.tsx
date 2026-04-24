'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HealthRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import Link from 'next/link'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { formatDate, formatCurrency, healthTypeLabel } from '@/lib/helpers'
import { isAfter, parseISO, addDays } from 'date-fns'

const PAGE_SIZE = 20

export function HealthClient({
  initialRecords,
  animals,
  farmId,
}: {
  initialRecords: (HealthRecord & { animal?: any })[]
  animals: { id: string; code: string; name?: string; species: string }[]
  farmId: string
}) {
  const supabase = createClient()
  const [records, setRecords] = useState(initialRecords)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.product_name.toLowerCase().includes(q) ||
      (r.animal as any)?.code?.toLowerCase().includes(q) ||
      (r.animal as any)?.name?.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || r.type === typeFilter
    return matchSearch && matchType
  })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  function isDueSoon(date?: string): boolean {
    if (!date) return false
    const d = parseISO(date)
    return isAfter(d, new Date()) && isAfter(addDays(new Date(), 30), d)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('health_records').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      setRecords(prev => prev.filter(r => r.id !== id))
      toast.success('Registro excluído')
    }
    setDeleting(null)
    setConfirmId(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar por produto ou animal..." />
        <Select value={typeFilter} onValueChange={v => { if (v) { setTypeFilter(v); setPage(1) } }}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="vacina">Vacina</SelectItem>
            <SelectItem value="vermifugacao">Vermifugação</SelectItem>
            <SelectItem value="medicamento">Medicamento</SelectItem>
            <SelectItem value="consulta">Consulta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{filtered.length} registro(s)</p>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Animal</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Dose</TableHead>
              <TableHead>Aplicação</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
            {paged.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <Link href={`/animals/${r.animal_id}`} className="font-mono font-semibold text-primary hover:underline">
                      {(r.animal as any)?.code ?? '—'}
                    </Link>
                    <p className="text-xs text-muted-foreground">{(r.animal as any)?.name ?? ''}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{healthTypeLabel(r.type)}</Badge></TableCell>
                <TableCell className="font-medium">{r.product_name}</TableCell>
                <TableCell>{r.dose ?? '—'}</TableCell>
                <TableCell>{formatDate(r.application_date)}</TableCell>
                <TableCell>
                  {r.next_due_date ? (
                    <span className={isDueSoon(r.next_due_date) ? 'text-amber-600 font-medium flex items-center gap-1' : ''}>
                      {isDueSoon(r.next_due_date) && <AlertTriangle className="h-3 w-3" />}
                      {formatDate(r.next_due_date)}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>{formatCurrency(r.cost)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Link href={`/health/${r.id}/edit`}>
                      <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmId(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="flex items-center text-sm px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={o => !o && setConfirmId(null)}
        title="Excluir Registro"
        description="Tem certeza que deseja excluir este registro de saúde?"
        onConfirm={async () => { if (confirmId) await handleDelete(confirmId) }}
        loading={deleting === confirmId}
      />
    </div>
  )
}
