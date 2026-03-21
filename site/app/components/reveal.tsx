'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

const observerCallbacks = new Map<Element, () => void>()
let sharedObserver: IntersectionObserver | null = null

function getObserver() {
  if (sharedObserver) return sharedObserver
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = observerCallbacks.get(entry.target)
          if (cb) {
            cb()
            observerCallbacks.delete(entry.target)
            sharedObserver!.unobserve(entry.target)
          }
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )
  return sharedObserver
}

export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = getObserver()
    observerCallbacks.set(el, () => setVisible(true))
    observer.observe(el)

    return () => {
      observerCallbacks.delete(el)
      observer.unobserve(el)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
      }}
    >
      {children}
    </div>
  )
}
