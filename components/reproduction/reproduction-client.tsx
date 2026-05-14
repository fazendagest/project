'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ReproductionRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { BirthDialog } from '@/components/reproduction/birth-dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import { Pencil, Trash2, Baby } from 'lucide-react'
import { formatDate, reproStatusLabel } from '@/lib/helpers'

const PAGE_SIZE = 20

const statusColors: Record<string, string> = {
  coberta: 'bg-yellow-100 text-yellow-800',
  prenha: 'bg-blue-100 text-blue-800',
  parida: 'bg-green-100 text-green-800',
  perdida: 'bg-red-100 text-red-800',
}

type Animal = { id: string; code: string; name?: string; species: string }

export function ReproductionClient({
  initialRecords,
  females,
  males,
  farmId,
}: {
  initialRecords: (ReproductionRecord & { female?: any; male?: any })[]
  females: Animal[]
  males: Animal[]
  farmId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [records, setRecords] = useState(initialRecords)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [birthRecord, setBirthRecord] = useState<(ReproductionRecord & { female?: any }) | null>(null)

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (r.female as any)?.code?.toLowerCase().includes(q) ||
      (r.female as any)?.name?.toLowerCase().includes(q) ||
      r.external_male_name?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('reproduction_records').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else {
      setRecords(prev => prev.filter(r => r.id !== id))
      toast.success('Registro excluído')
      router.refresh()
    }
    setDeleting(null)
    setConfirmId(null)
  }

  function onBirthRegistered(updated: ReproductionRecord) {
    setRecords(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    setBirthRecord(null)
    router.refresh()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar por fêmea..." />
        <Select value={statusFilter} onValueChange={v => { if (v) { setStatusFilter(v); setPage(1) } }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="coberta">Coberta</SelectItem>
            <SelectItem value="prenha">Prenha</SelectItem>
            <SelectItem value="parida">Parida</SelectItem>
            <SelectItem value="perdida">Perdida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{filtered.length} registro(s)</p>

      <DataCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fêmea</TableHead>
              <TableHead>Reprodutor</TableHead>
              <TableHead>Cobertura</TableHead>
              <TableHead>Parto Previsto</TableHead>
              <TableHead>Parto Real</TableHead>
              <TableHead>Filhotes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <EmptyState colSpan={8} />}
            {paged.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/app/animals/${r.female_id}`} className="font-mono font-semibold text-primary hover:underline">
                    {(r.female as any)?.code ?? '—'}
                  </Link>
                  <p className="text-xs text-muted-foreground">{(r.female as any)?.name ?? ''}</p>
                </TableCell>
                <TableCell>
                  {(r.male as any)?.code
                    ? <span className="font-mono">{(r.male as any).code}{(r.male as any).name ? ` · ${(r.male as any).name}` : ''}</span>
                    : r.external_male_name
                      ? <span className="text-sm">{r.external_male_name}</span>
                      : <span className="text-muted-foreground text-sm">Inseminação</span>
                  }
                </TableCell>
                <TableCell>{formatDate(r.coverage_date)}</TableCell>
                <TableCell>{formatDate(r.expected_birth_date)}</TableCell>
                <TableCell>{formatDate(r.actual_birth_date)}</TableCell>
                <TableCell>{r.offspring_count || '—'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[r.status]}>{reproStatusLabel(r.status)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {(r.status === 'coberta' || r.status === 'prenha') && (
                      <Button size="icon" variant="ghost" title="Registrar parto" onClick={() => setBirthRecord(r)}>
                        <Baby className="h-4 w-4 text-pink-500" />
                      </Button>
                    )}
                    <Link href={`/app/reproduction/${r.id}/edit`}>
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
      </DataCard>

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
        description="Tem certeza que deseja excluir este registro reprodutivo?"
        onConfirm={async () => { if (confirmId) await handleDelete(confirmId) }}
        loading={deleting === confirmId}
      />

      {birthRecord && (
        <BirthDialog
          record={birthRecord}
          farmId={farmId}
          onSuccess={onBirthRegistered}
          onClose={() => setBirthRecord(null)}
        />
      )}
    </div>
  )
}
