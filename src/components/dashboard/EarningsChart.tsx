import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const data = [
  { name: 'Individual', value: 60, amount: 105000, color: '#f97316' },
  { name: 'Corporate', value: 40, amount: 85000, color: '#60a5fa' },
]

export default function EarningsChart() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Earnings</CardTitle>
          <Select defaultValue="6months">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10">
                <div>
                  <p className="text-sm font-medium text-foreground">Individual</p>
                  <p className="text-lg font-bold text-foreground">AED 1,05,000</p>
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">17%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <div>
                  <p className="text-sm font-medium text-foreground">Corporate</p>
                  <p className="text-lg font-bold text-foreground">AED 85,000</p>
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">10%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

