import { useEffect, useState } from 'react'

interface FxRateState {
  usdInr: number
  loading: boolean
  error: string | null
  updatedAt: string | null
}

export function useFxRate() {
  const [state, setState] = useState<FxRateState>({
    usdInr: 83,
    loading: true,
    error: null,
    updatedAt: null,
  })

  useEffect(() => {
    let active = true

    async function loadRate() {
      try {
        const res = await fetch(
          'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR'
        )

        if (!res.ok) {
          throw new Error(`FX API error ${res.status}`)
        }

        const data = await res.json()
        const rate = Number(data?.rates?.INR)

        if (!Number.isFinite(rate)) {
          throw new Error('Invalid USD/INR rate response')
        }

        if (!active) return

        setState({
          usdInr: rate,
          loading: false,
          error: null,
          updatedAt: data?.date || new Date().toISOString(),
        })
      } catch (error) {
        if (!active) return

        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load FX rate',
        }))
      }
    }

    loadRate()
    const timer = window.setInterval(loadRate, 15 * 60 * 1000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  return state
}