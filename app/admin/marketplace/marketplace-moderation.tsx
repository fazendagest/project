'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Listing = {
  id: string
  category: string
  title: string
  city: string | null
  state: string | null
  seller_name: string | null
  seller_phone: string | null
  price: number | null
  price_type: string
  created_at: string
  status: string
}

type Event = {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string | null
  city: string | null
  state: string | null
  organizer_name: string | null
  created_at: string
  status: string
}

type Tab = 'listings' | 'events'

async function moderateItem(type: 'listing' | 'event', id: string, action: 'published' | 'rejected') {
  const endpoint = type === 'listing' ? '/api/admin/moderate-listing' : '/api/admin/moderate-event'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status: action }),
  })
  return res.ok
}

export function MarketplaceModeration({
  listings: initialListings,
  events: initialEvents,
}: {
  listings: Listing[]
  events: Event[]
}) {
  const [tab, setTab] = useState<Tab>('listings')
  const [listings, setListings] = useState(initialListings)
  const [events, setEvents] = useState(initialEvents)
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleListing(id: string, action: 'published' | 'rejected') {
    setProcessing(id)
    const ok = await moderateItem('listing', id, action)
    if (ok) {
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: action } : l))
      toast.success(action === 'published' ? 'Anúncio aprovado' : 'Anúncio rejeitado')
    } else {
      toast.error('Erro ao moderar anúncio')
    }
    setProcessing(null)
  }

  async function handleEvent(id: string, action: 'published' | 'rejected') {
    setProcessing(id)
    const ok = await moderateItem('event', id, action)
    if (ok) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: action } : e))
      toast.success(action === 'published' ? 'Evento aprovado' : 'Evento rejeitado')
    } else {
      toast.error('Erro ao moderar evento')
    }
    setProcessing(null)
  }

  const pendingListings = listings.filter(l => l.status === 'pending')
  const pendingEvents = events.filter(e => e.status === 'pending')

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('listings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'listings' ? 'border-[#166534] text-[#166534]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Anúncios
          {pendingListings.length > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {pendingListings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('events')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'events' ? 'border-[#166534] text-[#166534]' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Eventos
          {pendingEvents.length > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
              {pendingEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* Listings */}
      {tab === 'listings' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Título</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Categoria</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Anunciante</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Cidade</th>
                <th className="text-center font-semibold px-4 py-3 text-gray-600">Status</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {listings.map(listing => (
                <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[240px]">
                    <p className="truncate">{listing.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full capitalize">
                      {listing.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div>{listing.seller_name ?? '—'}</div>
                    {listing.seller_phone && <div className="text-gray-400">{listing.seller_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {[listing.city, listing.state].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={listing.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(listing.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {listing.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          disabled={processing === listing.id}
                          onClick={() => handleListing(listing.id, 'published')}
                        >
                          <Check className="h-3 w-3" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={processing === listing.id}
                          onClick={() => handleListing(listing.id, 'rejected')}
                        >
                          <X className="h-3 w-3" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Nenhum anúncio ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Título</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Tipo</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Datas</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Cidade</th>
                <th className="text-left font-semibold px-4 py-3 text-gray-600">Organizador</th>
                <th className="text-center font-semibold px-4 py-3 text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[220px]">
                    <p className="truncate">{event.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      {event.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {format(new Date(event.start_date + 'T00:00:00'), 'dd/MM/yyyy')}
                    {event.end_date && event.end_date !== event.start_date && (
                      <> – {format(new Date(event.end_date + 'T00:00:00'), 'dd/MM/yyyy')}</>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {[event.city, event.state].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{event.organizer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3">
                    {event.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          disabled={processing === event.id}
                          onClick={() => handleEvent(event.id, 'published')}
                        >
                          <Check className="h-3 w-3" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={processing === event.id}
                          onClick={() => handleEvent(event.id, 'rejected')}
                        >
                          <X className="h-3 w-3" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Nenhum evento ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    pending: 'Pendente',
    published: 'Publicado',
    rejected: 'Rejeitado',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  )
}
