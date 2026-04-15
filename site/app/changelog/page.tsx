import type { Metadata } from 'next'
import Link from 'next/link'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const metadata: Metadata = {
  title: 'Changelog — Terrarium',
  description:
    'Every release of Terrarium with a summary of features, fixes, and changes. Versioned by date, sourced directly from the project changelog on GitHub.',
  alternates: { canonical: '/changelog' },
}

// Static at build time: read CHANGELOG.md from the repo root.
// On Vercel, the build cwd is `site/` (the configured Root Directory) and the
// full repo is checked out one level up.
type ChangelogEntry = { type: string; text: string }
type ChangelogVersion = {
  version: string
  date: string
  groups: { name: string; entries: ChangelogEntry[] }[]
}

function loadChangelog(): { intro: string; versions: ChangelogVersion[] } {
  const candidates = [
    join(process.cwd(), '..', 'CHANGELOG.md'),
    join(process.cwd(), 'CHANGELOG.md'),
  ]
  let raw: string | null = null
  for (const path of candidates) {
    try {
      raw = readFileSync(path, 'utf8')
      break
    } catch {
      // try the next candidate
    }
  }
  if (!raw) {
    return {
      intro:
        'Changelog file not found at build time. Visit the GitHub repository for the full release history.',
      versions: [],
    }
  }
  return parseChangelog(raw)
}

function parseChangelog(raw: string): {
  intro: string
  versions: ChangelogVersion[]
} {
  const lines = raw.split('\n')
  const versions: ChangelogVersion[] = []
  let intro = ''
  let currentVersion: ChangelogVersion | null = null
  let currentGroup: { name: string; entries: ChangelogEntry[] } | null = null
  let beforeFirstVersion = true

  const versionHeading = /^##\s+\[([^\]]+)\]\s*-\s*(.+)$/
  const groupHeading = /^###\s+(.+)$/
  const bullet = /^-\s+(.+)$/

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const vMatch = line.match(versionHeading)
    if (vMatch) {
      beforeFirstVersion = false
      if (currentVersion) versions.push(currentVersion)
      currentVersion = {
        version: vMatch[1],
        date: vMatch[2].trim(),
        groups: [],
      }
      currentGroup = null
      continue
    }
    const gMatch = line.match(groupHeading)
    if (gMatch && currentVersion) {
      currentGroup = { name: gMatch[1].trim(), entries: [] }
      currentVersion.groups.push(currentGroup)
      continue
    }
    const bMatch = line.match(bullet)
    if (bMatch && currentGroup) {
      currentGroup.entries.push({
        type: currentGroup.name,
        text: bMatch[1].trim(),
      })
      continue
    }
    if (beforeFirstVersion && line && !line.startsWith('#')) {
      intro += (intro ? ' ' : '') + line
    }
  }
  if (currentVersion) versions.push(currentVersion)
  return { intro: intro.trim(), versions }
}

// Render a single bullet line, converting [text](url) markdown links into
// real anchors and stripping the trailing "by @user" attribution noise.
function renderEntry(text: string) {
  // 1. Strip the trailing " by @user [in [#N](url)]?" attribution.
  // 2. Convert any inline "(#NN)" PR reference into a real markdown link so
  //    it becomes a clickable anchor when we render markdown links below.
  const cleaned = text
    .replace(/\s+by\s+@[\w-]+(\s+in\s+\[#\d+\]\([^)]+\))?\s*$/i, '')
    .replace(/\(#(\d+)\)/g, '[#$1](https://github.com/michellemayes/terrarium/pull/$1)')
  const parts: (string | { href: string; label: string })[] = []
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIdx = 0
  for (const m of cleaned.matchAll(linkRe)) {
    const idx = m.index ?? 0
    if (idx > lastIdx) parts.push(cleaned.slice(lastIdx, idx))
    parts.push({ label: m[1], href: m[2] })
    lastIdx = idx + m[0].length
  }
  if (lastIdx < cleaned.length) parts.push(cleaned.slice(lastIdx))

  return parts.map((part, i) =>
    typeof part === 'string' ? (
      <span key={i}>{part}</span>
    ) : (
      <a
        key={i}
        href={part.href}
        className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
      >
        {part.label}
      </a>
    ),
  )
}

const groupTone: Record<string, { label: string; className: string }> = {
  Features: {
    label: 'Feature',
    className: 'bg-violet-500/15 text-violet-200 border-violet-400/20',
  },
  'Bug Fixes': {
    label: 'Fix',
    className: 'bg-pink-500/15 text-pink-200 border-pink-400/20',
  },
  Fix: {
    label: 'Fix',
    className: 'bg-pink-500/15 text-pink-200 border-pink-400/20',
  },
}

function GroupBadge({ name }: { name: string }) {
  const tone = groupTone[name] ?? {
    label: name,
    className: 'bg-white/5 text-muted border-white/10',
  }
  return (
    <span
      className={`inline-flex items-center text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${tone.className}`}
    >
      {tone.label}
    </span>
  )
}

export default function ChangelogPage() {
  const { intro, versions } = loadChangelog()

  return (
    <article>
      <header className="mb-12 pb-8 border-b border-violet-500/10">
        <p className="text-xs uppercase tracking-widest text-dim font-medium mb-4">
          Reference
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-bright leading-tight mb-4">
          Changelog
        </h1>
        <p className="text-lg text-muted leading-relaxed max-w-2xl">
          {intro ||
            'Every Terrarium release with a summary of the features and fixes it shipped.'}
        </p>
        <p className="mt-4 text-sm text-dim">
          Sourced from{' '}
          <a
            href="https://github.com/michellemayes/terrarium/blob/master/CHANGELOG.md"
            className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
          >
            CHANGELOG.md
          </a>{' '}
          on GitHub.
        </p>
      </header>

      <ol className="space-y-16 max-w-2xl">
        {versions.map((v, i) => (
          <li key={v.version} className="relative">
            <div className="flex items-baseline gap-4 mb-6">
              <h2 className="font-serif text-3xl text-bright">
                v{v.version}
              </h2>
              {i === 0 ? (
                <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
                  Latest
                </span>
              ) : null}
              <time className="text-sm text-dim ml-auto font-mono">
                {v.date}
              </time>
            </div>

            <div className="space-y-6">
              {v.groups.map((group) => (
                <div key={group.name}>
                  <ul className="space-y-3">
                    {group.entries.map((entry, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-[15px] text-muted leading-relaxed"
                      >
                        <span className="shrink-0 mt-1">
                          <GroupBadge name={group.name} />
                        </span>
                        <span className="min-w-0">
                          {renderEntry(entry.text)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {versions.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-muted text-[15px]">
          The changelog couldn&apos;t be loaded at build time. Visit{' '}
          <a
            href="https://github.com/michellemayes/terrarium/releases"
            className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
          >
            GitHub releases
          </a>{' '}
          for the full release history.
        </div>
      ) : null}

      <nav className="mt-20 pt-10 border-t border-violet-500/10">
        <Link
          href="/docs"
          className="text-sm text-muted hover:text-accent transition-colors inline-flex items-center gap-2"
        >
          ← Back to docs
        </Link>
      </nav>
    </article>
  )
}
