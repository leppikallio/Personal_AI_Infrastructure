---
name: DispatchingParallelAgents
description: Dispatch multiple agents to investigate and fix 3+ independent failures concurrently. USE WHEN "dispatch parallel agents", "investigate these failures in parallel", facing 3+ independent failures (different test files, subsystems, bugs) without shared state or dependencies. One agent per independent problem domain working concurrently. 3 problems solved in time of 1.
---

# Dispatching Parallel Agents

## When to Activate This Skill

**Use when:**
- User says "dispatch parallel agents" or "investigate these in parallel"
- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

**Don't use when:**
- Failures are related (fix one might fix others)
- Need to understand full system state
- Agents would interfere with each other (shared files/resources)
- Exploratory debugging (don't know what's broken yet)
- Less than 3 independent failures (not worth overhead)

## Overview

When you have multiple unrelated failures (different test files, different subsystems, different bugs), investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

## Core Philosophy

**One agent per independent problem domain + Concurrent execution = 3 problems solved in time of 1**

This skill implements efficient parallel investigation:

- **Independence Required:** Each problem can be understood without others
- **No Shared State:** Agents don't interfere with each other
- **Focused Scope:** One agent per clear problem domain
- **Specific Output:** Each agent returns summary of findings and fixes
- **Integration Review:** Verify no conflicts between agent changes
- **Speed Multiplier:** N problems solved in time of 1

## 📊 Decision Flow

```
Multiple failures?
  ↓ yes
Are they independent? (no shared context needed)
  ↓ yes (unrelated)      ↓ no (related)
Can work in parallel? → Single agent investigates all
  ↓ yes (no conflicts)   ↓ no (shared state)
PARALLEL DISPATCH   →  Sequential agents
```

## 📋 The Pattern

### Step 1: Identify Independent Domains

Group failures by what's broken:
- File A tests: Tool approval flow
- File B tests: Batch completion behavior
- File C tests: Abort functionality

Each domain is independent - fixing tool approval doesn't affect abort tests.

### Step 2: Create Focused Agent Tasks

Each agent gets:
- **Specific scope:** One test file or subsystem
- **Clear goal:** Make these tests pass
- **Constraints:** Don't change other code
- **Expected output:** Summary of what you found and fixed

### Step 3: Dispatch in Parallel

```typescript
// Launch all agents in SINGLE message with multiple Task tool calls
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
// All three run concurrently
```

### Step 4: Review and Integrate

When agents return:
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## 📝 Agent Prompt Structure

Good agent prompts are:
1. **Focused** - One clear problem domain
2. **Self-contained** - All context needed to understand the problem
3. **Specific about output** - What should the agent return?

**Example:**
```markdown
Fix the 3 failing tests in src/agents/agent-tool-abort.test.ts:

1. "should abort tool with partial output capture" - expects 'interrupted at' in message
2. "should handle mixed completed and aborted tools" - fast tool aborted instead of completed
3. "should properly track pendingToolCount" - expects 3 results but gets 0

These are timing/race condition issues. Your task:

1. Read the test file and understand what each test verifies
2. Identify root cause - timing issues or actual bugs?
3. Fix by:
   - Replacing arbitrary timeouts with event-based waiting
   - Fixing bugs in abort implementation if found
   - Adjusting test expectations if testing changed behavior

Do NOT just increase timeouts - find the real issue.

Return: Summary of what you found and what you fixed.
```

## 🚫 Common Mistakes

**❌ Too broad:** "Fix all the tests" - agent gets lost
**✅ Specific:** "Fix agent-tool-abort.test.ts" - focused scope

**❌ No context:** "Fix the race condition" - agent doesn't know where
**✅ Context:** Paste the error messages and test names

**❌ No constraints:** Agent might refactor everything
**✅ Constraints:** "Do NOT change production code" or "Fix tests only"

**❌ Vague output:** "Fix it" - you don't know what changed
**✅ Specific:** "Return summary of root cause and changes"

## ⚠️ When NOT to Use

**Related failures:** Fixing one might fix others - investigate together first
**Need full context:** Understanding requires seeing entire system
**Exploratory debugging:** You don't know what's broken yet
**Shared state:** Agents would interfere (editing same files, using same resources)

## 📖 Real Example

**Scenario:** 6 test failures across 3 files after major refactoring

**Failures:**
- agent-tool-abort.test.ts: 3 failures (timing issues)
- batch-completion-behavior.test.ts: 2 failures (tools not executing)
- tool-approval-race-conditions.test.ts: 1 failure (execution count = 0)

**Decision:** Independent domains - abort logic separate from batch completion separate from race conditions

**Dispatch:**
```
Agent 1 → Fix agent-tool-abort.test.ts
Agent 2 → Fix batch-completion-behavior.test.ts
Agent 3 → Fix tool-approval-race-conditions.test.ts
```

**Results:**
- Agent 1: Replaced timeouts with event-based waiting
- Agent 2: Fixed event structure bug (threadId in wrong place)
- Agent 3: Added wait for async tool execution to complete

**Integration:** All fixes independent, no conflicts, full suite green

**Time saved:** 3 problems solved in parallel vs sequentially

## ⚡ Key Benefits

1. **Parallelization** - Multiple investigations happen simultaneously
2. **Focus** - Each agent has narrow scope, less context to track
3. **Independence** - Agents don't interfere with each other
4. **Speed** - 3 problems solved in time of 1

## ✅ Verification

After agents return:
1. **Review each summary** - Understand what changed
2. **Check for conflicts** - Did agents edit same code?
3. **Run full suite** - Verify all fixes work together
4. **Spot check** - Agents can make systematic errors

## 📈 Real-World Impact

From debugging session:
- 6 failures across 3 files
- 3 agents dispatched in parallel
- All investigations completed concurrently
- All fixes integrated successfully
- Zero conflicts between agent changes

## Related Skills

**Pairs with:**
- `systematic-debugging` - Each agent should follow this for their problem
- `condition-based-waiting` - Common fix agents discover for timing issues
- `verification-before-completion` - Each agent should verify their fix

**Complementary:**
- `subagent-driven-development` - Similar parallel pattern but for tasks not bugs
- `executing-plans` - Can use parallel agents for independent tasks in plan
