'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function HeroGlow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Skip on touch-primary devices
    if (window.matchMedia('(pointer: coarse)').matches) return

    // Skip if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rafId = 0
    let targetX = 50
    let targetY = 35
    let currentX = 50
    let currentY = 35

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t
    }

    function tick() {
      currentX = lerp(currentX, targetX, 0.08)
      currentY = lerp(currentY, targetY, 0.08)
      el!.style.setProperty('--glow-x', `${currentX}%`)
      el!.style.setProperty('--glow-y', `${currentY}%`)
      rafId = requestAnimationFrame(tick)
    }

    function onMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect()
      targetX = ((e.clientX - rect.left) / rect.width) * 100
      targetY = ((e.clientY - rect.top) / rect.height) * 100
    }

    el.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(tick)

    return () => {
      el.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div ref={ref} className="hero-glow-container">
      {children}
    </div>
  )
}
