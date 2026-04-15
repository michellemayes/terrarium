import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ComparePageShell,
  Breadcrumb,
  ComparisonTable,
  Disclosure,
} from '../components'

export const metadata: Metadata = {
  title: 'Terrarium vs Claude Artifact Runner: Desktop App vs CLI (2026)',
  description:
    'Compare Terrarium and Claude Artifact Runner — GUI drag-and-drop vs CLI pipeline for previewing and deploying Claude-generated React components.',
  openGraph: {
    title: 'Terrarium vs Claude Artifact Runner: Desktop App vs CLI (2026)',
    description:
      'Two approaches to Claude artifacts: native macOS app vs versatile CLI tool.',
    type: 'website',
  },
}

const featureRows = [
  { feature: 'Interface', values: ['Native macOS GUI', 'CLI (terminal)'] },
  { feature: 'Zero configuration', values: ['Yes', 'Yes (npx)'] },
  { feature: 'Live reload', values: ['Yes (file watcher)', 'Yes (dev server)'] },
  { feature: 'Drag-and-drop', values: ['Yes', 'No'] },
  { feature: 'Auto npm install', values: ['Yes', 'Yes'] },
  { feature: 'Tailwind CSS', values: ['Yes (v3)', 'Yes (v3)'] },
  { feature: 'shadcn/ui', values: ['No', 'Yes'] },
  { feature: 'Recharts', values: ['No', 'Yes'] },
  { feature: 'Three.js', values: ['No', 'Yes'] },
  { feature: 'Build to HTML', values: ['No', 'Yes'] },
  { feature: 'Project scaffolding', values: ['No', 'Yes (create mode)'] },
  { feature: 'Multi-page apps', values: ['No', 'Yes (file-based routing)'] },
  { feature: 'Docker support', values: ['No', 'Yes'] },
  { feature: 'GitHub integration', values: ['No', 'Yes (repo creation)'] },
  { feature: 'Claude Code integration', values: ['Yes (native)', 'No'] },
  { feature: 'Multi-window', values: ['Yes', 'No'] },
  { feature: 'Error overlay', values: ['Yes', 'Yes'] },
  { feature: 'Cross-platform', values: ['No (macOS only)', 'Yes'] },
  { feature: 'Requires Node.js', values: ['Yes (18+)', 'Yes (20+)'] },
  { feature: 'License', values: ['MIT', 'MIT'] },
  { feature: 'Price', values: ['Free', 'Free'] },
]

export default function TerrariumVsArtifactRunner() {
  return (
    <ComparePageShell>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Compare', href: '/compare' },
          { label: 'Terrarium vs Claude Artifact Runner' },
        ]}
      />

      <h1 className="font-serif text-4xl sm:text-5xl mb-4">
        Terrarium vs <span className="gradient-text">Claude Artifact Runner</span>
      </h1>
      <p className="text-muted text-lg mb-12 max-w-2xl leading-relaxed">
        A native macOS app and a CLI tool — two different approaches to the
        same goal: getting Claude-generated React components running locally.
      </p>

      {/* TLDR */}
      <div className="glass rounded-2xl p-6 mb-12">
        <h2 className="font-semibold text-bright mb-3">TL;DR</h2>
        <p className="text-sm text-muted leading-relaxed">
          <strong className="text-bright">Terrarium</strong> is a visual, drag-and-drop macOS app
          built for rapid previewing with Claude Code integration. <strong className="text-bright">
          Claude Artifact Runner</strong> is a CLI tool that can also build deployable HTML,
          scaffold full projects, and run in Docker — better for pipelines and production workflows.
        </p>
      </div>

      {/* Feature table */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">Feature comparison</h2>
        <ComparisonTable
          headers={['Feature', 'Terrarium', 'Claude Artifact Runner']}
          rows={featureRows}
        />
      </section>

      {/* Where Terrarium wins */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">Where Terrarium wins</h2>
        <div className="space-y-6">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Visual, GUI-first experience</h3>
            <p className="text-sm text-muted leading-relaxed">
              Drag a .tsx file onto the dock icon or double-click it in Finder. No terminal needed.
              Terrarium feels like a native Mac app because it is one — built with Tauri for a small
              footprint and fast startup. For developers who prefer visual workflows, this is a
              significant ergonomic advantage over typing CLI commands.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Claude Code integration</h3>
            <p className="text-sm text-muted leading-relaxed">
              The two-terminal workflow — Terrarium watching a file while Claude Code edits it —
              creates a tight feedback loop. Describe a change to Claude, see it render immediately.
              Claude Artifact Runner lacks this integration; it&apos;s designed more for one-shot
              runs than iterative development.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Multi-window previews</h3>
            <p className="text-sm text-muted leading-relaxed">
              Open several components simultaneously in separate windows. Compare variants,
              keep a reference visible, or preview parent and child components at the same time.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Lower Node.js requirement</h3>
            <p className="text-sm text-muted leading-relaxed">
              Terrarium requires Node.js 18+, while Claude Artifact Runner needs Node.js 20+.
              If you&apos;re on an older Node version, Terrarium is more accommodating.
            </p>
          </div>
        </div>
      </section>

      {/* Where Artifact Runner wins */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">Where Claude Artifact Runner wins</h2>
        <div className="space-y-6">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Build and deploy</h3>
            <p className="text-sm text-muted leading-relaxed">
              Claude Artifact Runner can output a single HTML file or a full multi-file build
              ready for static hosting. This makes it useful beyond previewing — you can go from
              Claude artifact to deployed prototype in one command. Terrarium is strictly a
              preview tool with no build output.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Project scaffolding</h3>
            <p className="text-sm text-muted leading-relaxed">
              The <code className="text-accent">create</code> mode generates a complete editable
              project with TypeScript, Tailwind, shadcn/ui, and full Vite tooling. Ideal for
              when a prototype outgrows its single-file origins and needs proper project structure.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Docker and CI/CD</h3>
            <p className="text-sm text-muted leading-relaxed">
              Run artifacts without local Node.js via Docker. Integrate into CI/CD pipelines
              for automated builds. Terrarium is a desktop app with no Docker or automation story.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-bright mb-2">Cross-platform and multi-page apps</h3>
            <p className="text-sm text-muted leading-relaxed">
              Runs on any OS with Node.js. Supports file-based routing to combine multiple
              artifacts into multi-page applications. Also bundles Three.js for 3D artifacts,
              which Terrarium doesn&apos;t support.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow comparison */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">Workflow comparison</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-bright mb-4">Terrarium workflow</h3>
            <ol className="text-sm text-muted space-y-3 leading-relaxed list-decimal list-inside">
              <li>Generate component in Claude</li>
              <li>Save as .tsx file (or let Claude Code write it)</li>
              <li>Drag file to Terrarium (or double-click)</li>
              <li>Edit in Claude Code — preview updates live</li>
              <li>Iterate until satisfied</li>
            </ol>
            <p className="text-xs text-dim mt-4">Best for: rapid iteration and visual feedback</p>
          </div>
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-bright mb-4">Artifact Runner workflow</h3>
            <ol className="text-sm text-muted space-y-3 leading-relaxed list-decimal list-inside">
              <li>Generate component in Claude</li>
              <li>Save as .tsx file</li>
              <li>Run <code className="text-accent">npx run-claude-artifact my-app.tsx</code></li>
              <li>Preview in browser at localhost:5173</li>
              <li>Build with <code className="text-accent">npx run-claude-artifact build my-app.tsx</code></li>
              <li>Deploy the output</li>
            </ol>
            <p className="text-xs text-dim mt-4">Best for: preview-to-deploy pipelines</p>
          </div>
        </div>
      </section>

      {/* Use case recommendations */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl mb-6">Which should you choose?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-6 border-violet-500/20">
            <h3 className="font-semibold text-bright mb-3">Choose Terrarium if you&hellip;</h3>
            <ul className="text-sm text-muted space-y-2 leading-relaxed">
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Want a visual, GUI-first preview experience</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Use Claude Code for iterative development</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Prefer drag-and-drop over terminal commands</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Need to preview multiple components at once</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Are on macOS and just want to see components fast</li>
            </ul>
          </div>
          <div className="glass rounded-xl p-6 border-violet-500/20">
            <h3 className="font-semibold text-bright mb-3">Choose Claude Artifact Runner if you&hellip;</h3>
            <ul className="text-sm text-muted space-y-2 leading-relaxed">
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Need to build and deploy artifacts to production</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Want to scaffold full projects from single files</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Work in CI/CD pipelines or Docker environments</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Need cross-platform or multi-page support</li>
              <li className="flex gap-2"><span className="text-accent shrink-0">-</span> Prefer terminal-based workflows</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related comparisons */}
      <section className="mb-8">
        <h2 className="font-serif text-2xl mb-4">Related comparisons</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/compare/terrarium-vs-jsx-viewer" className="glass glass-hover rounded-xl p-4 flex-1 block group">
            <span className="text-sm font-medium text-bright group-hover:text-accent transition-colors">
              Terrarium vs JSX Viewer
            </span>
          </Link>
          <Link href="/compare/best-react-component-previewers-ai" className="glass glass-hover rounded-xl p-4 flex-1 block group">
            <span className="text-sm font-medium text-bright group-hover:text-accent transition-colors">
              5 Best React Component Previewers
            </span>
          </Link>
        </div>
      </section>

      <Disclosure />
    </ComparePageShell>
  )
}
