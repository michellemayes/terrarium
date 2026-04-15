import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ComparePageShell,
  Breadcrumb,
  ComparisonTable,
  Disclosure,
} from '../components'

export const metadata: Metadata = {
  title: '5 Best React Component Previewers for AI-Generated Code (2026)',
  description:
    'Ranked roundup of the top tools for previewing AI-generated React components: Terrarium, JSX Viewer, Claude Artifact Runner, Storybook, and CodeSandbox.',
  openGraph: {
    title: '5 Best React Component Previewers for AI-Generated Code (2026)',
    description:
      'From zero-config desktop apps to full component workshops — the best tools for previewing React components from Claude, ChatGPT, and other AI tools.',
    type: 'website',
  },
}

const masterTable = [
  { feature: 'Primary use case', values: ['AI artifact preview', 'AI artifact preview', 'AI artifact deploy', 'Component library dev', 'Online prototyping'] },
  { feature: 'Zero config', values: ['Yes', 'Yes', 'Yes', 'No', 'Yes'] },
  { feature: 'Single-file preview', values: ['Yes', 'Yes', 'Yes', 'No', 'Yes'] },
  { feature: 'Live reload', values: ['Yes', 'No', 'Yes', 'Yes', 'Yes'] },
  { feature: 'Any npm package', values: ['Yes', 'No', 'Yes', 'Yes', 'Yes'] },
  { feature: 'Tailwind built-in', values: ['Yes', 'Yes', 'Yes', 'No', 'No'] },
  { feature: 'AI workflow', values: ['Claude Code', 'Generic', 'Claude', 'No', 'No'] },
  { feature: 'Build/deploy', values: ['No', 'No', 'Yes', 'Yes', 'Yes'] },
  { feature: 'Platform', values: ['macOS', 'All desktop', 'All (CLI)', 'Browser', 'Browser'] },
  { feature: 'Price', values: ['Free', 'Free', 'Free', 'Free*', 'Free*'] },
]

const tools = [
  {
    rank: 1,
    name: 'Terrarium',
    tagline: 'Best for macOS Claude Code users',
    description:
      'A native macOS app that instantly previews React components with zero configuration. Terrarium watches your files and re-renders on every save, making it the tightest feedback loop available for Claude Code workflows.',
    pros: [
      'Auto-installs any npm package on the fly',
      'Live reload via file watcher — no manual refresh',
      'Native Claude Code integration for iterative development',
      'Drag-and-drop, Homebrew install, multi-window support',
      'Tailwind CSS v3 with build-time generation',
    ],
    cons: [
      'macOS only — no Windows or Linux support',
      'No build/deploy output',
      'No built-in shadcn/ui or Recharts',
    ],
    url: 'https://terrarium-viewer.com',
  },
  {
    rank: 2,
    name: 'JSX Viewer',
    tagline: 'Best cross-platform option',
    description:
      'A lightweight desktop app for previewing JSX/TSX files on macOS, Windows, and Linux. Ships with pre-bundled shadcn/ui, Recharts, Lucide icons, and Tailwind CSS. Designed for AI-generated components from Claude, ChatGPT, and other tools.',
    pros: [
      'Runs on macOS, Windows, and Linux',
      'Pre-bundled shadcn/ui, Recharts, and Lucide icons',
      'Drag-and-drop file opening',
      'Graceful handling of unknown imports (placeholders, not crashes)',
      'Dark mode with system preference detection',
    ],
    cons: [
      'No live reload — requires manual refresh',
      'Fixed set of libraries (no arbitrary npm installs)',
      'No Claude Code integration',
    ],
    url: 'https://github.com/HN-Tran/jsx-viewer',
  },
  {
    rank: 3,
    name: 'Claude Artifact Runner',
    tagline: 'Best for CLI and deploy workflows',
    description:
      'A CLI tool that runs, builds, and deploys Claude-generated React artifacts. Three modes: run (dev server), build (deployable HTML), and create (full project scaffolding). Matches Claude\'s exact library versions for pixel-perfect rendering.',
    pros: [
      'Build deployable HTML from a single file',
      'Scaffold full projects with TypeScript, Tailwind, and shadcn/ui',
      'Docker support for CI/CD pipelines',
      'Multi-page apps with file-based routing',
      'Matches Claude artifact environment exactly',
    ],
    cons: [
      'CLI-only — no GUI or drag-and-drop',
      'Requires Node.js 20+ (higher than alternatives)',
      'No Claude Code live-reload integration',
    ],
    url: 'https://github.com/claudio-silva/claude-artifact-runner',
  },
  {
    rank: 4,
    name: 'Storybook',
    tagline: 'Best for full component library development',
    description:
      'The industry-standard component workshop. Storybook supports React, Vue, Angular, and more with a rich addon ecosystem for testing, documentation, and accessibility. Not built for AI workflows, but its comprehensive tooling makes it relevant for teams building production component libraries.',
    pros: [
      'Mature ecosystem with hundreds of addons',
      'Component documentation and testing built in',
      'Supports React, Vue, Angular, Svelte, and more',
      'Visual regression testing with Chromatic',
      'Large community and extensive documentation',
    ],
    cons: [
      'Requires project setup and configuration',
      'No single-file preview (needs stories)',
      'No AI-specific workflow integration',
      'Heavier footprint (5.1 MB assets baseline)',
    ],
    url: 'https://storybook.js.org',
  },
  {
    rank: 5,
    name: 'CodeSandbox',
    tagline: 'Best browser-based option',
    description:
      'A full online IDE with instant previews, npm support, and real-time collaboration. No local installation required — everything runs in the browser. Ideal for sharing prototypes or when you can\'t install desktop software.',
    pros: [
      'No local installation required',
      'Full npm support with instant installs',
      'Real-time collaboration and sharing',
      'Instant deploy to preview URLs',
      'Works on any device with a browser',
    ],
    cons: [
      'Browser-based — slower than native apps for large components',
      'No AI-specific workflow integration',
      'Requires internet connection',
      'Free tier has limitations on compute and storage',
    ],
    url: 'https://codesandbox.io',
  },
]

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Static JSON-LD structured data — no user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export default function BestPreviewersRoundup() {
  return (
    <ComparePageShell>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Compare', href: '/compare' },
          { label: 'Best React Component Previewers' },
        ]}
      />

      <h1 className="font-serif text-4xl sm:text-5xl mb-4">
        5 Best React Component Previewers for{' '}
        <span className="gradient-text">AI-Generated Code</span>
      </h1>
      <p className="text-muted text-lg mb-6 max-w-2xl leading-relaxed">
        AI tools like Claude and ChatGPT can generate production-quality React
        components — but you still need to see them running locally. Here are
        the best tools for that job in 2026.
      </p>
      <p className="text-sm text-dim mb-12">
        Ranked by: setup speed, AI integration, live reload, and ecosystem flexibility.
      </p>

      {/* Master comparison table */}
      <section className="mb-16">
        <h2 className="font-serif text-2xl mb-6">At a glance</h2>
        <ComparisonTable
          headers={['Feature', 'Terrarium', 'JSX Viewer', 'Artifact Runner', 'Storybook', 'CodeSandbox']}
          rows={masterTable}
        />
        <p className="text-xs text-dim mt-3">* Free core with paid addons or Pro tiers.</p>
      </section>

      {/* Individual reviews */}
      <section className="space-y-12 mb-16">
        {tools.map((tool) => (
          <div key={tool.rank} id={tool.name.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-28">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-serif text-4xl gradient-text-subtle opacity-70">
                {String(tool.rank).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-serif text-2xl">
                  <a
                    href={tool.url}
                    className="hover:text-accent transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tool.name}
                  </a>
                </h2>
                <p className="text-sm text-accent">{tool.tagline}</p>
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed mb-5">
              {tool.description}
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-5">
                <h3 className="text-xs uppercase tracking-widest text-dim mb-3 font-medium">Pros</h3>
                <ul className="text-sm text-muted space-y-1.5 leading-relaxed">
                  {tool.pros.map((pro, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-400 shrink-0">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-xl p-5">
                <h3 className="text-xs uppercase tracking-widest text-dim mb-3 font-medium">Cons</h3>
                <ul className="text-sm text-muted space-y-1.5 leading-relaxed">
                  {tool.cons.map((con, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-400 shrink-0">-</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* How to choose */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">How to choose</h2>
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-1">For the fastest Claude Code workflow</h3>
            <p className="text-sm text-muted">
              Use <strong className="text-accent">Terrarium</strong>. Its file watcher + Claude Code
              integration creates the tightest edit-preview loop available.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-1">For cross-platform teams</h3>
            <p className="text-sm text-muted">
              Use <strong className="text-accent">JSX Viewer</strong>. Same drag-and-drop experience
              on macOS, Windows, and Linux.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-1">For deploying prototypes</h3>
            <p className="text-sm text-muted">
              Use <strong className="text-accent">Claude Artifact Runner</strong>. Build a deployable
              HTML file or scaffold a full project from a single artifact.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-1">For production component libraries</h3>
            <p className="text-sm text-muted">
              Use <strong className="text-accent">Storybook</strong>. Its addon ecosystem for testing,
              documentation, and visual regression is unmatched.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-1">For sharing without local setup</h3>
            <p className="text-sm text-muted">
              Use <strong className="text-accent">CodeSandbox</strong>. Share a link and anyone can
              view and edit the component in their browser.
            </p>
          </div>
        </div>
      </section>

      {/* Related comparisons */}
      <section className="mb-8">
        <h2 className="font-serif text-2xl mb-4">Detailed comparisons</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/compare/terrarium-vs-jsx-viewer" className="glass glass-hover rounded-xl p-4 flex-1 block group">
            <span className="text-sm font-medium text-bright group-hover:text-accent transition-colors">
              Terrarium vs JSX Viewer
            </span>
          </Link>
          <Link href="/compare/terrarium-vs-claude-artifact-runner" className="glass glass-hover rounded-xl p-4 flex-1 block group">
            <span className="text-sm font-medium text-bright group-hover:text-accent transition-colors">
              Terrarium vs Claude Artifact Runner
            </span>
          </Link>
        </div>
      </section>

      <Disclosure />

      {/* JSON-LD structured data */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Best React Component Previewers for AI-Generated Code 2026',
          description:
            'Curated list of the top tools for previewing AI-generated React components locally.',
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          numberOfItems: 5,
          itemListElement: tools.map((tool) => ({
            '@type': 'ListItem',
            position: tool.rank,
            name: tool.name,
            url: tool.url,
          })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Terrarium',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'macOS 12+',
          description:
            'Instantly preview React components from Claude AI artifacts. Zero config, live reload, Tailwind CSS built-in.',
          url: 'https://terrarium-viewer.com',
          license: 'https://opensource.org/licenses/MIT',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />
    </ComparePageShell>
  )
}
