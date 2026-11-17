import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Accordion: React.FC<AccordionProps> = ({ className, ...props }) => {
  return <div className={cn('space-y-2', className)} {...props} />
}

export interface AccordionItemProps
  extends React.DetailsHTMLAttributes<HTMLDetailsElement> {
  value: string
}

export const AccordionItem = React.forwardRef<HTMLDetailsElement, AccordionItemProps>(
  ({ className, ...props }, ref) => (
    <details
      ref={ref}
      className={cn(
        'group rounded-lg border border-border bg-card shadow-sm',
        className
      )}
      {...props}
    />
  )
)
AccordionItem.displayName = 'AccordionItem'

export interface AccordionTriggerProps
  extends React.HTMLAttributes<HTMLElement> {}

export const AccordionTrigger = React.forwardRef<
  HTMLDivElement,
  AccordionTriggerProps
>(({ className, children, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/no-static-element-interactions
  <summary
    ref={ref as any}
    className={cn(
      'flex cursor-pointer list-none items-center justify-between px-4 py-3',
      'text-sm font-medium text-foreground',
      'group-open:bg-muted/50',
      className
    )}
    {...props}
  >
    {children}
  </summary>
))
AccordionTrigger.displayName = 'AccordionTrigger'

export interface AccordionContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-4 pb-4 pt-1 text-sm text-foreground', className)}
    {...props}
  />
))
AccordionContent.displayName = 'AccordionContent'


