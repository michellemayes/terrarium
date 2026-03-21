'use client'

import { useState, useCallback } from 'react'

export function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [command])

  return (
    <button
      onClick={copy}
      className="group flex items-center justify-between w-full text-left whitespace-nowrap hover:text-violet-200 transition-colors"
      title="Copy to clipboard"
    >
      <span>
        <span className="text-dim">$</span> {command}
      </span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0 text-dim text-xs">
        {copied ? '✓ copied' : 'copy'}
      </span>
    </button>
  )
}
