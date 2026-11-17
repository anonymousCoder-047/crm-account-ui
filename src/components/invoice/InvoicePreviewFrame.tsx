import { useEffect, useRef, useState } from 'react'

interface InvoicePreviewFrameProps {
  /** Full HTML document produced by renderSimpleTemplateToHTML */
  html: string
  className?: string
}

const PAPER_WIDTH = 794 // ~200mm content width at 96dpi
const MIN_HEIGHT = 1123 // ~287mm min page height

/**
 * Renders the print-generated invoice HTML inside a scaled iframe so the
 * preview is pixel-identical to the printed output (true WYSIWYG).
 */
export default function InvoicePreviewFrame({ html, className = '' }: InvoicePreviewFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(MIN_HEIGHT)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PAPER_WIDTH))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ height: Math.ceil(contentHeight * scale) }}
    >
      <iframe
        title="Invoice preview"
        sandbox="allow-same-origin"
        srcDoc={html}
        onLoad={(e) => {
          const doc = e.currentTarget.contentDocument
          const h = doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight
          if (h) setContentHeight(Math.max(MIN_HEIGHT, h + 4))
        }}
        style={{
          width: PAPER_WIDTH,
          height: contentHeight,
          border: 'none',
          display: 'block',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
