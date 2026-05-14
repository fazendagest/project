import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Phone, Copy, MessageCircle, ChevronLeft } from 'lucide-react'
import { CopyPhone } from '@/components/marketplace/copy-phone'

const PRICE_TYPE_LABEL: Record<string, string> = {
  fixed: 'Preço fixo',
  per_head: 'Por cabeça',
  lot: 'Valor do lote',
  consult: 'A consultar',
}

function formatPrice(price: number | null, priceType: string) {
  if (priceType === 'consult' || !price) return 'A consultar'
  const formatted = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (priceType === 'per_head') return `${formatted}/cab.`
  return formatted
}

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'published')
    .single()

  if (!listing) notFound()

  const { data: related } = await supabase
    .from('listings')
    .select('id, category, title, seller_name, city, state, price, price_type, photo_url')
    .eq('status', 'published')
    .eq('state', listing.state ?? '')
    .neq('id', listing.id)
    .limit(4)

  const youtubeId = listing.youtube_url ? getYouTubeId(listing.youtube_url) : null
  const whatsappLink = listing.seller_phone
    ? `https://wa.me/${listing.seller_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi seu anúncio "${listing.title}" no FazendaGest e tenho interesse.`)}`
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#166534] text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-white/15 rounded-xl p-1.5">
              <CowIcon className="h-5 w-5" />
            </div>
            <span className="font-bold hidden sm:block">FazendaGest</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft className="h-4 w-4" /> Voltar ao marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Photo */}
            <div className="aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden">
              {listing.photo_url ? (
                <img src={listing.photo_url} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <CowIcon className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl border p-5">
              <span className="text-xs font-semibold uppercase text-[#166534] bg-green-50 px-2 py-0.5 rounded-full capitalize">
                {listing.category}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-3">{listing.title}</h1>
              <p className="text-3xl font-bold text-[#166534] mt-2">
                {formatPrice(listing.price, listing.price_type)}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                {(listing.city || listing.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[listing.city, listing.state].filter(Boolean).join(' · ')}
                  </span>
                )}
                <span>
                  Publicado em {format(new Date(listing.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Informações</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {listing.seller_name && (
                  <>
                    <dt className="text-gray-500">Anunciante</dt>
                    <dd className="font-medium text-gray-900">{listing.seller_name}</dd>
                  </>
                )}
                {listing.quantity && listing.quantity > 1 && (
                  <>
                    <dt className="text-gray-500">Quantidade</dt>
                    <dd className="font-medium text-gray-900">{listing.quantity} unidades</dd>
                  </>
                )}
                <dt className="text-gray-500">Tipo de preço</dt>
                <dd className="font-medium text-gray-900">{PRICE_TYPE_LABEL[listing.price_type] ?? listing.price_type}</dd>
              </dl>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Descrição</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* YouTube */}
            {youtubeId && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Vídeo</h2>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar contact */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5 space-y-4 sticky top-24">
              <h2 className="font-semibold text-gray-900">Contato</h2>
              {listing.seller_name && (
                <p className="text-sm text-gray-600">{listing.seller_name}</p>
              )}

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Chamar no WhatsApp
                </a>
              )}

              {listing.seller_phone && (
                <CopyPhone phone={listing.seller_phone} />
              )}
            </div>
          </div>
        </div>

        {/* Related listings */}
        {related && related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Outros anúncios da região</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(item => (
                <Link key={item.id} href={`/anuncio/${item.id}`}>
                  <div className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden">
                    <div className="aspect-[4/3] bg-gray-100">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CowIcon className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-sm font-bold text-[#166534] mt-1">
                        {formatPrice(item.price, item.price_type)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
