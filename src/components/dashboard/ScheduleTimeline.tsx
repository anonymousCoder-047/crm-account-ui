import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Clipboard, MessageSquare, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, addDays, subDays } from 'date-fns'

const events = [
  {
    time: '09:00 am - 10.30 pm',
    title: 'Phycology assesment test',
    client: 'Abhinav Jain',
    icon: Clipboard,
    color: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
  },
  {
    time: '11:00 am - 12.30 pm',
    title: 'Child Counseling',
    client: 'Jayesh Chaturvedi',
    icon: MessageSquare,
    color: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
    borderColor: 'border-pink-500/30',
  },
  {
    time: '11:00 am - 3.30 pm',
    title: 'Happy All Social Event',
    client: 'Axiety, stress management, mood swigs',
    icon: Heart,
    color: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
  },
]

export default function ScheduleTimeline() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const handlePrevDay = () => {
    setCurrentDate(subDays(currentDate, 1))
  }

  const handleNextDay = () => {
    setCurrentDate(addDays(currentDate, 1))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Schedule</CardTitle>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            CREATE
          </Button>
        </CardHeader>
        <CardContent>
          {/* Date Navigator */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevDay}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Today, {format(currentDate, 'dd MMM, yyyy')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDay}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />

            {/* Events */}
            <div className="space-y-4">
              {events.map((event, index) => {
                const Icon = event.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start gap-4 pl-14"
                  >
                    {/* Time Dot */}
                    <div className="absolute left-4 top-2 h-4 w-4 rounded-full bg-card border-2 border-border z-10" />

                    {/* Event Card */}
                    <div
                      className={`flex-1 rounded-lg border p-4 ${event.color} ${event.borderColor} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${event.color}`}>
                          <Icon className={`h-5 w-5 ${event.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">{event.time}</p>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{event.client}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

