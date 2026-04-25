import { TableCell, TableRow } from '@/components/ui/table'

export function EmptyState({ colSpan, message = 'Nenhum registro encontrado' }: { colSpan: number; message?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-10">
        {message}
      </TableCell>
    </TableRow>
  )
}
