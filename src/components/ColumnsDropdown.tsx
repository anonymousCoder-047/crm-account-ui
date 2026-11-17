import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Columns2, ChevronDown } from 'lucide-react'

interface ColumnsDropdownProps {
  columnKeys: readonly string[]
  columnLabels: Record<string, string>
  visibleColumns: Record<string, boolean>
  onToggleColumn: (key: string) => void
}

export function ColumnsDropdown({
  columnKeys,
  columnLabels,
  visibleColumns,
  onToggleColumn,
}: ColumnsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="border-border hover:bg-muted/50 flex-shrink-0"
          title="Show/hide columns"
        >
          <Columns2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Columns</span>
          <ChevronDown className="h-4 w-4 hidden sm:inline ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columnKeys.map((key) => (
          <DropdownMenuItem
            key={key}
            onSelect={(e) => {
              e.preventDefault()
              onToggleColumn(key)
            }}
            className="cursor-pointer flex items-center gap-2"
          >
            <Checkbox checked={visibleColumns[key] !== false} className="pointer-events-none" />
            <span>{columnLabels[key]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
