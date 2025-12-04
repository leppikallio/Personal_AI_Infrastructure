---
name: RequestingCodeReview
description: Dispatch code-reviewer subagent to verify work meets requirements before proceeding. Review early, review often. USE WHEN "request code review", "review my code", completing tasks, implementing major features, before merging. REQUIRED by subagent-driven-development (after each task) and executing-plans (after each batch). Catches issues before they cascade.
---

# Requesting Code Review

## When to Activate This Skill

**Use this skill when:**
- User says "request code review" or "review my code"
- User says "check if this implementation is correct"
- Completing tasks in subagent-driven development (REQUIRED after each task)
- Completing batches in executing-plans (REQUIRED after each batch)
- Completing major feature before merging
- Before merge to main branch

**Optional but valuable:**
- When stuck (fresh perspective helps)
- Before refactoring (baseline check)
- After fixing complex bug (verify fix is correct)

## Overview

Dispatch code-reviewer subagent to catch issues before they cascade.

## Core Philosophy

**Review early, review often = Catch issues before they compound**

This skill implements systematic code review:

- **Early Detection:** Catch issues immediately after implementation
- **Quality Gates:** Required checkpoints in workflows
- **Fresh Perspective:** Subagent provides unbiased review
- **Actionable Feedback:** Critical/Important/Minor categorization
- **Fix Immediately:** Critical issues must be fixed before proceeding
- **Technical Dialogue:** Push back on incorrect feedback with reasoning

## 📋 When to Request Review

**Mandatory:**
- After each task in `subagent-driven-development`
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## 🔍 How to Request

### Step 1: Get Git SHAs

```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

### Step 2: Dispatch Code-Reviewer Subagent

Use Task tool with general-purpose or code-reviewer agent type:

**Required information:**
- `WHAT_WAS_IMPLEMENTED` - What you just built
- `PLAN_OR_REQUIREMENTS` - What it should do (reference task/plan)
- `BASE_SHA` - Starting commit
- `HEAD_SHA` - Ending commit
- `DESCRIPTION` - Brief summary

**Example prompt:**
```
Review the code changes between {BASE_SHA} and {HEAD_SHA}.

What was implemented: {WHAT_WAS_IMPLEMENTED}

Requirements/Plan: {PLAN_OR_REQUIREMENTS}

Provide:
1. Strengths of the implementation
2. Issues (categorized as Critical/Important/Minor)
3. Assessment (ready to proceed or needs fixes)
```

### Step 3: Act on Feedback

- **Critical issues:** Fix immediately before proceeding
- **Important issues:** Fix before next task
- **Minor issues:** Note for later
- **Incorrect feedback:** Push back with technical reasoning

## 📖 Example Workflow

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code-reviewer subagent]
  WHAT_WAS_IMPLEMENTED: Verification and repair functions for conversation index
  PLAN_OR_REQUIREMENTS: Task 2 from docs/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types

[Subagent returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed after fixing Important issue

You: [Fix progress indicators]
[Continue to Task 3]
```

## 🔗 Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task (REQUIRED)
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each batch (3 tasks typically)
- Get feedback, apply fixes, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## ⚠️ Red Flags

**NEVER:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback without reasoning

**If reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification
- Don't blindly accept incorrect feedback

## Related Skills

**Required by:**
- `subagent-driven-development` - REQUIRED: Review after each task (Step 3)
- `executing-plans` - Recommended: Review after each batch

**Pairs with:**
- `finishing-a-development-branch` - Use before this skill if work complete
- `verification-before-completion` - Additional verification patterns

**Complementary:**
- `systematic-debugging` - Use if review reveals bugs needing investigation
- `root-cause-tracing` - Use if review finds deep issues needing analysis
