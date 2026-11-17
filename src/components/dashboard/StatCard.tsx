import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ComponentType, SVGProps } from 'react'

interface StatCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  iconColor: string
  bgColor: string
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  bgColor,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-lg', bgColor)}>
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

