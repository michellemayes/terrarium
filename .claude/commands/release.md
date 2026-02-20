Walk me through shipping a new release of Terrarium. For each step, wait for my confirmation before proceeding to the next.

## Steps

1. **Check for uncommitted changes** — run `git status` and `git diff`. If there are changes, ask if I want to commit them first.

2. **Determine the version** — read the current version from `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`. Show me the current version and ask what the new version should be (patch, minor, or major bump).

3. **Bump the version** — update the version in all three files to match. Show me the diff.

4. **Draft release notes** — run `git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD` to get all commits since the last tag. Summarize the changes into release notes with sections like "What's New", "Improvements", and "Bug Fixes" as appropriate. Show me the draft and ask for edits.

5. **Commit the version bump** — stage and commit with message `Bump version to vX.Y.Z`.

6. **Push to master** — run `git push origin master`.

7. **Tag the release** — run `git tag vX.Y.Z` and `git push origin vX.Y.Z`. This triggers the publish workflow which builds, signs, notarizes, and creates the GitHub release automatically.

8. **Monitor the build** — show me the command to watch the workflow: `gh run watch`. If it fails, help me debug.

9. **Add release notes** — once the publish workflow creates the GitHub release, update it with the release notes from step 4: `gh release edit vX.Y.Z --notes "..."`.

10. **Verify the release** — run `gh release view vX.Y.Z` to confirm the assets were uploaded (should include `.dmg`, `.app.tar.gz`, `.sig`, and `latest.json`) and that the release notes are present.
