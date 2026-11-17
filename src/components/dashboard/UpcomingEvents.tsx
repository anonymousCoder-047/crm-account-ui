import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const upcomingEvents = [
  { date: 'Jun 24', title: 'Purpose in life.', seats: '24/50 Seats' },
  { date: 'Jun 28', title: 'Stress management', seats: '24/50 Seats' },
  { date: 'Jun 30', title: 'Happy life', seats: '24/50 Seats' },
]

export default function UpcomingEvents() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-semibold text-foreground min-w-[60px]">
                    {event.date}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{event.seats}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6">
            <Button variant="outline" className="w-full gap-2">
              <Info className="h-4 w-4" />
              View all
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

