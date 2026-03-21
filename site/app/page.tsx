import { Reveal } from './components/reveal'
import { CopyableCommand } from './components/copyable-command'
import { ConsoleEasterEgg } from './components/console-easter-egg'
import { HeroGlow } from './components/hero-glow'
import { CodeDemoLive } from './components/code-demo-live'

/* ─── SVG Components ───────────────────────────────────── */

function TerrariumIcon({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative ? 'true' : undefined}
      {...(!decorative && { role: 'img', 'aria-label': 'Terrarium logo' })}
    >
      <defs>
        <linearGradient id="panelTL" x1="0" y1="1" x2="0.8" y2="0">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="panelTR" x1="1" y1="1" x2="0.2" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="panelBL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="panelBR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="innerGlow" cx="0.5" cy="0.48" r="0.45">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="bracketGlow" x="-40%" y="-40%" width="180%" height="180%">
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

      <path d="M256 52 L100 240 L256 240Z" fill="url(#panelTL)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M256 52 L256 240 L412 240Z" fill="url(#panelTR)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M100 240 L128 395 L256 462 L256 240Z" fill="url(#panelBL)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M256 240 L256 462 L384 395 L412 240Z" fill="url(#panelBR)" stroke="#a88de0" strokeWidth="2.5" strokeLinejoin="round" />

      <line x1="100" y1="240" x2="412" y2="240" stroke="#a88de0" strokeWidth="2.5" />
      <line x1="128" y1="395" x2="384" y2="395" stroke="#a88de0" strokeWidth="2" opacity="0.5" />

      <path d="M256 68 L118 232 L244 232Z" fill="#e8deff" opacity="0.12" />
      <path d="M210 110 L160 200 L225 210Z" fill="#f0eaff" opacity="0.18" />

      <ellipse cx="256" cy="320" rx="110" ry="120" fill="url(#innerGlow)" />

      <g filter="url(#bracketGlow)">
        <path d="M205 280 L168 318 L205 356" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M272 274 L240 362" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        <path d="M307 280 L344 318 L307 356" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

function Sparkle({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0L13.8 10.2L24 12L13.8 13.8L12 24L10.2 13.8L0 12L10.2 10.2Z" />
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

/* ─── Data ─────────────────────────────────────────────── */

const steps = [
  {
    number: '01',
    title: 'Generate',
    description:
      'Build any React component in Claude — a dashboard, a chart, a mini-app.',
  },
  {
    number: '02',
    title: 'Export',
    description:
      'Save the artifact as a .tsx file or copy the code to your machine.',
  },
  {
    number: '03',
    title: 'Preview',
    description:
      'Open it in Terrarium. Dependencies install automatically, rendering is instant.',
  },
]

const features = [
  {
    title: 'Zero config',
    description: 'Auto-detects npm imports and installs dependencies. No package.json, no setup, no fuss.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Live reload',
    description: 'File watcher re-bundles and re-renders on every save. Edit in any editor — Terrarium keeps up.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>
    ),
  },
  {
    title: 'Tailwind built in',
    description: 'Tailwind CSS v3 works out of the box with build-time generation. Just write your utility classes.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
      </svg>
    ),
  },
  {
    title: 'Error overlay',
    description: 'Build errors appear in a collapsible banner with line numbers. Your last good render stays visible.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Open anywhere',
    description: 'Double-click, drag-and-drop onto the dock, file picker, or terrarium myfile.tsx from the CLI.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    title: 'Claude Code ready',
    description: 'Run terrarium in one terminal, Claude Code in another. Every save from Claude live-reloads the preview.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
]

/* ─── Sections ─────────────────────────────────────────── */

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-base)]/80 backdrop-blur-md" aria-label="Main">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TerrariumIcon className="w-7 h-7" decorative />
          <span className="font-serif text-xl text-bright">Terrarium</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/michellemayes/terrarium"
            className="text-sm text-muted hover:text-accent transition-colors hidden sm:block"
          >
            GitHub
          </a>
          <a href="#download" className="btn-primary btn-primary-sm">
            <AppleIcon />
            Download
          </a>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <HeroGlow>
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 overflow-hidden">
      {/* Background gradients — interactive glow layer + static fallback */}
      <div className="hero-glow absolute inset-0" />
      <div
        className="hero-glow-fallback absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 50% 40% at 25% 70%, rgba(var(--color-accent-pink-rgb), 0.06), transparent)',
            'radial-gradient(ellipse 40% 35% at 80% 25%, rgba(var(--color-brand-rgb), 0.07), transparent)',
            'var(--color-base)',
          ].join(', '),
        }}
      />

      {/* Sparkles — show 3 on mobile, all 5 on md+ */}
      <Sparkle className="absolute top-[18%] left-[12%] text-pink-400/50 animate-sparkle" size={14} />
      <Sparkle className="absolute top-[25%] right-[18%] text-violet-400/40 animate-sparkle-delayed" size={18} />
      <Sparkle className="absolute bottom-[32%] left-[22%] text-pink-300/30 animate-sparkle-slow" size={11} />
      <Sparkle className="hidden md:block absolute top-[12%] right-[30%] text-accent/25 animate-sparkle" size={9} />
      <Sparkle className="hidden md:block absolute bottom-[20%] right-[12%] text-pink-400/35 animate-sparkle-delayed" size={12} />

      {/* Icon */}
      <div className="relative animate-float mb-10 animate-fade-up">
        <div className="absolute inset-0 blur-3xl bg-violet-500/15 rounded-full scale-[2] animate-glow-pulse" />
        <TerrariumIcon className="relative w-36 h-36 md:w-44 md:h-44" />
      </div>

      {/* Heading */}
      <h1 className="relative font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] text-center max-w-4xl leading-[1.08] animate-fade-up-1">
        Set your React
        <br />
        components{' '}
        <span className="gradient-text">free</span>
      </h1>

      {/* Subtitle */}
      <p className="relative mt-7 text-lg md:text-xl text-muted text-center max-w-2xl leading-relaxed animate-fade-up-2">
        Your Claude artifacts deserve more than a chat window.{' '}
        <span className="text-accent">Preview them instantly on your Mac.</span>
      </p>

      {/* CTAs */}
      <div className="relative flex flex-col sm:flex-row gap-4 mt-11 animate-fade-up-3">
        <a href="#download" className="btn-primary text-[15px]">
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

      {/* Scroll hint */}
      <div className="absolute bottom-10 animate-fade-up-4">
        <div className="w-5 h-8 rounded-full border border-[color:var(--color-text-muted)]/30 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 rounded-full bg-[var(--color-text-muted)]/50 animate-scroll-hint" />
        </div>
      </div>
    </section>
    </HeroGlow>
  )
}

function HowItWorks() {
  return (
    <section className="relative py-28 md:py-36 px-6 section-lazy">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-serif text-4xl md:text-5xl mb-20">
            How it works
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-16 md:gap-8">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="text-center">
                <span className="font-serif text-5xl md:text-7xl gradient-text-subtle opacity-80">
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold mt-3 mb-3 text-bright">
                  {step.title}
                </h3>
                <p className="text-muted leading-relaxed text-[15px]">
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const primary = features.slice(0, 2)
  const secondary = features.slice(2, 5)
  const callout = features[5] // Claude Code ready

  return (
    <section className="relative py-24 md:py-32 px-6 section-lazy">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-serif text-4xl md:text-5xl mb-3">
            Everything you need
          </h2>
          <p className="text-muted text-lg mb-14">
            Nothing you don&apos;t.
          </p>
        </Reveal>

        {/* Primary features — wider cards with horizontal layout */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {primary.map((feature, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="glass glass-hover rounded-2xl p-7 h-full flex gap-5 items-start">
                <div className="feature-icon w-11 h-11 shrink-0 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 transition-[transform,background] duration-200">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[17px] mb-1.5 text-bright">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Secondary features — compact vertical cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {secondary.map((feature, i) => (
            <Reveal key={i + 2} delay={200 + i * 80}>
              <div className="glass glass-hover rounded-2xl p-6 h-full">
                <div className="feature-icon w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5 text-violet-400 transition-[transform,background] duration-200">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-[17px] mb-2 text-bright">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Callout feature — Claude Code ready */}
        <Reveal delay={440}>
          <div className="glass rounded-2xl p-7 flex flex-col sm:flex-row gap-5 items-start border-violet-500/20">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-300">
              {callout.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[17px] mb-1.5 text-bright">
                {callout.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {callout.description}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function CodeDemo() {
  return (
    <section className="relative py-32 md:py-40 px-6 overflow-hidden section-lazy">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="relative mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-serif text-4xl md:text-5xl text-center mb-3">
            From file to render
          </h2>
          <p className="text-muted text-center text-lg mb-16">
            in milliseconds.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <CodeDemoLive />
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-8 flex justify-center">
            <div className="glass rounded-xl px-6 py-3 font-mono text-sm">
              <span className="text-dim">$</span>{' '}
              <span className="text-violet-300">terrarium</span>{' '}
              <span className="text-accent">counter.tsx</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function DownloadCTA() {
  return (
    <section id="download" className="relative py-28 md:py-36 px-6 section-lazy">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 80%, rgba(var(--color-brand-rgb), 0.1), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl mb-6">
            Ready to get started?
          </h2>
          <p className="text-muted text-lg mb-14">
            Available for macOS 12+ &middot; Requires Node.js 18+
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="glass rounded-2xl p-8 max-w-lg mx-auto mb-10">
            <p className="text-xs text-dim mb-4 uppercase tracking-widest font-medium">
              Install with Homebrew
            </p>
            <div className="font-mono text-xs sm:text-sm md:text-base text-violet-300 bg-black/30 rounded-xl px-5 py-3 text-left space-y-1 overflow-x-auto">
              <CopyableCommand command="brew tap michellemayes/terrarium" />
              <CopyableCommand command="brew install --cask terrarium" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <a
            href="https://github.com/michellemayes/terrarium/releases/latest"
            className="btn-primary text-base px-9 py-4"
          >
            <AppleIcon />
            Download for Mac
          </a>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-violet-500/10 py-12 px-6">
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <TerrariumIcon className="w-5 h-5" decorative />
          <span className="font-serif text-lg text-subtle">Terrarium</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-dim">
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

/* ─── Page ─────────────────────────────────────────────── */

export default function Page() {
  return (
    <>
      <ConsoleEasterEgg />
      <Nav />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <Features />
        <CodeDemo />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  )
}
