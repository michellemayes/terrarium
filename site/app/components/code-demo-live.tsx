'use client'

import { useState } from 'react'
import { TypewriterCode } from './typewriter-code'
import { DemoBoot } from './demo-boot'

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5" aria-hidden="true">
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
      <span className="ml-2 text-xs text-dim font-mono">{title}</span>
    </div>
  )
}

export function CodeDemoLive() {
  const [codeReady, setCodeReady] = useState(false)

  return (
    <div className="grid md:grid-cols-2 gap-5 items-stretch">
      {/* Code side */}
      <div className="gradient-border gradient-border-shimmer">
        <div className="gradient-border-inner p-4 sm:p-6">
          <WindowChrome title="counter.tsx" />
          <TypewriterCode onComplete={() => setCodeReady(true)} />
        </div>
      </div>

      {/* Render side */}
      <div className="gradient-border gradient-border-shimmer">
        <div className="gradient-border-inner p-4 sm:p-6 h-full flex flex-col">
          <WindowChrome title="Terrarium" />
          <DemoBoot ready={codeReady} />
        </div>
      </div>
    </div>
  )
}
