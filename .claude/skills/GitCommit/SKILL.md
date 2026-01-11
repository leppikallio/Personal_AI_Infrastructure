---
name: GitCommit
description: Prepare git commits with proper staging, pre-commit checks, and conventional commit messages. USE WHEN user says "commit", "create commit", "prepare commit", OR after completing implementation work that should be committed. Handles YubiKey/SSH signing by preparing everything and handing off to user.
---

# GitCommit - Prepare Commits for Signed Execution

**Purpose:** Prepare git commits when signing requires user interaction (YubiKey SSH/GPG signing with PIN + touch).

## Workflow

### Step 1: Analyze Changes

```bash
# Check current state
git status

# View staged changes
git diff --staged

# View unstaged changes
git diff

# Check recent commit style
git log --oneline -5
```

### Step 2: Detect Pre-commit Hooks

Check for project's pre-commit configuration:

1. **Husky (Node/Bun):** `.husky/pre-commit`
2. **Standard git hooks:** `.git/hooks/pre-commit`
3. **Pre-commit framework:** `.pre-commit-config.yaml`

Read the hook file to identify commands to run.

### Step 3: Stage Relevant Files

```bash
# Stage specific files
git add <files>

# Or stage all changes (use judiciously)
git add -A
```

**Exclusions - NEVER stage:**
- `.env`, `*.env`, `.env.*`
- `credentials.json`, `secrets.*`
- `*.pem`, `*.key`, private keys
- Any file that might contain secrets

### Step 4: Run Fix Commands (Auto-fix)

Run commands that modify files to fix issues:

| Pattern | Example Commands |
|---------|------------------|
| `lint-staged` | `bun run lint-staged`, `npx lint-staged` |
| `format` | `bun run format`, `npm run format` |
| `prettier --write` | Direct prettier with write flag |
| `eslint --fix` | Direct eslint with fix flag |

After running fix commands, re-stage any modified files:
```bash
git add -u  # Re-stage modified tracked files
```

### Step 5: Run Check Commands (Validation)

Run all validation commands - **fail fast if any fails**:

| Check Type | Example Commands |
|------------|------------------|
| **Security** | `gitleaks protect --staged --verbose` |
| **Lint** | `bun run lint`, `npm run lint`, `eslint .` |
| **Format** | `bun run format:check`, `prettier --check` |
| **Types** | `tsc --noEmit`, `bunx astro check` |

**If any check fails:**
1. Report the error to user
2. **STOP** - do not proceed to commit message
3. Suggest fix (e.g., "Run `bun run format` to fix formatting")

### Step 6: Documentation Check (Significant Changes)

**Trigger:** If staged files include any of:
- Files in `src/` that export public APIs (index.ts, main entry points)
- Config files (`*.json` in `config/`)
- Agent prompts (`prompts/*.md`, `agents/*.md`)
- Schema changes (`*.schema.json`)
- Docker/container files (`Dockerfile*`, `docker-compose*`)

**Check:**
1. Identify related documentation in `docs/` or `README.md`
2. Prompt user: "This commit changes [X]. Related docs: [Y]. Update docs?"
3. If yes: pause commit, user updates docs, re-run skill
4. If no: proceed (user accepts doc drift)

**Auto-detect doc-worthy changes:**
```bash
# Check for export changes
git diff --staged --name-only | grep -E '(index\.ts|exports\.ts|mod\.ts)$'

# Check for config/schema changes
git diff --staged --name-only | grep -E '\.(schema\.)?json$' | grep -v 'package'

# Check for container changes
git diff --staged --name-only | grep -E '(Dockerfile|docker-compose)'
```

**Skip if:**
- Commit is `fix:` type (bug fixes rarely need doc updates)
- Commit is `test:` type (tests don't need docs)
- Commit is `style:` type (formatting only)
- Only test files changed (`*.test.ts`, `*.spec.ts`)

### Step 7: Generate Commit Message

**Format: Conventional Commits**

```
<type>(<scope>): <short description>

- <bullet point explaining change>
- <another bullet point>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <MODEL_NAME> <noreply@anthropic.com>
```

**Types:**
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, deps, config |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes bug nor adds feature |
| `test` | Adding or updating tests |
| `style` | Formatting, whitespace (no code change) |
| `perf` | Performance improvement |

**Scope:** Optional, indicates area (e.g., `feat(api):`, `fix(auth):`)

### Step 8: Output for User

Present the commit in this format:

```markdown
## Commit Ready

**Staged files:**
- path/to/file1.ts
- path/to/file2.ts

**Pre-commit checks:** All passed

**Commit message:**
```
feat: Add slug support to CF Stream upload script

- Add optional slug parameter to --single command
- Update video-map.json when slug provided
- Update README with clear documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Run this command:**
```bash
git commit -m "$(cat <<'EOF'
feat: Add slug support to CF Stream upload script

- Add optional slug parameter to --single command
- Update video-map.json when slug provided
- Update README with clear documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

Or use your editor: `git commit` (message will be in clipboard if supported)
```

## Command Detection Patterns

When parsing pre-commit hooks, identify command types:

**Fix Commands (modify files):**
```bash
# Patterns that indicate fix commands
lint-staged
format
prettier --write
eslint --fix
black
autopep8
```

**Check Commands (read-only validation):**
```bash
# Patterns that indicate check commands
gitleaks
lint
check
tsc
astro check
mypy
pytest
test
```

## Error Handling

**If pre-commit checks fail:**
```markdown
## Commit Blocked

**Failed check:** `bun run lint`
**Error:**
```
src/utils/helper.ts:42:5 - error: 'unused' is declared but never used
```

**To fix:**
1. Remove the unused variable
2. Or run: `bun run lint --fix`
3. Then request commit again
```

**If secrets detected:**
```markdown
## Commit Blocked - SECRETS DETECTED

**gitleaks found potential secrets in:**
- `.env.local` (line 3)
- `config/api-keys.json` (line 7)

**Action required:**
1. Remove sensitive files from staging: `git reset HEAD <file>`
2. Add to .gitignore if needed
3. Request commit again
```

## Notes

- This skill prepares everything but does NOT execute `git commit`
- User must run the final commit command (requires YubiKey touch)
- The Co-Authored-By uses the current Claude model name dynamically
- Always verify staged files before presenting commit command
