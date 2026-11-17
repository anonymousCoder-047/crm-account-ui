import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const data = [
  { month: 'Jan', clients: 120, income: 35000 },
  { month: 'Feb', clients: 135, income: 38000 },
  { month: 'Mar', clients: 150, income: 42000 },
  { month: 'Apr', clients: 140, income: 40000 },
  { month: 'May', clients: 165, income: 45000 },
  { month: 'Jun', clients: 180, income: 48000 },
  { month: 'Jul', clients: 175, income: 47000 },
  { month: 'Aug', clients: 190, income: 50000 },
  { month: 'Sep', clients: 200, income: 52000 },
  { month: 'Oct', clients: 210, income: 54000 },
  { month: 'Nov', clients: 220, income: 56000 },
  { month: 'Dec', clients: 230, income: 58000 },
]

export default function ClientIncomeChart() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Client Vs Income Stats</CardTitle>
          <Select defaultValue="monthly">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clients"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: '#a855f7', r: 4 }}
                  name="Clients"
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Income (AED)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

