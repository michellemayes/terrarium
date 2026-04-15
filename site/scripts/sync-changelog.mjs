// Copies the repo-root CHANGELOG.md into site/ so the /changelog page can
// read it at build time regardless of how the deploy environment lays out
// the working directory. Safe to run repeatedly; the local copy is git-ignored.
import { copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(__dirname, '..')
const candidates = [
  resolve(siteRoot, '..', 'CHANGELOG.md'),
  resolve(siteRoot, 'CHANGELOG.md'),
]

let source = null
for (const path of candidates) {
  if (existsSync(path)) {
    source = path
    break
  }
}

if (!source) {
  console.warn(
    '[sync-changelog] CHANGELOG.md not found in any expected location; the /changelog page will render an empty state.',
  )
  process.exit(0)
}

const dest = resolve(siteRoot, 'CHANGELOG.md')
if (source !== dest) {
  copyFileSync(source, dest)
  console.log(`[sync-changelog] Copied ${source} -> ${dest}`)
} else {
  console.log('[sync-changelog] Source and destination are the same; skipping')
}
