import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
import { CategoryPlaceholder } from '@/components/marketplace/category-placeholder'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Calendar, MessageCircle, ChevronLeft, User } from 'lucide-react'

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

function formatDateRange(start: string, end: string | null) {
  const s = new Date(start + 'T00:00:00')
  if (!end || end === start) return format(s, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const e = new Date(end + 'T00:00:00')
  return `${format(s, "d 'de' MMMM", { locale: ptBR })} a ${format(e, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'published')
    .single()

  if (!event) notFound()

  const { data: nearbyListings } = await supabase
    .from('listings')
    .select('id, category, title, seller_name, city, price, price_type, photo_url')
    .eq('status', 'published')
    .eq('state', event.state ?? '')
    .limit(4)

  const youtubeId = event.youtube_url ? getYouTubeId(event.youtube_url) : null
  const whatsappLink = event.organizer_phone
    ? `https://wa.me/${event.organizer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi o evento "${event.title}" no FazendaGest e gostaria de informações.`)}`
    : null

  const day = format(new Date(event.start_date + 'T00:00:00'), 'dd')
  const month = format(new Date(event.start_date + 'T00:00:00'), 'MMM', { locale: ptBR }).toUpperCase()

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
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            {/* Banner */}
            {event.photo_url ? (
              <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#EAE4D0]">
                <img src={event.photo_url} alt={event.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#EAE4D0] relative" style={{ background: '#E6EFD9' }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Calendar className="h-24 w-24 text-[#0F4A2D]" />
                </div>
                <div className="absolute top-4 left-4 bg-white rounded-lg overflow-hidden border border-[#EAE4D0] shadow" style={{ width: 64, height: 70 }}>
                  <div className="bg-[#0F4A2D] text-white text-center text-[10px] font-bold uppercase tracking-widest py-1">{month}</div>
                  <div className="flex items-center justify-center h-11 text-[#0F4A2D] font-bold text-2xl font-serif">{day}</div>
                </div>
                <span className="absolute top-4 right-4 bg-white text-[#0F4A2D] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#EAE4D0] shadow">
                  {event.type}
                </span>
              </div>
            )}

            {/* Title block */}
            <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
              <span className="text-xs font-semibold bg-[#E6EFD9] text-[#0F4A2D] border border-[#EAE4D0] px-2.5 py-0.5 rounded-full">
                {event.type}
              </span>
              <h1 className="text-2xl font-semibold text-gray-900 mt-3 font-serif leading-tight">{event.title}</h1>
              <div className="flex flex-col gap-2 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0F4A2D]" />
                  {formatDateRange(event.start_date, event.end_date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#0F4A2D]" />
                    {event.location}
                  </span>
                )}
                {(event.city || event.state) && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {[event.city, event.state].filter(Boolean).join(' · ')}
                  </span>
                )}
                {event.organizer_name && (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#0F4A2D]" />
                    {event.organizer_name}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
                <h2 className="font-semibold text-gray-900 mb-3 font-serif">Sobre o evento</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Schedule */}
            {event.schedule && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
                <h2 className="font-semibold text-gray-900 mb-3 font-serif">Programação</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{event.schedule}</p>
              </div>
            )}

            {/* YouTube */}
            {youtubeId && (
              <div className="bg-white rounded-xl border border-[#EAE4D0] p-5">
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

          {/* Contact sidebar */}
          <div>
            <div className="bg-white rounded-xl border border-[#EAE4D0] p-5 space-y-4 sticky top-20">
              {/* Date display */}
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-xl overflow-hidden border border-[#EAE4D0] shadow-sm" style={{ width: 52, height: 58 }}>
                  <div className="bg-[#0F4A2D] text-white text-center text-[9px] font-bold uppercase tracking-widest py-1">{month}</div>
                  <div className="flex items-center justify-center h-9 text-[#0F4A2D] font-bold text-xl font-serif">{day}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Data do evento</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateRange(event.start_date, event.end_date)}</p>
                </div>
              </div>

              {event.organizer_name && (
                <div className="pt-3 border-t border-[#EAE4D0] text-sm">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Organizador</p>
                  <p className="font-medium text-gray-900">{event.organizer_name}</p>
                </div>
              )}

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle className="h-5 w-5" />
                  Falar com organizador
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Nearby listings */}
        {nearbyListings && nearbyListings.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 font-serif">Anúncios da região</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyListings.map(item => (
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
                      <p className="text-xs text-gray-500 capitalize mb-1">{item.category}</p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</p>
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
