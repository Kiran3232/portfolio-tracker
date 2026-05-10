import { useEffect, useRef, useState } from 'react'

type AnimatedNumberProps = {
  value: number
  durationMs?: number
  format?: (value: number) => string
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimatedNumber({
  value,
  durationMs = 650,
  format = (n) => n.toLocaleString('en-IN'),
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const previousValueRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startValue = previousValueRef.current
    const delta = value - startValue

    if (delta === 0) {
      setDisplay(value)
      return
    }

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const eased = easeOutCubic(progress)
      const nextValue = startValue + delta * eased

      setDisplay(nextValue)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        previousValueRef.current = value
        setDisplay(value)
      }
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value, durationMs])

  return <span>{format(display)}</span>
}
