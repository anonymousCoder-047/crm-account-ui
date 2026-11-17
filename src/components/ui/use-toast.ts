export type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

/**
 * Minimal toast hook used by admin pages.
 * Currently implemented with window.alert + console logging to avoid
 * adding a full toast system. Can be replaced later with a proper UI.
 */
export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const prefix =
      variant === 'destructive' ? '[Error]' : variant === 'success' ? '[Success]' : '[Info]'
    const message = [title, description].filter(Boolean).join(' - ')

    if (message) {
      // Basic UX feedback
      // eslint-disable-next-line no-alert
      window.alert(`${prefix} ${message}`)
    }

    // Always log for debugging
    // eslint-disable-next-line no-console
    console.log('Toast:', { title, description, variant })
  }

  return { toast }
}

