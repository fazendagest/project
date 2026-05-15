import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CowIcon } from '@/components/icons/cow-icon'
import { CategoryPlaceholder } from '@/components/marketplace/category-placeholder'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MapPin, MessageCircle, PawPrint, Mountain, Wrench,
  Tractor, Stethoscope, Home, LayoutGrid, ArrowRight,
  Shield, CheckCircle2, ChevronRight,
} from 'lucide-react'

const CATEGORIES = [
  { key: '', label: 'Todos', icon: LayoutGrid },
  { key: 'animais', label: 'Animais', icon: PawPrint },
  { key: 'terras', label: 'Terras', icon: Mountain },
  { key: 'servicos', label: 'Serviços', icon: Wrench },
  { key: 'maquinas', label: 'Máquinas', icon: Tractor },
  { key: 'veterinarios', label: 'Veterinários', icon: Stethoscope },
  { key: 'arrendamento', label: 'Arrendamento', icon: Home },
]

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

function formatPriceValue(price: number | null, priceType: string): string {
  if (priceType === 'consult' || !price) return 'A consultar'
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatPriceSuffix(priceType: string): string | null {
  if (priceType === 'per_head') return '/cab.'
  if (priceType === 'lot') return 'lote'
  return null
}

function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
    .replace('cerca de ', '')
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

  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  const { data: cityRows } = await supabase
    .from('listings')
    .select('city')
    .eq('status', 'published')
    .not('city', 'is', null)
  const totalCities = new Set((cityRows ?? []).map(r => r.city).filter(Boolean)).size

  const { count: totalFarms } = await supabase
    .from('farms')
    .select('*', { count: 'exact', head: true })

  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ''
  const showEvents = events && events.length > 0 && (!categoria || categoria === 'eventos')

  return (
    <div className="min-h-screen" style={{ background: '#F8F5EB' }}>

      {/* ── Header ── */}
      <header className="bg-[#0F4A2D] text-white sticky top-0 z-40 border-b border-[#0C3B24]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white/15 rounded-xl p-1.5 border border-white/20">
              <CowIcon className="h-5 w-5" />
            </div>
            <div className="hidden sm:block leading-none">
              <div className="font-bold text-base font-serif">FazendaGest</div>
              <div className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5">Marketplace · Goiás</div>
            </div>
          </Link>

          <form method="GET" action="/" className="flex-1 ml-8">
            <div className="flex items-center bg-white rounded-xl px-3 gap-2 shadow-sm">
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar animais, terras, serviços…"
                className="flex-1 py-2.5 bg-transparent text-[#1F1A12] placeholder-gray-400 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#0F4A2D] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#0C3B24] transition-colors shrink-0"
              >
                Buscar
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-white border border-white/30 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
              Entrar
            </Link>
            <Link href="/anunciar" className="text-sm font-semibold bg-white text-[#0F4A2D] px-3 py-1.5 rounded-full hover:bg-[#F0EBD8] transition-colors flex items-center gap-1">
              <span className="text-base leading-none">+</span> Anunciar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero strip ── */}
      <div className="bg-[#0F4A2D] text-white border-b border-[#0C3B24]">
        <div className="max-w-7xl mx-auto px-4 py-7 flex items-center justify-between gap-8">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">
              Interior de Goiás · {totalListings ?? 0} anúncios ativos
            </p>
            <h1 className="font-serif text-3xl sm:text-[40px] leading-tight font-medium tracking-tight max-w-lg">
              Compre, venda e negocie no campo.
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-4 text-sm opacity-85">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Anúncio grátis</span>
              <span className="opacity-50">·</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Foco regional em Goiás</span>
              <span className="opacity-50">·</span>
              <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Comprador fala direto no WhatsApp</span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden lg:grid grid-cols-3 gap-6 bg-white/10 border border-white/20 rounded-2xl px-7 py-5 shrink-0">
            {([
              [String(totalListings ?? 0), 'anúncios ativos'],
              [totalCities ? String(totalCities) : '—', 'municípios'],
              [totalFarms ? String(totalFarms) : '—', 'fazendas'],
            ] as [string, string][]).map(([n, l]) => (
              <div key={n} className="text-center">
                <div className="text-3xl font-bold font-serif">{n}</div>
                <div className="text-[11px] opacity-70 uppercase tracking-wider mt-0.5 font-sans">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category bar ── */}
      <div className="bg-white border-b border-[#EAE4D0] sticky top-[60px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = categoria === cat.key
              return (
                <Link
                  key={cat.key}
                  href={cat.key ? `/?categoria=${cat.key}` : '/'}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-[#0F4A2D] text-white border-[#0F4A2D]'
                      : 'text-gray-700 border-[#EAE4D0] hover:border-[#0F4A2D] hover:text-[#0F4A2D]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {cat.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* ── Events ── */}
        {showEvents && (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium text-gray-900 font-serif">Eventos na região</h2>
                <p className="text-xs text-gray-500 mt-0.5">Leilões, rodeios, cavalgadas, feiras e dias de campo</p>
              </div>
              <Link href="/eventos/novo" className="text-sm text-[#0F4A2D] font-semibold flex items-center gap-1">
                Cadastrar evento <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {events!.map(event => {
                const day = format(new Date(event.start_date + 'T00:00:00'), 'dd')
                const month = format(new Date(event.start_date + 'T00:00:00'), 'MMM', { locale: ptBR }).toUpperCase()
                return (
                  <Link
                    key={event.id}
                    href={`/eventos/${event.id}`}
                    className="shrink-0 w-56 bg-white rounded-xl border border-[#EAE4D0] overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                    style={{ height: 196 }}
                  >
                    {/* Cover */}
                    <div className="relative h-[88px] flex items-center justify-center overflow-hidden" style={{ background: '#E6EFD9' }}>
                      <div className="absolute top-2 left-2 bg-white rounded-lg overflow-hidden border border-[#EAE4D0] shadow-sm" style={{ width: 44, height: 48 }}>
                        <div className="bg-[#0F4A2D] text-white text-center text-[8.5px] font-bold uppercase tracking-widest py-0.5">{month}</div>
                        <div className="flex items-center justify-center flex-1 h-[30px] text-[#0F4A2D] font-bold text-lg font-serif">{day}</div>
                      </div>
                      <span className="absolute top-2 right-2 bg-white text-[#0F4A2D] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#EAE4D0] shadow-sm">
                        {event.type}
                      </span>
                    </div>
                    {/* Body */}
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 font-serif flex-1">{event.title}</p>
                      {(event.city || event.state) && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[event.city, event.state].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Listings ── */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-xl font-medium text-gray-900 font-serif">
                {q
                  ? `Resultados para "${q}"`
                  : categoria
                  ? CATEGORIES.find(c => c.key === categoria)?.label ?? 'Anúncios'
                  : 'Anúncios recentes'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {listings?.length ?? 0} {listings?.length === 1 ? 'resultado' : 'resultados'}
              </p>
            </div>
          </div>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(listing => (
                <Link key={listing.id} href={`/anuncio/${listing.id}`} className="group">
                  <div className="bg-white rounded-xl border border-[#EAE4D0] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 h-full flex flex-col">
                    {/* Photo */}
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {listing.photo_url ? (
                        <img src={listing.photo_url} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryPlaceholder category={listing.category} />
                      )}
                      <span className={`absolute top-2 left-2 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${CAT_BADGE[listing.category] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {CAT_LABEL[listing.category] ?? listing.category}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-[#1F1A12] text-sm leading-tight line-clamp-2 flex-1">
                        {listing.title}
                      </p>
                      {(listing.city || listing.state) && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[listing.city, listing.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="flex items-baseline gap-0.5">
                          <span className="font-semibold text-[#0F4A2D] text-base font-serif">
                            {formatPriceValue(listing.price, listing.price_type)}
                          </span>
                          {formatPriceSuffix(listing.price_type) && (
                            <span className="text-xs text-[#0F4A2D] font-sans">
                              {formatPriceSuffix(listing.price_type)}
                            </span>
                          )}
                        </p>
                        <span className="text-[10.5px] text-gray-400">{timeAgo(listing.created_at)}</span>
                      </div>
                      {listing.seller_name && (
                        <p className="text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t border-[#EAE4D0] flex items-center gap-1 truncate">
                          Por{' '}
                          <span className="font-medium text-[#1F1A12] truncate">{listing.seller_name}</span>
                          <CheckCircle2 className="h-3 w-3 text-[#0F4A2D] shrink-0" />
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400">
              <p className="font-medium">Nenhum anúncio encontrado</p>
              <p className="text-sm mt-1">Seja o primeiro a anunciar!</p>
              <Link
                href="/anunciar"
                className="inline-block mt-4 bg-[#0F4A2D] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#0C3B24]"
              >
                Criar anúncio
              </Link>
            </div>
          )}
        </section>

        {/* ── Conversion banner ── */}
        <section
          className="rounded-2xl overflow-hidden relative"
          style={{ background: '#F3EDD8', border: '1px solid #EAE4D0' }}
        >
          <div className="absolute right-0 bottom-0 opacity-[0.06] pointer-events-none">
            <svg viewBox="0 0 280 280" width="280" height="280">
              <path d="M280 0 C280 154 154 280 0 280 L0 0 Z" fill="#0F4A2D" />
            </svg>
          </div>
          <div className="p-8 lg:p-10 relative">
            <div
              className="inline-block text-white text-[10.5px] font-bold uppercase tracking-wider px-3 py-1 rounded mb-4"
              style={{ background: '#0F4A2D' }}
            >
              Sistema de gestão
            </div>
            <h3 className="text-2xl lg:text-[32px] font-medium leading-tight max-w-md font-serif">
              Sua fazenda organizada na palma da mão.
            </h3>
            <p className="text-sm text-gray-700 mt-3 mb-6 max-w-lg leading-relaxed">
              Controle de animais, saúde, reprodução e financeiro.{' '}
              <strong className="text-[#0F4A2D]">90 dias grátis</strong>, sem cadastrar cartão.
              Funciona até com sinal fraco no celular.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="bg-[#0F4A2D] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0C3B24] transition-colors flex items-center gap-2 text-sm"
              >
                Experimentar grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0" style={{ color: '#0F4A2D' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12L10 17L19 7" />
              </svg>
              Mais de 1.200 fazendas em Goiás já usam
            </p>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="bg-[#0F4A2D] text-white mt-4">
        <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="text-xl font-bold mb-2 font-serif">FazendaGest</div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              Marketplace e sistema de gestão para fazendeiros do interior de Goiás.
              Feito por quem entende do campo.
            </p>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-white text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" /> Suporte WhatsApp
              </a>
            )}
          </div>
          {[
            { title: 'Marketplace', links: ['Animais', 'Terras', 'Serviços', 'Máquinas'] },
            { title: 'Sistema', links: ['Como funciona', 'Preços', 'Tour pelo app', 'Suporte'] },
            { title: 'A gente', links: ['Sobre', 'Contato', 'Regras', 'Privacidade'] },
          ].map(g => (
            <div key={g.title}>
              <div className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">{g.title}</div>
              {g.links.map(l => (
                <div key={l} className="text-sm text-white/75 py-1 cursor-default">{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-white/15 max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-white/40">
          <span>© 2026 FazendaGest · Goiás, BR</span>
          <span>Feito para o homem do campo.</span>
        </div>
      </footer>
    </div>
  )
}
