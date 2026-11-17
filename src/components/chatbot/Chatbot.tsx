import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  link?: string
  linkText?: string
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with:\n\n📊 Financial Reports (Balance Sheet, Income Statement, Cash Flow)\n📝 Create Records (Invoices, Customers, Products, Expenses)\n🔍 Get Information (Customer details, Stock levels, Search)\n\nType "help" to see all available commands, or just ask me anything!',
      timestamp: new Date(),
    },
  ])
  const [loading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          size="lg"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[600px] flex flex-col"
          >
            <Card className="flex flex-col h-full shadow-2xl border-border">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-white rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <h3 className="font-semibold">AI Assistant</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/20 rounded-full px-2 py-0.5">
                    Soon
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-card/20 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Coming Soon state */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/50 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground">Coming Soon</h4>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[280px]">
                    We're building an AI assistant that will create invoices, pull financial
                    reports, and answer questions in plain language — all from this chat.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
                  {['Create invoices', 'Pull reports', 'Search records', 'Answer questions'].map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
              {false && <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-card text-foreground border border-border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.link && msg.linkText && (
                        <a
                          href={msg.link}
                          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {msg.linkText} →
                        </a>
                      )}
                      <p className="text-xs mt-1 opacity-70">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-card text-foreground border border-border rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>}

              {/* Input */}
              <div className="p-4 border-t border-border bg-card rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    placeholder="AI assistant — coming soon"
                    disabled
                    className="flex-1"
                  />
                  <Button
                    disabled
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This feature is under development and will be available soon.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

