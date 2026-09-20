'use client'

import { useEffect, useState } from 'react'

/**
 * Load a static JSON file from /public/data and memoize the result.
 * The dataset is final, so these files never change at runtime.
 */
export function useChartData<T>(url: string): T | null {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}`)
        return r.json() as Promise<T>
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return data
}
