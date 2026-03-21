'use client'

import { useState, useEffect } from 'react'
import { DemoCounter } from './demo-counter'

export function DemoBoot({ ready }: { ready: boolean }) {
  const [phase, setPhase] = useState<'waiting' | 'booting' | 'live'>('waiting')

  useEffect(() => {
    if (!ready || phase !== 'waiting') return

    // Skip boot animation if reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('live')
      return
    }

    setPhase('booting')
    const timer = setTimeout(() => setPhase('live'), 900)
    return () => clearTimeout(timer)
  }, [ready, phase])

  if (phase === 'waiting') {
    return (
      <div className="flex-1 flex items-center justify-center text-dim font-mono text-xs">
        <span className="opacity-40">waiting for file…</span>
      </div>
    )
  }

  if (phase === 'booting') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-violet-300">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
          bundling…
        </div>
        <div className="w-32 h-1 rounded-full bg-violet-500/10 overflow-hidden">
          <div className="h-full bg-violet-500/50 rounded-full animate-boot-progress" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center animate-fade-in">
      <DemoCounter />
    </div>
  )
}
