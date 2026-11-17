import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface SearchableSelectItem {
  value: string
  label: string
  /** Optional text for search (e.g. SKU + name) */
  searchText?: string
}

interface SearchableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  items: SearchableSelectItem[]
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  /** Extra items rendered after filtered items (e.g. "Create new" option) */
  extraItems?: React.ReactNode
  emptyMessage?: string
}

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
  (
    {
      value,
      onValueChange,
      placeholder = 'Select...',
      items,
      searchPlaceholder = 'Search...',
      disabled = false,
      className,
      triggerClassName,
      extraItems,
      emptyMessage = 'No results found',
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('')
    const [open, setOpen] = React.useState(false)
    const searchInputRef = React.useRef<HTMLInputElement>(null)

    const filteredItems = React.useMemo(() => {
      if (!searchQuery.trim()) return items
      const q = searchQuery.toLowerCase()
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          (item.searchText?.toLowerCase().includes(q) ?? false)
      )
    }, [items, searchQuery])

    React.useEffect(() => {
      if (open) {
        setSearchQuery('')
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }
    }, [open])

    const handleOpenChange = (openState: boolean) => {
      setOpen(openState)
      if (!openState) setSearchQuery('')
    }

    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        open={open}
        onOpenChange={handleOpenChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            triggerClassName ?? className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[side=bottom]:translate-y-1'
            )}
            position="popper"
          >
            <div
              className="p-1 border-b"
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <SelectPrimitive.Viewport className="p-1 max-h-[min(var(--radix-select-content-available-height,300px),300px)]">
              {filteredItems.length === 0 && !extraItems ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <>
                  {filteredItems.map((item) => (
                    <SelectPrimitive.Item
                      key={item.value}
                      value={item.value}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <Check className="h-4 w-4" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                  {extraItems}
                </>
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  }
)
SearchableSelect.displayName = 'SearchableSelect'

export { SearchableSelect }
