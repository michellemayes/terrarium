'use client'

import { useState } from 'react'

function getMessage(count: number): string | null {
  if (count === 10) return 'Double digits!'
  if (count === 42) return 'The answer.'
  if (count === 50) return 'Halfway to 💯'
  if (count === 69) return 'Nice.'
  if (count === 100) return '💯'
  if (count === 256) return '0xFF'
  if (count === 404) return 'Count not found'
  if (count === 500) return 'Internal count error'
  return null
}

export function DemoCounter() {
  const [count, setCount] = useState(0)
  const milestone = getMessage(count)

  return (
    <div className="text-center">
      <button
        onClick={() => setCount(c => c + 1)}
        className="glass glass-hover rounded-2xl px-12 py-6 inline-block mb-6 cursor-pointer active:scale-95 transition-transform"
      >
        <span className="text-3xl font-semibold text-bright tabular-nums">
          Count: {count}
        </span>
      </button>
      <p className="text-xs text-dim font-mono flex items-center justify-center gap-1.5 h-5">
        {milestone ? (
          <span className="text-violet-300 animate-fade-in">{milestone}</span>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
            Live — watching counter.tsx
          </>
        )}
      </p>
    </div>
  )
}
