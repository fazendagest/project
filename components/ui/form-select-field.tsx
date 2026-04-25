import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormSelectFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function FormSelectField({ label, children, className }: FormSelectFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
