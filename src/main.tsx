import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import 'antd/dist/reset.css'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import type { ReactNode } from 'react'

const brandPrimary = '#10b981'
const brandError = '#ef4444'
const brandWarning = '#d4af37'

const darkTokens = {
  colorText: '#e8edf5',
  colorTextSecondary: '#94a3b8',
  colorBorder: '#263349',
  colorBorderSecondary: '#1c2840',
  colorBgBase: '#0b1220',
  colorBgContainer: '#111a2b',
  colorBgElevated: '#162033',
  colorBgLayout: '#0b1220',
}

const lightTokens = {
  colorText: '#1f2937',
  colorTextSecondary: '#64748b',
  colorBorder: '#d7dee8',
  colorBorderSecondary: '#e5eaf1',
  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#f4f6f9',
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: brandPrimary,
          colorSuccess: brandPrimary,
          colorError: brandError,
          colorInfo: brandPrimary,
          colorWarning: brandWarning,
          borderRadius: 8,
          ...(isDark ? darkTokens : lightTokens),
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedConfigProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <App />
          </BrowserRouter>
        </ThemedConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
