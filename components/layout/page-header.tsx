interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  /** Esconde as ações no celular (quando a tela usa a barra fixa de baixo). */
  actionsDesktopOnly?: boolean
}

export function PageHeader({ title, description, actions, actionsDesktopOnly }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 md:mb-6">
      <div className="min-h-9 flex flex-col justify-center pl-12 md:pl-0">
        {/* No celular o título fica na mesma linha do botão do menu */}
        <h1 className="text-xl md:text-3xl font-bold text-foreground leading-tight">{title}</h1>
        {description && (
          <p className="hidden md:block text-muted-foreground mt-1 text-base">{description}</p>
        )}
      </div>
      {actions && (
        <div className={`${actionsDesktopOnly ? 'hidden md:flex' : 'flex'} items-center gap-2 shrink-0`}>
          {actions}
        </div>
      )}
    </div>
  )
}

/** Botão principal fixo no rodapé, só no celular. A página precisa de espaço embaixo (pb-24). */
export function MobileActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}
