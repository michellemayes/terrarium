# Commit Linting & Changelog Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce Conventional Commits via a local git hook and generate changelogs with git-cliff.

**Architecture:** commitlint + husky for local commit message validation; git-cliff for CHANGELOG.md generation and GitHub release notes. The publish workflow's `release-notes` job is replaced with a git-cliff step.

**Tech Stack:** @commitlint/cli, @commitlint/config-conventional, husky, git-cliff

---

### Task 1: Install commitlint and husky

**Files:**
- Modify: `package.json:7-11` (add scripts), `package.json:13-17` (add devDependencies)

**Step 1: Install devDependencies**

Run:
```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional husky
```

**Step 2: Add the `prepare` script to package.json**

Edit `package.json` scripts to add:
```json
"prepare": "husky"
```

The scripts block should look like:
```json
"scripts": {
  "tauri": "tauri",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "prepare": "husky"
}
```

**Step 3: Initialize husky**

Run:
```bash
pnpm exec husky init
```

This creates the `.husky/` directory. It may create a default `.husky/pre-commit` file — delete it if so, we only need `commit-msg`.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .husky/
git commit -m "chore: install commitlint and husky"
```

---

### Task 2: Configure commitlint

**Files:**
- Create: `commitlint.config.js`

**Step 1: Create commitlint config**

Create `commitlint.config.js`:
```js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

Note: The project's `package.json` does not have `"type": "module"`, so this file uses the `.js` extension with `export default` which commitlint supports natively. If this causes issues, use `module.exports =` instead.

**Step 2: Verify commitlint works**

Run:
```bash
echo "bad message" | pnpm exec commitlint
```
Expected: FAIL with errors about type and subject.

Run:
```bash
echo "feat: add something" | pnpm exec commitlint
```
Expected: PASS (no errors).

**Step 3: Commit**

```bash
git add commitlint.config.js
git commit -m "chore: add commitlint configuration"
```

---

### Task 3: Add commit-msg git hook

**Files:**
- Create: `.husky/commit-msg`

**Step 1: Create the hook file**

Create `.husky/commit-msg`:
```bash
pnpm exec commitlint --edit $1
```

No shebang needed — husky v9+ runs hooks as shell scripts automatically.

**Step 2: Make the hook executable**

Run:
```bash
chmod +x .husky/commit-msg
```

**Step 3: Test the hook with a bad commit**

Run:
```bash
git commit --allow-empty -m "bad message"
```
Expected: FAIL — commitlint rejects the message.

**Step 4: Test the hook with a good commit**

Run:
```bash
git commit --allow-empty -m "test: verify commit-msg hook works"
```
Expected: PASS — commit is created.

**Step 5: Remove the test commit**

Run:
```bash
git reset HEAD~1
```

**Step 6: Commit the hook**

```bash
git add .husky/commit-msg
git commit -m "chore: add commit-msg hook for linting"
```

---

### Task 4: Configure git-cliff

**Files:**
- Create: `cliff.toml`

**Step 1: Create git-cliff configuration**

Create `cliff.toml`:
```toml
[changelog]
header = """
# Changelog

All notable changes to Terrarium are documented in this file.\n
"""
body = """
{%- macro remote_url() -%}
  https://github.com/michellemayes/terrarium
{%- endmacro -%}

{% if version -%}
    ## [{{ version | trim_start_matches(pat="v") }}] - {{ timestamp | date(format="%Y-%m-%d") }}
{% else -%}
    ## [Unreleased]
{% endif -%}

{% for group, commits in commits | group_by(attribute="group") %}
    ### {{ group | striptags | trim | upper_first }}
    {% for commit in commits %}
        - {{ commit.message | upper_first | trim }}\
          {% if commit.github.username %} by @{{ commit.github.username }}{%- endif -%}
          {% if commit.github.pr_number %} in \
            [#{{ commit.github.pr_number }}]({{ self::remote_url() }}/pull/{{ commit.github.pr_number }}) \
          {%- endif -%}
    {% endfor %}
{% endfor %}\n
"""
trim = true
footer = ""

[git]
conventional_commits = true
filter_unconventional = true
split_commits = false
commit_parsers = [
  { message = "^feat", group = "Features" },
  { message = "^fix", group = "Bug Fixes" },
  { message = "^doc", group = "Documentation" },
  { message = "^perf", group = "Performance" },
  { message = "^refactor", group = "Refactoring" },
  { message = "^style", group = "Styling", skip = true },
  { message = "^test", group = "Testing", skip = true },
  { message = "^chore", group = "Miscellaneous", skip = true },
  { message = "^ci", group = "CI", skip = true },
  { message = "^build", group = "Build", skip = true },
]
protect_breaking_commits = false
filter_commits = false
tag_pattern = "v[0-9].*"
skip_tags = ""
ignore_tags = ""
topo_order = false
sort_commits = "oldest"
```

**Step 2: Commit**

```bash
git add cliff.toml
git commit -m "chore: add git-cliff configuration"
```

---

### Task 5: Generate CHANGELOG.md and add changelog script

**Files:**
- Create: `CHANGELOG.md` (generated)
- Modify: `package.json:7-12` (add changelog script)

**Step 1: Install git-cliff locally**

Run:
```bash
brew install git-cliff
```

If brew is unavailable, use:
```bash
cargo install git-cliff
```

**Step 2: Generate the changelog from existing history**

Run:
```bash
git cliff --output CHANGELOG.md
```

**Step 3: Verify the changelog looks correct**

Read `CHANGELOG.md` and confirm it groups commits by version tag (`v0.1.0` through `v0.2.2`) with appropriate categories.

**Step 4: Add changelog script to package.json**

Add to the scripts block in `package.json`:
```json
"changelog": "git cliff --output CHANGELOG.md"
```

**Step 5: Commit**

```bash
git add CHANGELOG.md package.json
git commit -m "chore: generate initial changelog with git-cliff"
```

---

### Task 6: Replace release-notes job in publish workflow

**Files:**
- Modify: `.github/workflows/publish.yml:145-163` (replace `release-notes` job)

**Step 1: Replace the `release-notes` job**

Replace the entire `release-notes` job (lines 145-163) with:

```yaml
  release-notes:
    needs: publish
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      RELEASE_TAG: ${{ github.ref_name }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Install git-cliff
        uses: orhun/git-cliff-action@v4
        with:
          args: --version
      - name: Generate release notes
        uses: orhun/git-cliff-action@v4
        with:
          args: --latest --strip header
        env:
          OUTPUT: /tmp/release-notes.md
      - name: Update GitHub release
        run: gh release edit "$RELEASE_TAG" --notes-file /tmp/release-notes.md
```

**Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/publish.yml'))"
```
Expected: No errors.

**Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: replace GitHub release notes with git-cliff"
```

---

### Task 7: Update CHANGELOG.md in publish workflow

**Files:**
- Modify: `.github/workflows/publish.yml` (add changelog update to `update-homebrew` job or add new job)

**Step 1: Add changelog update step to the `update-homebrew` job**

In `.github/workflows/publish.yml`, add a step to the `update-homebrew` job (after the existing checkout step on line 129) to regenerate and commit the changelog alongside the Homebrew formula update.

After the "Update Homebrew formula" step, add:
```yaml
      - name: Install git-cliff
        uses: orhun/git-cliff-action@v4
        with:
          args: --version
      - name: Update changelog
        uses: orhun/git-cliff-action@v4
        with:
          args: --output CHANGELOG.md
```

Then update the commit step to also add `CHANGELOG.md`:
```yaml
      - name: Commit and push formula update
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add homebrew/terrarium.rb CHANGELOG.md
          git diff --cached --quiet || git commit -m "chore: update Homebrew formula and changelog for ${GITHUB_REF_NAME}"
          git push
```

**Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/publish.yml'))"
```
Expected: No errors.

**Step 3: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: auto-update CHANGELOG.md on release"
```

---

### Task 8: Verify everything works end-to-end

**Step 1: Test commitlint rejects bad messages**

Run:
```bash
git commit --allow-empty -m "yolo"
```
Expected: FAIL — commitlint rejects.

**Step 2: Test commitlint accepts good messages**

Run:
```bash
echo "feat: test message" | pnpm exec commitlint
echo "fix(bundler): handle edge case" | pnpm exec commitlint
echo "chore!: breaking change" | pnpm exec commitlint
```
Expected: All PASS.

**Step 3: Test changelog generation**

Run:
```bash
pnpm changelog
```
Expected: `CHANGELOG.md` is regenerated with all versions.

**Step 4: Test latest-only generation (simulates release notes)**

Run:
```bash
git cliff --latest --strip header
```
Expected: Shows only changes since the last tag.

**Step 5: Remove any test commits**

If any empty test commits were created, remove them:
```bash
git reset HEAD~1
```
