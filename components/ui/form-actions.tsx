'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface FormActionsProps {
  onCancel: () => void
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  disabled?: boolean
  onSubmit?: () => void
  variant?: 'dialog' | 'page'
}

export function FormActions({
  onCancel,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  disabled = false,
  onSubmit,
  variant = 'dialog',
}: FormActionsProps) {
  const classes =
    variant === 'dialog'
      ? 'sticky -bottom-4 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted p-4 sm:flex-row sm:justify-between'
      : 'flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-6 pt-6 border-t'

  return (
    <div className={classes} data-slot={variant === 'dialog' ? 'form-actions' : undefined}>
      <Button type="button" variant="outline" onClick={onCancel} className={variant === 'dialog' ? 'h-11 md:h-11 sm:flex-1' : undefined}>
        {cancelLabel}
      </Button>
      <Button
        type={onSubmit ? 'button' : 'submit'}
        disabled={isLoading || disabled}
        onClick={onSubmit}
        className={variant === 'dialog' ? 'h-11 md:h-11 sm:flex-1' : undefined}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  )
}
