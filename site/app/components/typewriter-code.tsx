'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface CodeToken {
  text: string
  className: string
}

type CodeLine = CodeToken[]

const kw = 'text-violet-400'
const fn = 'text-blue-300'
const name = 'text-amber-300'
const str = 'text-green-300'
const num = 'text-orange-300'
const tag = 'text-pink-400'
const attr = 'text-violet-300'
const dim = 'text-zinc-500'
const txt = 'text-zinc-300'
const cmt = 'text-zinc-400'

const codeLines: CodeLine[] = [
  [
    { text: 'export default', className: kw },
    { text: ' ', className: '' },
    { text: 'function', className: fn },
    { text: ' ', className: '' },
    { text: 'Counter', className: name },
    { text: '()', className: dim },
    { text: ' ', className: '' },
    { text: '{', className: dim },
  ],
  [
    { text: '  ', className: '' },
    { text: 'const', className: kw },
    { text: ' ', className: '' },
    { text: '[count, setCount]', className: txt },
    { text: ' ', className: '' },
    { text: '=', className: kw },
    { text: ' ', className: '' },
    { text: 'useState', className: fn },
    { text: '(', className: dim },
    { text: '0', className: num },
    { text: ')', className: dim },
  ],
  [], // blank line
  [
    { text: '  ', className: '' },
    { text: 'return', className: kw },
    { text: ' ', className: '' },
    { text: '(', className: dim },
  ],
  [
    { text: '    ', className: '' },
    { text: '<button', className: tag },
  ],
  [
    { text: '      ', className: '' },
    { text: 'onClick', className: attr },
    { text: '={', className: dim },
    { text: '() =>', className: cmt },
    { text: ' ', className: '' },
    { text: 'setCount', className: txt },
    { text: '(', className: dim },
    { text: 'c => c + 1', className: cmt },
    { text: ')}', className: dim },
  ],
  [
    { text: '      ', className: '' },
    { text: 'className', className: attr },
    { text: '=', className: dim },
    { text: '"px-6 py-3 rounded-xl ..."', className: str },
  ],
  [
    { text: '    ', className: '' },
    { text: '>', className: tag },
  ],
  [
    { text: '      Count: ', className: '' },
    { text: '{', className: dim },
    { text: 'count', className: txt },
    { text: '}', className: dim },
  ],
  [
    { text: '    ', className: '' },
    { text: '</button>', className: tag },
  ],
  [
    { text: '  ', className: '' },
    { text: ')', className: dim },
  ],
  [{ text: '}', className: dim }],
]

// Flatten all characters with their styling for typewriter
interface FlatChar {
  char: string
  className: string
  lineIndex: number
}

const flatChars: FlatChar[] = []
for (let li = 0; li < codeLines.length; li++) {
  const line = codeLines[li]
  for (const token of line) {
    for (const char of token.text) {
      flatChars.push({ char, className: token.className, lineIndex: li })
    }
  }
  // Add newline between lines (except last)
  if (li < codeLines.length - 1) {
    flatChars.push({ char: '\n', className: '', lineIndex: li })
  }
}

export function TypewriterCode({ onComplete }: { onComplete?: () => void }) {
  const [charIndex, setCharIndex] = useState(-1) // -1 = not started
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Detect reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true)
      setDone(true)
      setCharIndex(flatChars.length - 1)
      onCompleteRef.current?.()
    }
  }, [])

  // Intersection observer to start typing
  useEffect(() => {
    if (reducedMotion) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [started, reducedMotion])

  // Typing animation
  useEffect(() => {
    if (!started || done || reducedMotion) return

    let i = 0
    let timeoutId: ReturnType<typeof setTimeout>

    function typeNext() {
      if (i >= flatChars.length) {
        setDone(true)
        onCompleteRef.current?.()
        return
      }
      setCharIndex(i)
      i++

      // Variable speed: whitespace/newlines are fast, code chars slower
      const ch = flatChars[i - 1]
      let delay: number
      if (ch.char === '\n') delay = 80
      else if (ch.char === ' ') delay = 15
      else delay = 22 + Math.random() * 18
      timeoutId = setTimeout(typeNext, delay)
    }

    typeNext()
    return () => clearTimeout(timeoutId)
  }, [started, done, reducedMotion])

  // Build rendered lines from typed characters
  const renderCode = useCallback(() => {
    if (charIndex < 0 && !done) return null

    const visibleChars = done ? flatChars : flatChars.slice(0, charIndex + 1)
    const lines: { key: number; spans: { text: string; className: string }[] }[] = []
    let currentLine = 0
    let currentSpans: { text: string; className: string }[] = []

    for (const fc of visibleChars) {
      if (fc.char === '\n') {
        lines.push({ key: currentLine, spans: [...currentSpans] })
        currentSpans = []
        currentLine++
      } else {
        const lastSpan = currentSpans[currentSpans.length - 1]
        if (lastSpan && lastSpan.className === fc.className) {
          lastSpan.text += fc.char
        } else {
          currentSpans.push({ text: fc.char, className: fc.className })
        }
      }
    }
    // Push final line
    if (currentSpans.length > 0) {
      lines.push({ key: currentLine, spans: currentSpans })
    }

    return lines.map((line) => (
      <div key={line.key} className="min-h-[1.75rem]">
        {line.spans.map((span, si) => (
          <span key={si} className={span.className}>
            {span.text}
          </span>
        ))}
      </div>
    ))
  }, [charIndex, done])

  return (
    <div ref={containerRef}>
      <pre className="font-mono text-[13px] leading-7 overflow-x-auto">
        <code className="relative">
          {reducedMotion || done ? (
            // Full static render
            codeLines.map((line, li) => (
              <div key={li} className="min-h-[1.75rem]">
                {line.map((token, ti) => (
                  <span key={ti} className={token.className}>
                    {token.text}
                  </span>
                ))}
              </div>
            ))
          ) : charIndex >= 0 ? (
            <>
              {renderCode()}
              {/* Blinking cursor */}
              <span className="inline-block w-[2px] h-[1em] bg-violet-400 align-text-bottom animate-blink ml-[1px]" />
            </>
          ) : (
            // Placeholder height to prevent layout shift
            <div style={{ height: `${codeLines.length * 28}px` }} />
          )}
        </code>
      </pre>
    </div>
  )
}
