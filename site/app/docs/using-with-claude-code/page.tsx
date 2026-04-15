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
  title: 'Using with Claude Code',
  description:
    'Pair Terrarium with Claude Code for live React component preview during agent-driven pair programming. Two-terminal workflow, file watching, and example session.',
  alternates: { canonical: '/docs/using-with-claude-code' },
}

export default function UsingWithClaudeCode() {
  return (
    <article>
      <DocHeader
        eyebrow="Workflows"
        title="Using Terrarium with Claude Code"
        description="Pair Terrarium with Claude Code so every change the agent makes to your component instantly re-renders in a live preview window."
      />

      <Prose>
        <P>
          Terrarium and{' '}
          <a
            href="https://docs.anthropic.com/en/docs/claude-code"
            className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
          >
            Claude Code
          </a>{' '}
          are complementary tools. Claude Code edits files; Terrarium watches
          them. Run them side by side and you get a chat-driven dev loop where
          you can ask for a change in plain English, watch Claude Code save
          the file, and see the rendered result update in real time without
          ever switching context to a browser, a build server, or an IDE.
        </P>

        <H2 id="setup">Setup in 30 seconds</H2>
        <P>
          You need two terminal panes (or two windows, or a tmux split). One
          runs Terrarium watching your file; the other runs Claude Code
          pointed at the same file.
        </P>
        <CodeBlock label="Terminal 1 — preview">
          {`terrarium dashboard.tsx`}
        </CodeBlock>
        <CodeBlock label="Terminal 2 — agent">
          {`claude "add a dark mode toggle to dashboard.tsx"`}
        </CodeBlock>
        <P>
          When Claude Code saves <Code>dashboard.tsx</Code>, Terrarium picks
          up the change, re-bundles, and re-renders. There is no manual
          refresh, no &ldquo;reload preview&rdquo; button, and no extension to
          install — the file watcher is already running.
        </P>

        <H2 id="loop">The loop</H2>
        <Ol>
          <Li>
            <strong className="text-bright">Generate or open a starter
            file.</strong> Either copy a Claude artifact out of a chat window
            into a <Code>.tsx</Code> file, or ask Claude Code to create one
            from scratch.
          </Li>
          <Li>
            <strong className="text-bright">Open it in Terrarium.</strong> Run{' '}
            <Code>terrarium yourfile.tsx</Code> in one terminal. The first
            render kicks off dependency installation if needed, then shows
            your component.
          </Li>
          <Li>
            <strong className="text-bright">Ask Claude Code for changes.</strong>{' '}
            Use natural language — &ldquo;make the chart bars violet,&rdquo;
            &ldquo;add a loading skeleton,&rdquo; &ldquo;extract the row
            component into its own helper.&rdquo;
          </Li>
          <Li>
            <strong className="text-bright">Watch the preview update.</strong>{' '}
            Each save Claude Code makes triggers a Terrarium re-render. If a
            change introduces a build error, the error banner appears with
            the file and line, and your previous good render stays behind it.
          </Li>
          <Li>
            <strong className="text-bright">Keep iterating.</strong> Repeat
            until the component is where you want it. There is no commit,
            push, or deploy step in this loop — Terrarium is purely local.
          </Li>
        </Ol>

        <H2 id="why-it-works">Why this is fast</H2>
        <P>
          The reason this loop feels instant is that Terrarium does not boot
          a dev server, does not reload a browser tab, and does not need to
          tear down and rebuild a project on each change. It uses esbuild
          (one of the fastest JavaScript bundlers in the ecosystem) and
          renders directly into a native window through Tauri. A typical
          re-render after a save lands in well under a second on Apple
          Silicon, and the only thing standing between &ldquo;Claude saved
          the file&rdquo; and &ldquo;you see the change&rdquo; is the
          incremental bundle plus React reconciliation.
        </P>
        <P>
          Compared to the alternative — opening a project in VS Code, running{' '}
          <Code>npm run dev</Code>, waiting for the dev server, switching to
          a browser, refreshing — the Terrarium + Claude Code loop is roughly
          the difference between a build and a hot reload.
        </P>

        <H2 id="tips">Tips for a good session</H2>
        <Ul>
          <Li>
            <strong className="text-bright">Keep one file per session.</strong>{' '}
            Terrarium watches the file you opened, not a directory. If Claude
            Code creates new files, point Terrarium at whichever one is the
            entry component.
          </Li>
          <Li>
            <strong className="text-bright">Use the default export as your
            canvas.</strong> Terrarium renders the default export. Helper
            components defined in the same file are fine, but only the
            default export is shown.
          </Li>
          <Li>
            <strong className="text-bright">Let dependency installs settle.</strong>{' '}
            The first time you import a new package (say, you ask Claude
            Code to add <Code>recharts</Code>), Terrarium will install it
            during the next render. Once installed, subsequent renders are
            instant.
          </Li>
          <Li>
            <strong className="text-bright">Use the error banner as a feedback
            channel.</strong> When Claude Code makes a change that breaks
            the build, the error banner shows you the file, line, and
            message. Paste that back into Claude Code and ask it to fix the
            specific error — it works.
          </Li>
        </Ul>

        <Callout title="Heads up">
          Terrarium runs the code inside the file you open. When Claude Code
          adds an <Code>import</Code> from an unfamiliar package, that
          package&apos;s install scripts will execute on your machine just
          like any other npm install. Stick to packages you would install in
          a normal project.
        </Callout>
      </Prose>

      <PageNav
        prev={{ href: '/docs/getting-started', label: 'Install & first run' }}
        next={{ href: '/docs/troubleshooting', label: 'Troubleshooting' }}
      />
    </article>
  )
}
