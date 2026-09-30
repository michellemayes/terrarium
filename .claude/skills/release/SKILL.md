---
name: release
description: Walk through shipping a new release of Terrarium
---

Releases are normally automatic: when CI passes on `master`, `.github/workflows/release.yml` looks at the conventional commits since the last tag that touch `src/` or `src-tauri/`, bumps the version (breaking → major, `feat` → minor, `fix`/`perf`/`refactor` → patch), commits `chore(release): vX.Y.Z`, tags it, and runs the publish workflow. Merges that only touch docs, the site, or are `chore`/`ci`/`style`/`test` don't release.

Use this manual walkthrough only to force a release the automation wouldn't cut (e.g. a specific version). Walk me through it, and for each step, wait for my confirmation before proceeding to the next.

## Steps

1. **Check for uncommitted changes** — run `git status` and `git diff`. If there are changes, ask if I want to commit them first.

2. **Determine the version** — read the current version from `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and the `terrarium` entry in `src-tauri/Cargo.lock`. Show me the current version and ask what the new version should be (patch, minor, or major bump).

3. **Bump the version** — update the version in all four files to match. Show me the diff.

4. **Commit the version bump** — stage and commit with message `chore(release): vX.Y.Z`.

5. **Push to master** — run `git push origin master`.

6. **Tag the release** — run `git tag vX.Y.Z` and `git push origin vX.Y.Z`. This triggers the publish workflow which builds, signs, notarizes, and creates the GitHub release automatically.

7. **Monitor the build** — show me the command to watch the workflow: `gh run watch`. If it fails, help me debug.

8. **Verify the release** — run `gh release view vX.Y.Z` to confirm the assets were uploaded (should include `.dmg`, `.app.tar.gz`, `.sig`, and `latest.json`).
