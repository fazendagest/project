import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
import { CategoryPlaceholder } from '@/components/marketplace/category-placeholder'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, ChevronLeft, MessageCircle } from 'lucide-react'
import { CopyPhone } from '@/components/marketplace/copy-phone'

const CAT_LABEL: Record<string, string> = {
  animais: 'Animal', terras: 'Terra', servicos: 'Serviço',
  maquinas: 'Máquina', veterinarios: 'Veterinário', arrendamento: 'Arrendamento',
}

const CAT_BADGE: Record<string, string> = {
  animais:      'bg-[#FBEDD8] text-[#7A4A12] border-[#F0DBB4]',
  terras:       'bg-[#E6EFD9] text-[#0F4A2D] border-[#EAE4D0]',
  servicos:     'bg-[#EFE4F0] text-[#5A3262] border-[#DECCDF]',
  maquinas:     'bg-[#E2E8EF] text-[#2C4663] border-[#C8D2DE]',
  veterinarios: 'bg-[#FAE0E0] text-[#7A2A2A] border-[#EFCACA]',
  arrendamento: 'bg-[#F1E8D4] text-[#5C4419] border-[#E2D5B5]',
}

function formatPrice(price: number | null, priceType: string) {
  if (priceType === 'consult' || !price) return 'A consultar'
  const formatted = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (priceType === 'per_head') return `${formatted}/cab.`
  if (priceType === 'lot') return `${formatted} (lote)`
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
    <div className="min-h-screen" style={{ background: '#F8F5EB' }}>
      <header className="bg-[#0F4A2D] text-white border-b border-[#0C3B24]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-white/15 rounded-xl p-1.5 border border-white/20">
              <CowIcon className="h-5 w-5" />
            </div>
            <div className="leading-none hidden sm:block">
              <div className="font-bold text-base font-serif">FazendaGest</div>
              <div className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5">Marketplace · Goiás</div>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#0F4A2D] font-medium hover:underline mb-6">
          <ChevronLeft className="h-4 w-4" /> Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo */}
            <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#EAE4D0] relative">
              {listing.photo_url ? (
                <img src={listing.photo_url} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <CategoryPlaceholder category={listing.category} uid={listing.id} />
              )}
              <span className={`absolute top-3 left-3 text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border ${CAT_BADGE[listing.category] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {CAT_LABEL[listing.category] ?? listing.category}
              </span>
            </div>

            {/* Title block */}
            <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
              <h1 className="text-2xl font-semibold text-gray-900 font-serif leading-tight">{listing.title}</h1>
              <p className="text-3xl font-semibold text-[#0F4A2D] mt-2 font-serif">
                {formatPrice(listing.price, listing.price_type)}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {(listing.city || listing.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[listing.city, listing.state].filter(Boolean).join(' · ')}
                  </span>
                )}
                <span>
                  Publicado em {format(new Date(listing.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Info */}
            {(listing.seller_name || listing.quantity > 1) && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5 space-y-3">
                <h2 className="font-semibold text-gray-900 font-serif">Informações</h2>
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
                </dl>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
                <h2 className="font-semibold text-gray-900 mb-3 font-serif">Descrição</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* YouTube */}
            {youtubeId && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
                <h2 className="font-semibold text-gray-900 mb-3 font-serif">Vídeo</h2>
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
          <div>
            <div className="bg-white rounded-xl border border-[#EAE4D0] p-5 space-y-4 sticky top-20">
              <div className="text-2xl font-semibold text-[#0F4A2D] font-serif">
                {formatPrice(listing.price, listing.price_type)}
              </div>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle className="h-5 w-5" />
                  Chamar no WhatsApp
                </a>
              )}

              {listing.seller_phone && (
                <CopyPhone phone={listing.seller_phone} />
              )}

              {listing.seller_name && (
                <div className="pt-3 border-t border-[#EAE4D0] text-sm text-gray-600">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Anunciante</p>
                  <p className="font-medium text-gray-900">{listing.seller_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related listings */}
        {related && related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 font-serif">Outros anúncios da região</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(item => (
                <Link key={item.id} href={`/anuncio/${item.id}`}>
                  <div className="bg-white rounded-xl border border-[#EAE4D0] hover:shadow-md transition-shadow overflow-hidden">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryPlaceholder category={item.category} uid={item.id} />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-sm font-semibold text-[#0F4A2D] mt-1 font-serif">
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
