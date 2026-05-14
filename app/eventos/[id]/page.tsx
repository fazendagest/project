import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
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
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Banner */}
            {event.photo_url && (
              <div className="aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden">
                <img src={event.photo_url} alt={event.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Title block */}
            <div className="bg-white rounded-xl border p-5">
              <span className="text-xs font-semibold uppercase text-[#166534] bg-green-50 px-2 py-0.5 rounded-full">
                {event.type}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-3">{event.title}</h1>
              <div className="flex flex-col gap-2 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#166534]" />
                  {formatDateRange(event.start_date, event.end_date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#166534]" />
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
                    <User className="h-4 w-4 text-[#166534]" />
                    {event.organizer_name}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Sobre o evento</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {/* Schedule */}
            {event.schedule && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Programação</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{event.schedule}</p>
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

          {/* Contact sidebar */}
          <div>
            <div className="bg-white rounded-xl border p-5 space-y-4 sticky top-24">
              <h2 className="font-semibold text-gray-900">Organizador</h2>
              {event.organizer_name && (
                <p className="text-sm text-gray-600">{event.organizer_name}</p>
              )}
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors"
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">Anúncios da região</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {nearbyListings.map(item => (
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
