import type { ReactNode } from 'react'

export function DocHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="mb-12 pb-8 border-b border-violet-500/10">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-widest text-dim font-medium mb-4">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-serif text-4xl md:text-5xl text-bright leading-tight mb-4">
        {title}
      </h1>
      {description ? (
        <p className="text-lg text-muted leading-relaxed max-w-2xl">
          {description}
        </p>
      ) : null}
    </header>
  )
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-doc max-w-2xl text-[16px] leading-[1.75] text-muted">
      {children}
    </div>
  )
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="font-serif text-2xl md:text-3xl text-bright mt-14 mb-5 scroll-mt-28"
    >
      {children}
    </h2>
  )
}

export function H3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3
      id={id}
      className="text-lg font-semibold text-bright mt-10 mb-4 scroll-mt-28"
    >
      {children}
    </h3>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="my-5">{children}</p>
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[14px] text-violet-300 bg-violet-500/10 rounded px-1.5 py-0.5">
      {children}
    </code>
  )
}

export function CodeBlock({
  children,
  label,
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <div className="my-6 glass rounded-xl overflow-hidden">
      {label ? (
        <div className="px-4 py-2 border-b border-violet-500/10 text-xs text-dim font-mono uppercase tracking-wider">
          {label}
        </div>
      ) : null}
      <pre className="font-mono text-[13.5px] leading-relaxed text-violet-200 bg-black/30 px-5 py-4 overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="my-5 space-y-2.5 list-disc list-outside ml-5 marker:text-violet-400/60">
      {children}
    </ul>
  )
}

export function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="my-5 space-y-2.5 list-decimal list-outside ml-5 marker:text-violet-400/60">
      {children}
    </ol>
  )
}

export function Li({ children }: { children: ReactNode }) {
  return <li className="leading-[1.75] pl-1">{children}</li>
}

export function Callout({
  variant = 'info',
  title,
  children,
}: {
  variant?: 'info' | 'warn'
  title?: string
  children: ReactNode
}) {
  const tone =
    variant === 'warn'
      ? 'border-amber-400/30 bg-amber-500/5'
      : 'border-violet-400/25 bg-violet-500/5'
  const titleTone =
    variant === 'warn' ? 'text-amber-200' : 'text-violet-200'
  return (
    <aside className={`my-7 rounded-xl border ${tone} px-5 py-4`}>
      {title ? (
        <p className={`text-sm font-semibold ${titleTone} mb-1.5`}>{title}</p>
      ) : null}
      <div className="text-[15px] text-muted leading-relaxed [&>p]:my-0">
        {children}
      </div>
    </aside>
  )
}

export function PageNav({
  prev,
  next,
}: {
  prev?: { href: string; label: string }
  next?: { href: string; label: string }
}) {
  return (
    <nav
      aria-label="Documentation navigation"
      className="mt-20 pt-10 border-t border-violet-500/10 flex items-center justify-between gap-4"
    >
      <div>
        {prev ? (
          <a
            href={prev.href}
            className="group inline-flex flex-col text-left hover:text-accent transition-colors"
          >
            <span className="text-xs uppercase tracking-widest text-dim group-hover:text-violet-400">
              ← Previous
            </span>
            <span className="text-[15px] text-muted group-hover:text-accent mt-1">
              {prev.label}
            </span>
          </a>
        ) : null}
      </div>
      <div>
        {next ? (
          <a
            href={next.href}
            className="group inline-flex flex-col text-right hover:text-accent transition-colors"
          >
            <span className="text-xs uppercase tracking-widest text-dim group-hover:text-violet-400">
              Next →
            </span>
            <span className="text-[15px] text-muted group-hover:text-accent mt-1">
              {next.label}
            </span>
          </a>
        ) : null}
      </div>
    </nav>
  )
}
