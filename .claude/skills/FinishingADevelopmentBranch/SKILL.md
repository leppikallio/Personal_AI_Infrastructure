---
name: FinishingADevelopmentBranch
description: Complete development work when implementation is done and tests pass. Verifies tests, presents structured options (merge locally, create PR, keep as-is, discard), executes choice, cleans up worktree. USE WHEN "finish this work", "complete this branch", "what should I do with this branch", implementation complete and need to integrate work. Called by executing-plans and subagent-driven-development after all tasks complete.
---

# Finishing a Development Branch

## When to Activate This Skill

**Use this skill when:**
- User says "finish this work" or "complete this branch"
- User says "what should I do with this branch"
- Implementation is complete and all tests pass
- Need to decide how to integrate the work (merge, PR, keep, discard)
- Called by `executing-plans` (Step 5) after all batches complete
- Called by `subagent-driven-development` (Step 7) after all tasks complete

**This skill is REQUIRED by:**
- `executing-plans` - Must use after completing all tasks
- `subagent-driven-development` - Must use after final review passes

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

## Core Philosophy

**Verify tests → Present options → Execute choice → Clean up.**

This skill implements a disciplined workflow for completing development branches:

- **Test Verification First:** Always verify tests pass before offering integration options
- **Structured Options:** Present exactly 4 clear choices (no ambiguity)
- **Safety Gates:** Require explicit confirmation for destructive actions
- **Worktree Management:** Clean up appropriately based on chosen option
- **No Broken Merges:** Verify tests on merged result before completing
- **User Choice:** Let user decide integration strategy (don't assume)

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

## 📋 The Process

### Step 1: Verify Tests

**Before presenting options, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot proceed with merge/PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 2.

### Step 2: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Or ask: "This branch split from main - is that correct?"

### Step 3: Present Options

Present exactly these 4 options:

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

**Don't add explanation** - keep options concise.

### Step 4: Execute Choice

#### Option 1: Merge Locally

```bash
# Switch to base branch
git checkout <base-branch>

# Pull latest
git pull

# Merge feature branch
git merge <feature-branch>

# Verify tests on merged result
<test command>

# If tests pass
git branch -d <feature-branch>
```

Then: Cleanup worktree (Step 5)

#### Option 2: Push and Create PR

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```

Then: Cleanup worktree (Step 5)

#### Option 3: Keep As-Is

Report: "Keeping branch <name>. Worktree preserved at <path>."

**Don't cleanup worktree.**

#### Option 4: Discard

**Confirm first:**
```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation.

If confirmed:
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```

Then: Cleanup worktree (Step 5)

### Step 5: Cleanup Worktree

**For Options 1, 2, 4:**

Check if in worktree:
```bash
git worktree list | grep $(git branch --show-current)
```

If yes:
```bash
git worktree remove <worktree-path>
```

**For Option 3:** Keep worktree.

## 📊 Quick Reference

| Option | Merge | Push | Keep Worktree | Cleanup Branch |
|--------|-------|------|---------------|----------------|
| 1. Merge locally | ✓ | - | - | ✓ |
| 2. Create PR | - | ✓ | ✓ | - |
| 3. Keep as-is | - | - | ✓ | - |
| 4. Discard | - | - | - | ✓ (force) |

## 🚫 Common Mistakes

**Skipping test verification**
- **Problem:** Merge broken code, create failing PR
- **Fix:** Always verify tests before offering options

**Open-ended questions**
- **Problem:** "What should I do next?" → ambiguous
- **Fix:** Present exactly 4 structured options

**Automatic worktree cleanup**
- **Problem:** Remove worktree when might need it (Option 2, 3)
- **Fix:** Only cleanup for Options 1 and 4

**No confirmation for discard**
- **Problem:** Accidentally delete work
- **Fix:** Require typed "discard" confirmation

## ⚠️ Red Flags

**NEVER:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**ALWAYS:**
- Verify tests before offering options
- Present exactly 4 options (no more, no less)
- Get typed confirmation for Option 4
- Clean up worktree for Options 1 & 4 only

## Related Skills

**Called by (Required):**
- `executing-plans` - Calls this at Step 5 after all batches complete
- `subagent-driven-development` - Calls this at Step 7 after all tasks complete

**Pairs with:**
- `using-git-worktrees` - Cleans up worktrees created by that skill

**Complementary skills:**
- `requesting-code-review` - Use before this skill if work needs review
- `verification-before-completion` - Additional verification patterns
