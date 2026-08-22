import { useEffect, useState } from 'react'

type MapLib = typeof import('./mapLib')

let pending: Promise<MapLib> | null = null

export function loadMapLib(): Promise<MapLib> {
  if (!pending) {
    pending = import('./mapLib').catch((err) => {
      pending = null
      throw err
    })
  }
  return pending
}

export function useMapLib() {
  const [lib, setLib] = useState<MapLib | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    loadMapLib().then(
      (m) => !cancelled && setLib(m),
      (e) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))),
    )
    return () => {
      cancelled = true
    }
  }, [])

  return { lib, error }
}
