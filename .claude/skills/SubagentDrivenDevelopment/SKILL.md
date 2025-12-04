---
name: SubagentDrivenDevelopment
description: Execute implementation plans with independent tasks in current session using fresh subagent per task with code review between tasks. Fast iteration with quality gates. USE WHEN "use subagent-driven development", "dispatch subagents for each task", "execute with fresh subagents per task", staying in current session with mostly independent tasks needing continuous progress. Alternative to executing-plans for same-session execution.
---

# Subagent-Driven Development

## When to Activate This Skill

**Use this skill when:**
- User says "use subagent-driven development"
- User says "dispatch subagents for each task"
- User says "execute with fresh subagents"
- Staying in current session (no context switch needed)
- Tasks are mostly independent
- Want continuous progress with quality gates between tasks
- Have implementation plan ready to execute

**Do NOT use when:**
- Need to review plan first (use `executing-plans` instead)
- Tasks are tightly coupled (manual execution better)
- Plan needs revision (use `brainstorming` first)
- Need human review between tasks (use `executing-plans`)

## Overview

Execute plan by dispatching fresh subagent per task, with code review after each.

**vs. Executing Plans (parallel session):**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Code review after each task (catch issues early)
- Faster iteration (no human-in-loop between tasks)

## Core Philosophy

**Fresh subagent per task + review between tasks = high quality, fast iteration**

This skill implements a disciplined workflow for same-session plan execution:

- **Fresh Context:** Each task gets a clean subagent (no confusion from previous tasks)
- **Quality Gates:** Code review after each task catches issues early
- **Continuous Progress:** No waiting for human review between tasks
- **TDD Integration:** Subagents naturally follow test-driven development
- **Parallel-Safe:** Subagents don't interfere with each other
- **Early Detection:** Issues caught immediately, not at the end

## 📋 The Process

### Step 1: Load Plan

Read plan file, create TodoWrite with all tasks.

### Step 2: Execute Task with Subagent

For each task:

**Dispatch fresh subagent:**
```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].

    Read that task carefully. Your job is to:
    1. Implement exactly what the task specifies
    2. Write tests (following TDD if task says to)
    3. Verify implementation works
    4. Commit your work
    5. Report back

    Work from: [directory]

    Report: What you implemented, what you tested, test results, files changed, any issues
```

**Subagent reports back** with summary of work.

### Step 3: Review Subagent's Work

**Dispatch code-reviewer subagent:**
```
Task tool (code-reviewer or general-purpose):
  Use requesting-code-review pattern

  WHAT_WAS_IMPLEMENTED: [from subagent's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment

### Step 4: Apply Review Feedback

**If issues found:**
- Fix Critical issues immediately
- Fix Important issues before next task
- Note Minor issues

**Dispatch follow-up subagent if needed:**
```
"Fix issues from code review: [list issues]"
```

### Step 5: Mark Complete, Next Task

- Mark task as completed in TodoWrite
- Move to next task
- Repeat steps 2-5

### Step 6: Final Review

After all tasks complete, dispatch final code-reviewer:
- Reviews entire implementation
- Checks all plan requirements met
- Validates overall architecture

### Step 7: Complete Development

After final review passes:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use `finishing-a-development-branch`
- Follow that skill to verify tests, present options, execute choice

## 📖 Example Workflow

```
You: I'm using Subagent-Driven Development to execute this plan.

[Load plan, create TodoWrite]

Task 1: Hook installation script

[Dispatch implementation subagent]
Subagent: Implemented install-hook with tests, 5/5 passing

[Get git SHAs, dispatch code-reviewer]
Reviewer: Strengths: Good test coverage. Issues: None. Ready.

[Mark Task 1 complete]

Task 2: Recovery modes

[Dispatch implementation subagent]
Subagent: Added verify/repair, 8/8 tests passing

[Dispatch code-reviewer]
Reviewer: Strengths: Solid. Issues (Important): Missing progress reporting

[Dispatch fix subagent]
Fix subagent: Added progress every 100 conversations

[Verify fix, mark Task 2 complete]

...

[After all tasks]
[Dispatch final code-reviewer]
Final reviewer: All requirements met, ready to merge

Done!
```

## ⚡ Advantages

**vs. Manual execution:**
- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Parallel-safe (subagents don't interfere)

**vs. Executing Plans:**
- Same session (no handoff)
- Continuous progress (no waiting)
- Review checkpoints automatic

**Cost:**
- More subagent invocations
- But catches issues early (cheaper than debugging later)

## ⚠️ Red Flags

**NEVER:**
- Skip code review between tasks
- Proceed with unfixed Critical issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Implement without reading plan task

**If subagent fails task:**
- Dispatch fix subagent with specific instructions
- Don't try to fix manually (context pollution)

## Related Skills

**Required workflow skills:**
- `writing-plans` - REQUIRED: Creates the plan that this skill executes
- `requesting-code-review` - REQUIRED: Review after each task (Step 3)
- `finishing-a-development-branch` - REQUIRED: Complete development after all tasks (Step 7)

**Subagents should use:**
- `tdd` - Subagents follow TDD for each task

**Alternative workflows:**
- `executing-plans` - Use for parallel session with human review between batches instead of same-session execution

**Complementary skills:**
- `brainstorming` - Use before this skill if plan needs refinement
- `root-cause-tracing` - Use when subagents hit blockers
- `systematic-debugging` - Use when tests fail repeatedly
