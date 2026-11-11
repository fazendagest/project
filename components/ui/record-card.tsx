import Link from 'next/link'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Lista em cartões para o celular, no mesmo jeito da tela Animais (decisão de 11/11/2026, Henrique:
 * "em todas as listas/tabelas devem ser em formato de cartão no mobile como em animais").
 * Uso: <CardList> com <RecordCard> dentro, e a tabela da mesma tela com className "hidden md:block".
 */
export function CardList({ children, empty, className }: { children: React.ReactNode; empty?: string | false; className?: string }) {
  const hasItems = Array.isArray(children) ? children.flat().some(Boolean) : !!children
  return (
    <div className={cn('md:hidden', className)}>
      {hasItems ? <ul className="space-y-2">{children}</ul> : empty !== false && (
        <p className="text-sm text-muted-foreground py-10 text-center">{empty ?? 'Nenhum registro encontrado'}</p>
      )}
    </div>
  )
}

export type CardField = { label: string; value: React.ReactNode }

type RecordCardProps = {
  title: React.ReactNode
  /** Texto pequeno ao lado do título (código do animal, por exemplo). */
  titleNote?: React.ReactNode
  subtitle?: React.ReactNode
  /** Valor em destaque à direita (dinheiro, litros). */
  amount?: React.ReactNode
  amountClassName?: string
  /** Pares rótulo e valor, em linha, embaixo. */
  fields?: CardField[]
  /** Selos ou avisos no pé do cartão. */
  footer?: React.ReactNode
  /** Toque no cartão abre esta página. */
  href?: string
  onEdit?: () => void
  editHref?: string
  onDelete?: () => void
  /** Botões extras (ex.: "Parar"), ao lado de editar e excluir. */
  extraActions?: React.ReactNode
}

export function RecordCard({ title, titleNote, subtitle, amount, amountClassName, fields, footer, href, onEdit, editHref, onDelete, extraActions }: RecordCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {title}
            {titleNote && <span className="font-mono text-xs font-normal text-muted-foreground"> {titleNote}</span>}
          </p>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {amount != null && <p className={cn('font-semibold tabular-nums whitespace-nowrap', amountClassName)}>{amount}</p>}
      </div>
      {fields && fields.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {fields.map(f => (
            <div key={f.label}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="font-medium tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footer && <div className="mt-2">{footer}</div>}
    </>
  )
  const hasActions = onEdit || editHref || onDelete || extraActions
  return (
    <li className="rounded-lg border bg-card">
      {href ? (
        <Link href={href} className="flex items-center gap-3 p-3 min-h-[64px] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground rounded-lg">
          <div className="min-w-0 flex-1">{body}</div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        </Link>
      ) : (
        <div className="p-3">{body}</div>
      )}
      {hasActions && (
        <div className="flex justify-end gap-1 border-t px-2 py-1">
          {extraActions}
          {editHref && (
            <Link href={editHref} aria-label="Editar">
              <Button size="icon" variant="ghost" className="h-11 w-11"><Pencil className="h-4 w-4" /></Button>
            </Link>
          )}
          {onEdit && <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Editar" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>}
          {onDelete && <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label="Excluir" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      )}
    </li>
  )
}
