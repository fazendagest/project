'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Animal } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { DataCard } from '@/components/ui/data-card'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import Link from 'next/link'
import { Eye, Pencil, Trash2, LayoutGrid, List, AlertTriangle } from 'lucide-react'
import { calcAge, formatDate, speciesLabel, statusLabel, statusColor, sexLabel } from '@/lib/helpers'
import Image from 'next/image'

const PAGE_SIZE = 20

export function AnimalsClient({ initialAnimals, farmId }: { initialAnimals: Animal[], farmId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [animals, setAnimals] = useState(initialAnimals)
  const [search, setSearch] = useState('')
  const [species, setSpecies] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('table')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = animals.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.code.toLowerCase().includes(q) || (a.name ?? '').toLowerCase().includes(q)
    const matchSpecies = species === 'all' || a.species === species
    const matchStatus = showAll || a.status === 'ativo'
    return matchSearch && matchSpecies && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('animals').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir animal')
    } else {
      setAnimals(prev => prev.filter(a => a.id !== id))
      toast.success('Animal excluído')
      router.refresh()
    }
    setDeleting(null)
    setConfirmId(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar por código ou nome..." />
        <Select value={species} onValueChange={v => { if (v) { setSpecies(v); setPage(1) } }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Espécie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="bovino">Bovino</SelectItem>
            <SelectItem value="equino">Equino</SelectItem>
            <SelectItem value="suino">Suíno</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 rounded-lg border p-1 h-9 self-start">
          <Button
            type="button"
            variant={!showAll ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => { setShowAll(false); setPage(1) }}
          >
            Ativos
          </Button>
          <Button
            type="button"
            variant={showAll ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => { setShowAll(true); setPage(1) }}
          >
            Todos
          </Button>
        </div>
        <div className="flex gap-1">
          <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
          <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{filtered.length} animal(is) encontrado(s)</p>

      {view === 'table' ? (
        <DataCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 && <EmptyState colSpan={8} message="Nenhum animal encontrado" />}
              {paged.map(a => (
                <TableRow key={a.id} className={a.status !== 'ativo' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono font-semibold">{a.code}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {a.name ?? '—'}
                      {a.to_discard && (
                      <span title="Marcado para descarte">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Marcado para descarte" />
                      </span>
                    )}
                    </span>
                  </TableCell>
                  <TableCell>{speciesLabel(a.species)}</TableCell>
                  <TableCell>{a.breed ?? '—'}</TableCell>
                  <TableCell>{sexLabel(a.sex)}</TableCell>
                  <TableCell>{a.birth_date ? calcAge(a.birth_date) : '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Link href={`/app/animals/${a.id}`}>
                        <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/app/animals/${a.id}/edit`}>
                        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmId(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map(a => (
            <Card key={a.id} className={`overflow-hidden hover:shadow-md transition-shadow ${a.status !== 'ativo' ? 'opacity-60' : ''}`}>
              <div className="relative h-40 bg-muted">
                {a.photo_url ? (
                  <Image src={a.photo_url} alt={a.code} fill className="object-cover" />
                ) : (
                  <div className="h-full flex items-center justify-center text-4xl">
                    {a.species === 'bovino' ? '🐄' : a.species === 'equino' ? '🐴' : '🐷'}
                  </div>
                )}
                <Badge className={`absolute top-2 right-2 ${statusColor(a.status)}`}>
                  {statusLabel(a.status)}
                </Badge>
              </div>
              <CardContent className="pt-3 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-primary">{a.code}</p>
                    <p className="font-semibold flex items-center gap-1">
                      {a.name ?? '(sem nome)'}
                      {a.to_discard && (
                      <span title="Marcado para descarte">
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Marcado para descarte" />
                      </span>
                    )}
                    </p>
                    <p className="text-xs text-muted-foreground">{speciesLabel(a.species)} · {a.breed ?? 'S/R'} · {sexLabel(a.sex)}</p>
                    <p className="text-xs text-muted-foreground">{a.birth_date ? calcAge(a.birth_date) : 'Idade desconhecida'}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  <Link href={`/app/animals/${a.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full"><Eye className="h-3 w-3 mr-1" /> Ver</Button>
                  </Link>
                  <Link href={`/app/animals/${a.id}/edit`}>
                    <Button size="sm" variant="outline"><Pencil className="h-3 w-3" /></Button>
                  </Link>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmId(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
        title="Excluir Animal"
        description="Tem certeza? Esta ação não pode ser desfeita e apagará todos os registros vinculados."
        onConfirm={async () => { if (confirmId) await handleDelete(confirmId) }}
        loading={deleting === confirmId}
      />
    </div>
  )
}
