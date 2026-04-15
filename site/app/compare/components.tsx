import Link from 'next/link'

/* ─── Icons ───────────────────────────────────────────── */

function TerrariumIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cPanelTL" x1="0" y1="1" x2="0.8" y2="0">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="cPanelTR" x1="1" y1="1" x2="0.2" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="cPanelBL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="cPanelBR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="cInnerGlow" cx="0.5" cy="0.48" r="0.45">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="cBracketGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="256" cy="280" rx="170" ry="190" fill="#4a2080" opacity="0.5" />
      <path d="M256 52 L100 240 L128 395 L256 462 L384 395 L412 240Z" fill="#1e1040" />
      <path d="M256 52 L100 240 L256 240Z" fill="url(#cPanelTL)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M256 52 L256 240 L412 240Z" fill="url(#cPanelTR)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 240 L128 395 L256 462 L256 240Z" fill="url(#cPanelBL)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M256 240 L256 462 L384 395 L412 240Z" fill="url(#cPanelBR)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="100" y1="240" x2="412" y2="240" stroke="#a88de0" strokeWidth="2.5" />
      <line x1="128" y1="395" x2="384" y2="395" stroke="#a88de0" strokeWidth="2" opacity="0.5" />
      <path d="M256 68 L118 232 L244 232Z" fill="#e8deff" opacity="0.12" />
      <ellipse cx="256" cy="320" rx="110" ry="120" fill="url(#cInnerGlow)" />
      <g filter="url(#cBracketGlow)">
        <path d="M205 280 L168 318 L205 356" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M272 274 L240 362" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        <path d="M307 280 L344 318 L307 356" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/* ─── Nav ──────────────────────────────────────────────── */

export function CompareNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-base)]/80 backdrop-blur-md" aria-label="Main">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <TerrariumIcon className="w-7 h-7" />
          <span className="font-serif text-xl text-bright">Terrarium</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/compare"
            className="text-sm text-muted hover:text-accent transition-colors hidden sm:block"
          >
            Compare
          </Link>
          <a
            href="https://github.com/michellemayes/terrarium"
            className="text-sm text-muted hover:text-accent transition-colors hidden sm:block"
          >
            GitHub
          </a>
          <a href="/#download" className="btn-primary btn-primary-sm">
            <AppleIcon />
            Download
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ─── Footer ──────────────────────────────────────────── */

export function CompareFooter() {
  return (
    <footer className="border-t border-violet-500/10 py-12 px-6">
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <TerrariumIcon className="w-5 h-5" />
          <span className="font-serif text-lg text-subtle">Terrarium</span>
        </Link>
        <div className="flex items-center gap-2 text-sm text-dim">
          <Link href="/compare" className="hover:text-accent transition-colors py-2 px-3">
            Compare
          </Link>
          <a href="https://github.com/michellemayes/terrarium" className="hover:text-accent transition-colors py-2 px-3">
            GitHub
          </a>
          <a href="https://github.com/michellemayes/terrarium/releases/latest" className="hover:text-accent transition-colors py-2 px-3">
            Releases
          </a>
          <a href="https://github.com/michellemayes/terrarium/blob/master/LICENSE" className="hover:text-accent transition-colors py-2 px-3">
            MIT License
          </a>
        </div>
        <p className="text-sm text-dim">Built by <a href="https://michellemayes.me" className="hover:text-accent transition-colors py-2 px-1">Michelle Mayes</a></p>
      </div>
    </footer>
  )
}

/* ─── Breadcrumb ──────────────────────────────────────── */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-dim mb-8">
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-accent transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-muted">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* ─── Comparison Table ────────────────────────────────── */

type Row = {
  feature: string
  values: string[]
}

export function ComparisonTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Row[]
}) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`py-3 px-4 text-left font-semibold text-bright border-b border-violet-500/15 ${
                  i === 0 ? 'min-w-[180px]' : 'text-center min-w-[120px]'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-violet-500/8 hover:bg-violet-500/[0.04] transition-colors"
            >
              <td className="py-3 px-4 text-muted">{row.feature}</td>
              {row.values.map((v, j) => (
                <td key={j} className="py-3 px-4 text-center">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── CTA Section ─────────────────────────────────────── */

export function DownloadCTA() {
  return (
    <section className="relative py-20 px-6">
      <div className="section-divider absolute top-0 left-0 right-0" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 80%, rgba(var(--color-brand-rgb), 0.1), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="font-serif text-3xl sm:text-4xl mb-4">
          Try Terrarium free
        </h2>
        <p className="text-muted mb-8">
          macOS 12+ &middot; Node.js 18+ &middot; MIT License
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/#download" className="btn-primary text-[15px]">
            <AppleIcon />
            Download for Mac
          </a>
          <a
            href="https://github.com/michellemayes/terrarium"
            className="btn-ghost text-[15px]"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─── Disclosure ──────────────────────────────────────── */

export function Disclosure() {
  return (
    <p className="text-xs text-dim mt-12 leading-relaxed">
      <strong className="text-muted">Disclosure:</strong> This page is published by the Terrarium team.
      We strive for accuracy and fairness — all competitor information is sourced from public documentation and websites.
      Pricing and features were last verified in April 2026.
    </p>
  )
}

/* ─── Page Shell ──────────────────────────────────────── */

export function ComparePageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CompareNav />
      <main id="main-content" className="pt-28 pb-12 px-6">
        <div className="mx-auto max-w-4xl">
          {children}
        </div>
      </main>
      <DownloadCTA />
      <CompareFooter />
    </>
  )
}
