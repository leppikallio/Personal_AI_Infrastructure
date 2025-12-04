---
name: WritingPlans
description: Create comprehensive implementation plans with exact file paths, complete code examples, and bite-sized verification steps for engineers with zero codebase context. Assumes skilled developer with minimal domain knowledge. USE WHEN "write a plan", "create implementation plan", "plan this feature", design is complete and need detailed tasks for execution. REQUIRED by subagent-driven-development and executing-plans.
---

# Writing Plans

## When to Activate This Skill

**Use this skill when:**
- User says "write a plan" or "create implementation plan"
- User says "plan this feature" or "create a plan for this"
- Design is complete and need detailed implementation tasks
- About to implement complex feature and want structured approach
- Need to hand off work to engineer with minimal context
- Called before `executing-plans` or `subagent-driven-development`

**This skill is REQUIRED for:**
- `subagent-driven-development` - Creates the plan that skill executes
- `executing-plans` - Creates the plan that skill executes in batches

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

## Core Philosophy

**Bite-sized tasks + Complete examples + Zero assumptions = Successful execution**

This skill implements detailed planning for successful handoff:

- **Zero Context Assumption:** Engineer knows nothing about codebase or domain
- **Exact Specifications:** Complete file paths, exact commands, expected output
- **Complete Code:** Full code examples, not "add validation" hand-waving
- **Bite-Sized Steps:** Each step is 2-5 minutes (write test, run test, implement, verify, commit)
- **TDD Always:** Every task follows test-driven development pattern
- **Frequent Commits:** Commit after each passing test
- **DRY & YAGNI:** Don't repeat yourself, you aren't gonna need it

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## 📏 Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## 📋 Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## 📝 Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## ✅ Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills when needed
- DRY, YAGNI, TDD, frequent commits
- Each task should be 2-5 minutes per step
- Assume engineer knows nothing about our codebase

## 🚀 Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `docs/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use `subagent-driven-development`
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses `executing-plans`

## Related Skills

**Execution skills (Required):**
- `executing-plans` - Executes plan in batches with review checkpoints (parallel session)
- `subagent-driven-development` - Executes plan with fresh subagent per task (same session)

**Planning context:**
- `brainstorming` - Use before this skill to create worktree and design approach

**Completion:**
- `finishing-a-development-branch` - Used by execution skills after plan complete

**Testing:**
- `tdd` - Engineers/subagents follow this when executing plan tasks
