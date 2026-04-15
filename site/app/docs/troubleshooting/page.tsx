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
  Li,
  Callout,
  PageNav,
} from '../_components/prose'

export const metadata: Metadata = {
  title: 'Troubleshooting',
  description:
    'Fix common Terrarium issues: missing Node.js, esbuild bundle errors, dependency install failures, file watcher quirks, blank previews, and macOS Gatekeeper warnings.',
  alternates: { canonical: '/docs/troubleshooting' },
}

export default function Troubleshooting() {
  return (
    <article>
      <DocHeader
        eyebrow="Reference"
        title="Troubleshooting"
        description="Fixes and explanations for the issues you are most likely to run into. If something here doesn’t solve your problem, the GitHub issues are the next stop."
      />

      <Prose>
        <H2 id="node-not-found">&ldquo;Node.js not found&rdquo; on first run</H2>
        <P>
          Terrarium uses a local Node.js install to bundle and install
          dependencies. If you see an error about Node not being found,
          install Node 18 or later. The easiest path is via Homebrew:
        </P>
        <CodeBlock label="Terminal">{`brew install node`}</CodeBlock>
        <P>
          You can verify the install with <Code>node --version</Code>. Any
          version 18 or higher works; Terrarium does not require an exact
          version.
        </P>

        <H2 id="dependency-install-fails">A dependency fails to install</H2>
        <P>
          When you open a file that imports an npm package Terrarium
          hasn&apos;t seen before, it runs an install in the background. If
          the install fails, the error banner shows the npm output. The most
          common causes:
        </P>
        <Ul>
          <Li>
            <strong className="text-bright">Network restrictions.</strong> If
            you are on a corporate VPN or behind a proxy that blocks the npm
            registry, the install will time out. Try again on an unrestricted
            network or configure npm to use your proxy in{' '}
            <Code>~/.npmrc</Code>.
          </Li>
          <Li>
            <strong className="text-bright">A typo in the import.</strong>{' '}
            Terrarium attempts to install whatever name appears in the import
            statement. If you typed <Code>recartz</Code> instead of{' '}
            <Code>recharts</Code>, npm will return a 404 and the install
            will fail. Fix the import and save again.
          </Li>
          <Li>
            <strong className="text-bright">A package with native bindings.</strong>{' '}
            Some packages compile native code on install (sharp, canvas,
            certain crypto libraries). These need build tools available on
            your machine — usually Xcode Command Line Tools{' '}
            (<Code>xcode-select --install</Code>).
          </Li>
        </Ul>

        <H2 id="bundle-errors">Bundle errors with no useful message</H2>
        <P>
          If the error banner shows an esbuild error you don&apos;t recognize,
          start by checking that your file&apos;s default export is a React
          component. Terrarium renders the default export, so a file that
          exports a plain function or an object will fail to mount.
        </P>
        <CodeBlock label="myfile.tsx">
          {`// ✗ This won't render
export default function add(a: number, b: number) {
  return a + b
}

// ✓ This will render
export default function MyComponent() {
  return <div>Hello, terrarium</div>
}`}
        </CodeBlock>
        <P>
          The other common cause is mixing CommonJS and ESM exports. Stick to{' '}
          <Code>export default</Code> for the entry component and{' '}
          <Code>import</Code> for everything else.
        </P>

        <H2 id="watcher-not-firing">File watcher isn&apos;t picking up saves</H2>
        <P>
          Terrarium uses the macOS file system events API to watch the file
          you opened. If saves aren&apos;t triggering re-renders, check the
          following:
        </P>
        <Ul>
          <Li>
            <strong className="text-bright">Is your editor saving the same
            inode?</strong> Some editors (notably some vim configurations and
            Sublime Text setups) save by writing to a temp file and renaming
            it on top of the original. This breaks watchers tracking the
            original inode. Switch your editor to &ldquo;in-place&rdquo; or
            &ldquo;atomic write off&rdquo; saving for that file.
          </Li>
          <Li>
            <strong className="text-bright">Did you open the file from a
            symlink?</strong> If the file you opened in Terrarium is a
            symlink, the watcher follows the link target. If the editor is
            saving to the link source, the watcher won&apos;t fire. Open the
            real path instead.
          </Li>
          <Li>
            <strong className="text-bright">Is iCloud Drive syncing the
            file?</strong> iCloud Drive can pause writes mid-save and produce
            confusing watcher events. Move the file out of an iCloud-synced
            directory while iterating.
          </Li>
        </Ul>

        <H2 id="blank-preview">Preview is blank but there&apos;s no error</H2>
        <P>
          If Terrarium shows an empty preview area with no error banner, the
          most likely cause is a component that returns <Code>null</Code> or
          renders nothing visible. Add a temporary{' '}
          <Code>&lt;div&gt;hello&lt;/div&gt;</Code> at the top of your
          component to confirm the file is mounting at all. If that renders,
          your real component is hitting an early return — probably waiting
          on data, an effect, or a conditional that always evaluates false in
          this environment.
        </P>

        <H2 id="gatekeeper">macOS Gatekeeper warning on first launch</H2>
        <P>
          If you installed via Homebrew and macOS shows a security warning
          when launching Terrarium for the first time, that&apos;s Gatekeeper
          checking the app. Open{' '}
          <strong className="text-bright">System Settings → Privacy &
          Security</strong> and click <strong className="text-bright">Open
          Anyway</strong> next to the Terrarium entry. The warning will not
          appear again on subsequent launches.
        </P>
        <Callout title="Why does this happen?">
          Terrarium is open source under the MIT License and the full source
          is available on GitHub. The warning is Apple&apos;s default
          behavior for any app distributed outside the Mac App Store; it is
          not specific to Terrarium and does not indicate a problem with the
          binary.
        </Callout>

        <H2 id="get-help">Getting more help</H2>
        <P>
          If none of the above resolves your issue, the project&apos;s GitHub
          issue tracker is the best next stop. Search for your error message
          first; if there is no existing issue, open a new one with the
          contents of the error banner, the file you were trying to open
          (with sensitive bits removed), and your macOS and Node versions.
        </P>
        <Ul>
          <Li>
            <a
              href="https://github.com/michellemayes/terrarium/issues"
              className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
            >
              GitHub issues
            </a>
          </Li>
          <Li>
            <a
              href="https://github.com/michellemayes/terrarium"
              className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
            >
              Source code
            </a>
          </Li>
          <Li>
            <a
              href="https://github.com/michellemayes/terrarium/releases/latest"
              className="text-accent underline decoration-violet-500/40 hover:decoration-violet-300"
            >
              Latest release notes
            </a>
          </Li>
        </Ul>
      </Prose>

      <PageNav
        prev={{
          href: '/docs/using-with-claude-code',
          label: 'Using with Claude Code',
        }}
        next={{ href: '/changelog', label: 'Changelog' }}
      />
    </article>
  )
}
