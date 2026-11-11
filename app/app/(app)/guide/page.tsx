import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { GUIDE, GUIDE_FOOTER, GUIDE_TITLE, SYSTEM_LINKS, type GuideBlock, type GuideItem } from '@/lib/guia-da-cria'

/** **negrito** e "(ver no sistema: Tela)" viram negrito e link. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\(ver no sistema: [^)]+\))/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**')) return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        const link = part.match(/^\(ver no sistema: ([^)]+)\)$/)
        if (link) {
          const href = SYSTEM_LINKS[link[1]]
          return href
            ? <span key={i}>(<Link href={href} className="font-medium text-primary underline underline-offset-2">ver em {link[1]}</Link>)</span>
            : <span key={i}>{part}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function Item({ item }: { item: GuideItem }) {
  if (typeof item === 'string') return <li><Rich text={item} /></li>
  return (
    <li>
      <Rich text={item.text} />
      <ul className="mt-1 list-[circle] space-y-1 pl-6">
        {item.sub.map(s => <li key={s}><Rich text={s} /></li>)}
      </ul>
    </li>
  )
}

function Block({ block }: { block: GuideBlock }) {
  if ('p' in block) return <p><Rich text={block.p} /></p>
  if ('ul' in block) {
    return (
      <ul className="list-disc space-y-2 pl-6">
        {block.ul.map((item, i) => <Item key={i} item={item} />)}
      </ul>
    )
  }
  // Tabela da seção 3 em cartões: nada rola para o lado no celular.
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {block.cards.map(c => (
        <li key={c.name} className="rounded-lg border bg-background p-4">
          <p className="font-semibold text-foreground">{c.name}</p>
          <p className="mt-1 text-muted-foreground">{c.what}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
            {c.bad && (<><dt className="text-muted-foreground">Ruim</dt><dd className="text-amber-800">{c.bad}</dd></>)}
            <dt className="text-muted-foreground">Meta</dt><dd className="font-medium text-foreground">{c.target}</dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}

/**
 * Guia da cria (Tião, P9): como o negócio funciona, em seções que abrem e fecham.
 * Só a 1 começa aberta; ?abrir=<id> abre outra (link "Entenda estes números" do cartão da cria).
 */
export default function GuidePage({ searchParams }: { searchParams: { abrir?: string } }) {
  const target = GUIDE.some(s => s.id === searchParams.abrir) ? searchParams.abrir : GUIDE[0].id
  return (
    <div className="max-w-3xl">
      <PageHeader title="Guia da cria" description={GUIDE_TITLE.replace('Guia da cria: ', '').replace(/^./, c => c.toUpperCase())} />
      <div className="space-y-3">
        {GUIDE.map(section => (
          <details key={section.id} id={section.id} open={section.id === target} className="group scroll-mt-20 rounded-xl border bg-card">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-lg font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&::-webkit-details-marker]:hidden">
              {section.title}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-3 border-t px-4 py-4 text-base leading-relaxed text-foreground md:text-lg">
              {section.blocks.map((b, i) => <Block key={i} block={b} />)}
            </div>
          </details>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{GUIDE_FOOTER}</p>
    </div>
  )
}
