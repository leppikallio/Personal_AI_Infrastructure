---
name: UsingGitWorktrees
description: Create isolated git worktrees with smart directory selection and safety verification for feature work that needs isolation from current workspace. Systematic directory selection, .gitignore verification, baseline test verification. USE WHEN "create a worktree", "set up isolated workspace", starting feature work needing isolation, before executing implementation plans. Called by brainstorming, pairs with finishing-a-development-branch for cleanup.
---

# Using Git Worktrees

## When to Activate This Skill

**Use this skill when:**
- User says "create a worktree" or "set up isolated workspace"
- User says "create isolated workspace for this feature"
- Starting feature work that needs isolation from current workspace
- Before executing implementation plans in separate workspace
- Called by `brainstorming` (Phase 4) when design approved and implementation follows
- Need to work on multiple branches simultaneously

**This skill pairs with:**
- `finishing-a-development-branch` - REQUIRED for cleanup after work complete
- `executing-plans` or `subagent-driven-development` - Work happens in the worktree

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching.

## Core Philosophy

**Systematic directory selection + Safety verification = Reliable isolation**

This skill implements disciplined worktree creation:

- **Smart Directory Selection:** Priority order (existing > CLAUDE.md > ask user)
- **Safety First:** Always verify .gitignore for project-local directories
- **Broken-Fix Principle:** Add missing .gitignore entries immediately
- **Clean Baseline:** Run tests to ensure worktree starts clean
- **Auto-Detection:** Detect and run appropriate project setup
- **Clear Reporting:** Report location, test status, ready state

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

## 📂 Directory Selection Process

Follow this priority order:

### 1. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 2. Check CLAUDE.md

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

**If preference specified:** Use it without asking.

### 3. Ask User

If no directory exists and no CLAUDE.md preference:

```
No worktree directory found. Where should I create worktrees?

1. .worktrees/ (project-local, hidden)
2. ~/.config/superpowers/worktrees/<project-name>/ (global location)

Which would you prefer?
```

## 🔒 Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify .gitignore before creating worktree:**

```bash
# Check if directory pattern in .gitignore
grep -q "^\.worktrees/$" .gitignore || grep -q "^worktrees/$" .gitignore
```

**If NOT in .gitignore:**

Per "Fix broken things immediately" principle:
1. Add appropriate line to .gitignore
2. Commit the change
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

### For Global Directory (~/.config/superpowers/worktrees)

No .gitignore verification needed - outside project entirely.

## 📋 Creation Steps

### Step 1: Detect Project Name

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### Step 2: Create Worktree

```bash
# Determine full path
case $LOCATION in
  .worktrees|worktrees)
    path="$LOCATION/$BRANCH_NAME"
    ;;
  ~/.config/superpowers/worktrees/*)
    path="~/.config/superpowers/worktrees/$project/$BRANCH_NAME"
    ;;
esac

# Create worktree with new branch
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### Step 3: Run Project Setup

Auto-detect and run appropriate setup:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### Step 4: Verify Clean Baseline

Run tests to ensure worktree starts clean:

```bash
# Examples - use project-appropriate command
npm test
cargo test
pytest
go test ./...
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

### Step 5: Report Location

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## 📊 Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify .gitignore) |
| `worktrees/` exists | Use it (verify .gitignore) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check CLAUDE.md → Ask user |
| Directory not in .gitignore | Add it immediately + commit |
| Tests fail during baseline | Report failures + ask |
| No package.json/Cargo.toml | Skip dependency install |

## 🚫 Common Mistakes

**Skipping .gitignore verification**
- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always grep .gitignore before creating project-local worktree

**Assuming directory location**
- **Problem:** Creates inconsistency, violates project conventions
- **Fix:** Follow priority: existing > CLAUDE.md > ask

**Proceeding with failing tests**
- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

**Hardcoding setup commands**
- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## 📖 Example Workflow

```
You: I'm using the using-git-worktrees skill to set up an isolated workspace.

[Check .worktrees/ - exists]
[Verify .gitignore - contains .worktrees/]
[Create worktree: git worktree add .worktrees/auth -b feature/auth]
[Run npm install]
[Run npm test - 47 passing]

Worktree ready at /Users/jesse/myproject/.worktrees/auth
Tests passing (47 tests, 0 failures)
Ready to implement auth feature
```

## ⚠️ Red Flags

**NEVER:**
- Create worktree without .gitignore verification (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous
- Skip CLAUDE.md check

**ALWAYS:**
- Follow directory priority: existing > CLAUDE.md > ask
- Verify .gitignore for project-local
- Auto-detect and run project setup
- Verify clean test baseline

## Related Skills

**Called by:**
- `brainstorming` - REQUIRED when design is approved and implementation follows (Phase 4)

**Pairs with (Required):**
- `finishing-a-development-branch` - REQUIRED for cleanup after work complete

**Execution in worktree:**
- `executing-plans` - Executes plan in batches within this worktree
- `subagent-driven-development` - Executes plan with fresh subagents within this worktree
- `writing-plans` - Creates plan to execute in this worktree
