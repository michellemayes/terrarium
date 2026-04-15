import type { Metadata } from 'next'
import Link from 'next/link'
import {
  DocHeader,
  Prose,
  P,
  H2,
  Code,
} from './_components/prose'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Documentation for Terrarium — install Terrarium on macOS, preview React components from .tsx and .jsx files, and integrate with Claude Code for live-reload pair programming.',
  alternates: { canonical: '/docs' },
}

const sections = [
  {
    href: '/docs/getting-started',
    title: 'Install & first run',
    description:
      'Install Terrarium with Homebrew, drop your first .tsx file, and learn the four ways to open files.',
  },
  {
    href: '/docs/using-with-claude-code',
    title: 'Using with Claude Code',
    description:
      'Pair Terrarium with Claude Code for a chat-driven dev loop where every save instantly re-renders.',
  },
  {
    href: '/docs/troubleshooting',
    title: 'Troubleshooting',
    description:
      'Fixes for missing dependencies, esbuild errors, file watcher quirks, and macOS Gatekeeper warnings.',
  },
  {
    href: '/changelog',
    title: 'Changelog',
    description:
      'Every release of Terrarium with a summary of the features, fixes, and changes.',
  },
]

export default function DocsIndex() {
  return (
    <article>
      <DocHeader
        eyebrow="Documentation"
        title="Terrarium docs"
        description="Everything you need to install Terrarium, preview your first React component, and wire it into your Claude Code workflow."
      />

      <Prose>
        <P>
          Terrarium is a free, open-source macOS app that turns any{' '}
          <Code>.tsx</Code> or <Code>.jsx</Code> file into a live-rendering
          React preview. There is no <Code>package.json</Code>, no build
          configuration, and nothing to set up beyond the install. Open a file,
          and Terrarium reads its imports, installs the npm dependencies it
          needs, bundles everything with esbuild, and shows you the rendered
          output in under a second.
        </P>
        <P>
          These docs are short on purpose. Most of what you need to know is on
          the next two pages: how to install Terrarium and run your first
          file, and how to pair it with Claude Code so every save re-renders
          live.
        </P>
      </Prose>

      <H2>Where to start</H2>
      <ul className="grid sm:grid-cols-2 gap-4 mt-6 not-prose">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block glass glass-hover rounded-2xl p-6 h-full no-underline"
            >
              <h3 className="font-semibold text-[17px] text-bright mb-2">
                {section.title} →
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {section.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <H2>What Terrarium is for</H2>
      <Prose>
        <P>
          Terrarium is built for the gap between &ldquo;I generated a React
          component in Claude&rdquo; and &ldquo;I&apos;d like to actually see
          it run.&rdquo; If you have ever copied an artifact out of a chat
          window and immediately wished you didn&apos;t need to spin up a
          whole project just to render it, Terrarium is for you. It is also
          for designers and developers who want to prototype components with
          Tailwind without booting a dev server, and for anyone using Claude
          Code who wants a live preview alongside the agent.
        </P>
        <P>
          It is <em>not</em> a replacement for a full project, a build system,
          or an IDE. It is a fast viewer with the smallest possible setup
          footprint.
        </P>
      </Prose>
    </article>
  )
}
