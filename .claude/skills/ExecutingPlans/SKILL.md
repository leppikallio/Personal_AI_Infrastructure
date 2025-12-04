---
name: ExecutingPlans
description: Execute implementation plans in controlled batches with critical review checkpoints. Loads plan, reviews critically, executes tasks in batches (default 3), reports for review between batches. USE WHEN partner provides complete implementation plan, "execute this plan", "run through these steps", or when you have detailed task list to execute in controlled phases. References finishing-a-development-branch for completion.
---

# Executing Plans

## When to Activate This Skill
- Partner provides complete implementation plan to execute
- User says "execute this plan" or "implement this plan"
- User says "run through these steps in batches"
- Architect/planner provides detailed step-by-step plan
- Need to execute tasks with review checkpoints between batches
- Have detailed task list that requires controlled phase execution

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

## Core Philosophy

This skill implements **batch execution with checkpoints** - a disciplined approach to executing complex plans:

- **Critical Review First:** Identify gaps/concerns before starting
- **Controlled Batches:** Default to 3 tasks per batch (configurable on request)
- **Stop on Blockers:** Never force through - ask for help immediately
- **Checkpoint Reports:** Show verification output between batches
- **Reference Sub-Skills:** Follow plan instructions to invoke related skills

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## 📋 The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Batch
**Default: First 3 tasks** (configurable - user can request different batch sizes)

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Report
When batch complete:
- Show what was implemented
- Show verification output
- Say: "Ready for feedback."

### Step 4: Continue
Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## ⚠️ When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker mid-batch (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## 🔄 When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Related Skills
- `finishing-a-development-branch` - REQUIRED sub-skill for Step 5 completion
- `root-cause-tracing` - Use when hitting blockers mid-batch
- `systematic-debugging` - Use when verification fails repeatedly
- `writing-clearly-and-concisely` - For clear batch reporting

## Remember
- Review plan critically first - raise concerns before starting
- Follow plan steps exactly - they're designed to be bite-sized
- Don't skip verifications - they catch issues early
- Reference skills when plan says to - they're there for a reason
- Between batches: just report and wait - don't continue without feedback
- Stop when blocked, don't guess - ask for help immediately
- Batch size is configurable - ask if default (3 tasks) doesn't fit the context
