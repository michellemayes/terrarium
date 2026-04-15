import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparePageShell, Breadcrumb, Disclosure } from './components'

export const metadata: Metadata = {
  title: 'Terrarium Alternatives — 7 Best React Component Previewers (2026)',
  description:
    'Compare Terrarium with JSX Viewer, Claude Artifact Runner, Storybook, Ladle, React Cosmos, and CodeSandbox. Find the best React component previewer for AI-generated code.',
  openGraph: {
    title: 'Terrarium Alternatives — 7 Best React Component Previewers (2026)',
    description:
      'Compare Terrarium with the top React component previewers for AI-generated code.',
    type: 'website',
  },
}

const alternatives = [
  {
    name: 'JSX Viewer',
    href: '/compare/terrarium-vs-jsx-viewer',
    description:
      'Lightweight desktop app for previewing JSX/TSX files with built-in shadcn/ui, Recharts, and Tailwind. Supports macOS, Windows, and Linux.',
    bestFor: 'Cross-platform teams needing pre-bundled UI libraries',
    platform: 'macOS, Windows, Linux',
    price: 'Free (MIT)',
  },
  {
    name: 'Claude Artifact Runner',
    href: '/compare/terrarium-vs-claude-artifact-runner',
    description:
      'CLI tool that runs, builds, and deploys Claude-generated React artifacts. Supports Docker and can output deployable HTML files.',
    bestFor: 'CLI-first workflows and deploying artifacts to production',
    platform: 'macOS, Windows, Linux',
    price: 'Free (MIT)',
  },
  {
    name: 'Storybook',
    href: '/compare/best-react-component-previewers-ai',
    description:
      'Industry-standard component workshop for building UI libraries. Supports React, Vue, Angular, and more with addons for testing, docs, and accessibility.',
    bestFor: 'Full component library development with documentation',
    platform: 'Browser-based',
    price: 'Free (paid addons)',
  },
  {
    name: 'Ladle',
    href: '/compare/best-react-component-previewers-ai',
    description:
      'Drop-in Storybook alternative powered by Vite. 20x smaller output, 4x faster startup. Compatible with Component Story Format.',
    bestFor: 'Teams wanting a lighter Storybook alternative',
    platform: 'Browser-based',
    price: 'Free',
  },
  {
    name: 'React Cosmos',
    href: '/compare/best-react-component-previewers-ai',
    description:
      'Component sandbox with fixture-based workflow. Supports Vite, Webpack, and React Native with a full plugin system.',
    bestFor: 'Isolated component development with fixtures',
    platform: 'Browser-based',
    price: 'Free (paid Pro)',
  },
  {
    name: 'CodeSandbox',
    href: '/compare/best-react-component-previewers-ai',
    description:
      'Full online IDE with instant previews, npm support, and collaboration features. No local installation required.',
    bestFor: 'Browser-based prototyping and sharing',
    platform: 'Browser',
    price: 'Free (paid Pro)',
  },
  {
    name: 'Preview.js',
    href: '/compare/best-react-component-previewers-ai',
    description:
      'VS Code extension for instant React component preview inside your IDE. Auto-detects components and Storybook stories. No longer actively maintained.',
    bestFor: 'IDE-integrated preview (if you accept no updates)',
    platform: 'VS Code, Cursor, Windsurf',
    price: 'Free',
  },
]

export default function ComparePage() {
  return (
    <ComparePageShell>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Compare' },
        ]}
      />

      <h1 className="font-serif text-4xl sm:text-5xl mb-4">
        Terrarium <span className="gradient-text">alternatives</span>
      </h1>
      <p className="text-muted text-lg mb-4 max-w-2xl leading-relaxed">
        Terrarium is a macOS app that instantly previews React components from Claude AI
        artifacts — zero config, live reload, Tailwind built in. But it&apos;s not the only option.
      </p>
      <p className="text-muted mb-12 max-w-2xl leading-relaxed">
        Here are the best alternatives for previewing AI-generated React components in 2026,
        from desktop apps to CLI tools to browser-based sandboxes.
      </p>

      <div className="space-y-4">
        {alternatives.map((alt) => (
          <Link
            key={alt.name}
            href={alt.href}
            className="glass glass-hover rounded-2xl p-6 block group"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-bright group-hover:text-accent transition-colors mb-2">
                  {alt.name}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-3">
                  {alt.description}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dim">
                  <span>Best for: {alt.bestFor}</span>
                  <span>Platform: {alt.platform}</span>
                  <span>Price: {alt.price}</span>
                </div>
              </div>
              <div className="shrink-0 self-center text-dim group-hover:text-accent transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick comparison */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl mb-6">Quick comparison</h2>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-bright border-b border-violet-500/15">Tool</th>
                <th className="py-3 px-4 text-center font-semibold text-bright border-b border-violet-500/15">Zero Config</th>
                <th className="py-3 px-4 text-center font-semibold text-bright border-b border-violet-500/15">Live Reload</th>
                <th className="py-3 px-4 text-center font-semibold text-bright border-b border-violet-500/15">AI Workflow</th>
                <th className="py-3 px-4 text-center font-semibold text-bright border-b border-violet-500/15">Platform</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              {[
                ['Terrarium', 'Yes', 'Yes', 'Claude Code', 'macOS'],
                ['JSX Viewer', 'Yes', 'No', 'Generic', 'All desktop'],
                ['Artifact Runner', 'Yes', 'Yes', 'Claude', 'All (CLI)'],
                ['Storybook', 'No', 'Yes', 'No', 'Browser'],
                ['Ladle', 'Minimal', 'Yes', 'No', 'Browser'],
                ['React Cosmos', 'Minimal', 'Yes', 'No', 'Browser'],
                ['CodeSandbox', 'Yes', 'Yes', 'No', 'Browser'],
              ].map(([tool, zeroConfig, liveReload, ai, platform], i) => (
                <tr key={i} className="border-b border-violet-500/8 hover:bg-violet-500/[0.04] transition-colors">
                  <td className="py-3 px-4 font-medium text-bright">{tool}</td>
                  <td className="py-3 px-4 text-center">{zeroConfig}</td>
                  <td className="py-3 px-4 text-center">{liveReload}</td>
                  <td className="py-3 px-4 text-center">{ai}</td>
                  <td className="py-3 px-4 text-center">{platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed comparisons links */}
      <section className="mt-16">
        <h2 className="font-serif text-2xl mb-6">Detailed comparisons</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/compare/terrarium-vs-jsx-viewer" className="glass glass-hover rounded-xl p-5 block group">
            <h3 className="font-semibold text-bright group-hover:text-accent transition-colors mb-1">
              Terrarium vs JSX Viewer
            </h3>
            <p className="text-xs text-dim">Desktop app showdown — npm flexibility vs pre-bundled libraries</p>
          </Link>
          <Link href="/compare/terrarium-vs-claude-artifact-runner" className="glass glass-hover rounded-xl p-5 block group">
            <h3 className="font-semibold text-bright group-hover:text-accent transition-colors mb-1">
              Terrarium vs Claude Artifact Runner
            </h3>
            <p className="text-xs text-dim">GUI drag-and-drop vs CLI pipeline for Claude artifacts</p>
          </Link>
          <Link href="/compare/best-react-component-previewers-ai" className="glass glass-hover rounded-xl p-5 block group sm:col-span-2">
            <h3 className="font-semibold text-bright group-hover:text-accent transition-colors mb-1">
              5 Best React Component Previewers for AI-Generated Code
            </h3>
            <p className="text-xs text-dim">Full roundup with rankings, pros/cons, and use-case recommendations</p>
          </Link>
        </div>
      </section>

      <Disclosure />
    </ComparePageShell>
  )
}
