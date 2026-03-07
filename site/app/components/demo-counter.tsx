'use client'

import { useState } from 'react'

export function DemoCounter() {
  const [count, setCount] = useState(0)

  return (
    <div className="text-center">
      <button
        onClick={() => setCount(c => c + 1)}
        className="glass glass-hover rounded-2xl px-12 py-6 inline-block mb-6 cursor-pointer active:scale-95 transition-transform"
      >
        <span className="text-3xl font-semibold text-[#e9d5ff] tabular-nums">
          Count: {count}
        </span>
      </button>
      <p className="text-xs text-[#6b5a8a] font-mono flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
        Live — watching counter.tsx
      </p>
    </div>
  )
}
