import type { Metadata } from 'next'
import {
  DocHeader,
  Prose,
  P,
  H2,
  H3,
  Code,
  CodeBlock,
  Ul,
  Ol,
  Li,
  Callout,
  PageNav,
} from '../_components/prose'

export const metadata: Metadata = {
  title: 'Install & first run',
  description:
    'Install Terrarium on macOS via Homebrew or DMG, then preview your first React .tsx file. Covers requirements, four ways to open files, and live reload basics.',
  alternates: { canonical: '/docs/getting-started' },
}

export default function GettingStarted() {
  return (
    <article>
      <DocHeader
        eyebrow="Getting started"
        title="Install & first run"
        description="Install Terrarium with one Homebrew command, open your first .tsx file, and watch it render live in under a minute."
      />

      <Prose>
        <H2 id="requirements">Requirements</H2>
        <P>
          Terrarium runs on Apple Silicon and Intel Macs. Before installing,
          make sure you have:
        </P>
        <Ul>
          <Li>
            <strong className="text-bright">macOS 12 (Monterey)</strong> or
            later
          </Li>
          <Li>
            <strong className="text-bright">Node.js 18</strong> or later — used
            for bundling and dependency installation behind the scenes
          </Li>
        </Ul>
        <P>
          You don&apos;t need <Code>npm</Code>, <Code>yarn</Code>,{' '}
          <Code>create-react-app</Code>, or any project scaffolding tool.
          Terrarium handles all of that internally.
        </P>

        <H2 id="install-homebrew">Install with Homebrew (recommended)</H2>
        <P>
          The fastest way to install Terrarium is via Homebrew. The cask is
          published from a tap maintained by the project author, so the install
          comes straight from the same release as the GitHub download.
        </P>
        <CodeBlock label="Terminal">
          {`brew tap michellemayes/terrarium\nbrew install --cask terrarium`}
        </CodeBlock>
        <P>To upgrade later when a new version ships:</P>
        <CodeBlock label="Terminal">{`brew upgrade terrarium`}</CodeBlock>

        <H2 id="install-manual">Install manually</H2>
        <P>
          If you don&apos;t use Homebrew, download the latest{' '}
          <Code>.dmg</Code> from the{' '}
          <a
            href="https://github.com/michellemayes/terrarium/releases/latest"
            className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
          >
            GitHub releases page
          </a>
          , open the disk image, and drag Terrarium into your{' '}
          <Code>Applications</Code> folder.
        </P>
        <P>
          To launch Terrarium from the command line after a manual install,
          add this alias to your shell config:
        </P>
        <CodeBlock label="~/.zshrc">
          {`alias terrarium='open -a Terrarium'`}
        </CodeBlock>
        <P>
          The Homebrew install registers a <Code>terrarium</Code> command for
          you automatically, so you only need this alias for the manual flow.
        </P>

        <H2 id="first-file">Open your first file</H2>
        <P>
          With Terrarium installed, you have four equally valid ways to open a{' '}
          <Code>.tsx</Code> or <Code>.jsx</Code> file:
        </P>
        <Ol>
          <Li>
            <strong className="text-bright">Drag and drop</strong> the file
            onto the Terrarium dock icon
          </Li>
          <Li>
            <strong className="text-bright">Double-click</strong> the file in
            Finder (after registering Terrarium as the default opener for{' '}
            <Code>.tsx</Code>)
          </Li>
          <Li>
            <strong className="text-bright">File picker</strong> — launch
            Terrarium and use the in-app open dialog
          </Li>
          <Li>
            <strong className="text-bright">CLI</strong> — run{' '}
            <Code>terrarium myfile.tsx</Code> from your terminal
          </Li>
        </Ol>
        <P>
          The CLI option is the one you will probably use most often, because
          it composes well with editors and pair-programming agents like
          Claude Code.
        </P>

        <H2 id="what-renders">What gets rendered</H2>
        <P>
          Terrarium renders the <strong className="text-bright">default
          export</strong> of your file as a React component. If your component
          imports any npm packages (for example <Code>recharts</Code>,{' '}
          <Code>framer-motion</Code>, or <Code>lucide-react</Code>), Terrarium
          detects the imports, installs the packages on demand, and includes
          them in the bundle. The first run of a brand-new dependency takes a
          few seconds; subsequent renders are instant because the dependencies
          are cached.
        </P>
        <P>
          Tailwind CSS v3 utility classes work out of the box — you can write{' '}
          <Code>className=&quot;flex items-center gap-3 text-violet-400&quot;</Code>{' '}
          in any component without configuring anything.
        </P>

        <H2 id="live-reload">Live reload</H2>
        <P>
          Once a file is open, Terrarium watches it for changes. Save the file
          in any external editor — VS Code, Zed, Cursor, vim, or Claude Code —
          and Terrarium re-bundles and re-renders within a second. There is
          nothing to enable; live reload is on by default.
        </P>
        <P>
          If a save introduces a build error (a syntax error, a missing
          import, a type mismatch), Terrarium shows a collapsible error banner
          with the line number and keeps your{' '}
          <em>last good render visible</em> behind it. You can keep editing
          and the preview will recover as soon as the next save compiles
          cleanly.
        </P>

        <Callout variant="warn" title="Security note">
          Terrarium executes the code inside files you open in order to render
          them. Only open <Code>.tsx</Code> and <Code>.jsx</Code> files you
          trust — treat them like executables. The full source is available on
          GitHub if you want to audit how files are bundled and run.
        </Callout>
      </Prose>

      <PageNav
        prev={{ href: '/docs', label: 'Overview' }}
        next={{
          href: '/docs/using-with-claude-code',
          label: 'Using with Claude Code',
        }}
      />
    </article>
  )
}
