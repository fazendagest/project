import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  wrapperClassName?: string
}

export function FormField({ label, id, wrapperClassName, className, ...props }: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '_')
  return (
    <div className={cn('space-y-2', wrapperClassName)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} className={cn('bg-background', className)} {...props} />
    </div>
  )
}
