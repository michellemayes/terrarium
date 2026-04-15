import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    template: '%s — Terrarium docs',
    default: 'Documentation — Terrarium',
  },
  description:
    'Documentation for Terrarium, the free macOS app that instantly previews React components from .tsx and .jsx files.',
}

const docsNav = [
  {
    section: 'Getting started',
    items: [
      { href: '/docs', label: 'Overview' },
      { href: '/docs/getting-started', label: 'Install & first run' },
    ],
  },
  {
    section: 'Workflows',
    items: [
      {
        href: '/docs/using-with-claude-code',
        label: 'Using with Claude Code',
      },
    ],
  },
  {
    section: 'Reference',
    items: [
      { href: '/docs/troubleshooting', label: 'Troubleshooting' },
      { href: '/changelog', label: 'Changelog' },
    ],
  },
]

function TerrariumMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="256" cy="280" rx="170" ry="190" fill="#4a2080" opacity="0.5" />
      <path d="M256 52 L100 240 L128 395 L256 462 L384 395 L412 240Z" fill="#1e1040" />
      <path d="M256 52 L100 240 L256 240Z" fill="#c4b5fd" opacity="0.55" stroke="#a88de0" strokeWidth="6" strokeLinejoin="round" />
      <path d="M256 52 L256 240 L412 240Z" fill="#a78bfa" opacity="0.5" stroke="#a88de0" strokeWidth="6" strokeLinejoin="round" />
      <path d="M100 240 L128 395 L256 462 L256 240Z" fill="#8b5cf6" opacity="0.55" stroke="#a88de0" strokeWidth="6" strokeLinejoin="round" />
      <path d="M256 240 L256 462 L384 395 L412 240Z" fill="#7c3aed" opacity="0.55" stroke="#a88de0" strokeWidth="6" strokeLinejoin="round" />
      <path d="M205 280 L168 318 L205 356" fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M272 274 L240 362" fill="none" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />
      <path d="M307 280 L344 318 L307 356" fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-base)]/85 backdrop-blur-md border-b border-violet-500/10"
        aria-label="Main"
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <TerrariumMark />
            <span className="font-serif text-xl text-bright group-hover:text-accent transition-colors">
              Terrarium
            </span>
            <span className="text-xs text-dim font-mono ml-1">/ docs</span>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/michellemayes/terrarium"
              className="text-sm text-muted hover:text-accent transition-colors hidden sm:block"
            >
              GitHub
            </a>
            <Link
              href="/#download"
              className="btn-primary btn-primary-sm"
            >
              Download
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-12 lg:gap-16">
          {/* Sidebar */}
          <aside
            className="lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
            aria-label="Documentation"
          >
            <nav className="space-y-8">
              {docsNav.map((section) => (
                <div key={section.section}>
                  <h2 className="text-xs uppercase tracking-widest text-dim font-medium mb-3">
                    {section.section}
                  </h2>
                  <ul className="space-y-1.5">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block text-[15px] text-muted hover:text-accent transition-colors py-1"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main id="main-content" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
