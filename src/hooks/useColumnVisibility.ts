import { useState, useCallback } from 'react'

export function useColumnVisibility(
  storageKey: string,
  columnKeys: readonly string[],
  columnLabels: Record<string, string>
) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>
        const merged: Record<string, boolean> = {}
        columnKeys.forEach((key) => {
          merged[key] = parsed[key] !== false
        })
        return merged
      }
    } catch {
      /* ignore */
    }
    return columnKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<string, boolean>)
  })

  const toggleColumn = useCallback(
    (key: string) => {
      setVisibleColumns((prev) => {
        const next: Record<string, boolean> = { ...prev, [key]: !prev[key] }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [storageKey]
  )

  return { visibleColumns, toggleColumn, columnKeys, columnLabels }
}
