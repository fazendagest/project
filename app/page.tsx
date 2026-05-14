import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, MapPin, Tag, ChevronRight, MessageCircle } from 'lucide-react'

const CATEGORIES = [
  { key: '', label: 'Todos' },
  { key: 'animais', label: 'Animais' },
  { key: 'terras', label: 'Terras' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'maquinas', label: 'Máquinas' },
  { key: 'veterinarios', label: 'Veterinários' },
  { key: 'arrendamento', label: 'Arrendamento' },
  { key: 'eventos', label: 'Eventos' },
]

function formatPrice(price: number | null, priceType: string) {
  if (priceType === 'consult' || !price) return 'A consultar'
  const formatted = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (priceType === 'per_head') return `${formatted}/cab.`
  return formatted
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string }
}) {
  const supabase = await createClient()
  const q = searchParams.q ?? ''
  const categoria = searchParams.categoria ?? ''

  let listingsQuery = supabase
    .from('listings')
    .select('id, category, title, seller_name, city, state, price, price_type, photo_url, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(24)

  if (categoria && categoria !== 'eventos') listingsQuery = listingsQuery.eq('category', categoria)
  if (q) listingsQuery = listingsQuery.ilike('title', `%${q}%`)

  const { data: listings } = await listingsQuery

  const { data: events } = await supabase
    .from('events')
    .select('id, title, type, start_date, city, state')
    .eq('status', 'published')
    .gte('start_date', new Date().toISOString().slice(0, 10))
    .order('start_date', { ascending: true })
    .limit(6)

  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#166534] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white/15 rounded-xl p-1.5">
              <CowIcon className="h-6 w-6" />
            </div>
            <span className="font-bold text-lg hidden sm:block">FazendaGest</span>
          </Link>

          <form method="GET" action="/" className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar animais, terras, eventos..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/anunciar"
              className="text-sm font-semibold bg-white text-[#166534] px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
            >
              Anunciar grátis
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Category filters */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.key}
                href={cat.key ? `/?categoria=${cat.key}` : '/'}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoria === cat.key
                    ? 'bg-[#166534] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Events section */}
        {events && events.length > 0 && (!categoria || categoria === 'eventos') && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Próximos Eventos</h2>
              <Link href="/?categoria=eventos" className="text-sm text-[#166534] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => (
                <Link key={event.id} href={`/eventos/${event.id}`}>
                  <div className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden flex">
                    <div className="bg-[#166534] text-white p-4 flex flex-col items-center justify-center min-w-[72px]">
                      <span className="text-xs font-semibold uppercase opacity-80">
                        {format(new Date(event.start_date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                      </span>
                      <span className="text-2xl font-bold leading-tight">
                        {format(new Date(event.start_date + 'T00:00:00'), 'dd')}
                      </span>
                    </div>
                    <div className="p-3 flex-1 min-w-0">
                      <span className="text-xs font-semibold uppercase text-[#166534] bg-green-50 px-2 py-0.5 rounded-full">
                        {event.type}
                      </span>
                      <p className="font-semibold text-gray-900 mt-1.5 text-sm leading-tight line-clamp-2">{event.title}</p>
                      {(event.city || event.state) && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {[event.city, event.state].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Listings grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {q
                ? `Resultados para "${q}"`
                : categoria
                ? CATEGORIES.find(c => c.key === categoria)?.label ?? 'Anúncios'
                : 'Anúncios recentes'}
            </h2>
            <span className="text-sm text-gray-500">{listings?.length ?? 0} anúncios</span>
          </div>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map(listing => (
                <Link key={listing.id} href={`/anuncio/${listing.id}`}>
                  <div className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
                    <div className="aspect-[4/3] bg-gray-100 relative">
                      {listing.photo_url ? (
                        <img src={listing.photo_url} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CowIcon className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-xs font-semibold bg-white/90 text-gray-700 px-2 py-0.5 rounded-full capitalize">
                        {listing.category}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">{listing.title}</p>
                      <div className="mt-2 space-y-1">
                        {listing.seller_name && (
                          <p className="text-xs text-gray-500 truncate">{listing.seller_name}</p>
                        )}
                        {(listing.city || listing.state) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[listing.city, listing.state].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        <p className="text-base font-bold text-[#166534] mt-1">
                          {formatPrice(listing.price, listing.price_type)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum anúncio encontrado</p>
              <p className="text-sm mt-1">Seja o primeiro a anunciar!</p>
              <Link
                href="/anunciar"
                className="inline-block mt-4 bg-[#166534] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800"
              >
                Criar anúncio
              </Link>
            </div>
          )}
        </section>

        {/* Conversion banner */}
        <section className="bg-[#166534] rounded-2xl text-white p-8 text-center">
          <h2 className="text-2xl font-bold">Gerencie sua fazenda de graça</h2>
          <p className="mt-2 text-white/80 text-sm">90 dias de acesso completo — sem cartão de crédito</p>
          <Link
            href="/register"
            className="inline-block mt-6 bg-white text-[#166534] font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            Experimentar grátis
          </Link>
        </section>
      </main>

      <footer className="border-t bg-white mt-10 py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <CowIcon className="h-5 w-5 text-[#166534]" />
            <span className="font-semibold text-gray-700">FazendaGest</span>
            <span>· Marketplace Rural</span>
          </div>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Suporte WhatsApp
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
