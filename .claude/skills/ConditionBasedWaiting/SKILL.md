---
name: ConditionBasedWaiting
description: Replace arbitrary timeouts with condition polling to eliminate flaky tests from timing guesses. Wait for actual state changes, not time guesses. USE WHEN "tests have race conditions", "timing dependencies", "inconsistent pass/fail", "flaky tests", writing tests with setTimeout/sleep, or seeing tests fail under load/CI but pass locally. Eliminates race conditions completely.
---

# Condition-Based Waiting

## When to Activate This Skill

**Use when:**
- Tests have arbitrary delays (`setTimeout`, `sleep`, `time.sleep()`)
- Tests are flaky (pass sometimes, fail under load)
- Tests timeout when run in parallel
- Waiting for async operations to complete
- Tests pass locally but fail in CI
- User says "flaky tests", "race conditions", "timing issues"
- Writing tests that depend on async state changes

**Don't use when:**
- Testing actual timing behavior (debounce, throttle intervals)
- If using arbitrary timeout, ALWAYS document WHY

## Overview

Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load or in CI.

## Core Philosophy

**Wait for actual condition + Poll for state changes = Zero race conditions**

This skill implements reliable async testing:

- **Condition-Based:** Wait for what you care about, not how long it takes
- **No Guessing:** No arbitrary timeouts like 50ms, 100ms, 1000ms
- **Fast Feedback:** Polls every 10ms, completes as soon as condition met
- **Safe Timeout:** Always includes max timeout with clear error message
- **Fresh Data:** Calls getter inside loop, never caches stale state
- **Documented Exceptions:** When arbitrary timeout IS needed, explain WHY

## 🎯 When to Use - Decision Flow

```
Test uses setTimeout/sleep?
  ↓ yes
Testing timing behavior? (debounce, throttle)
  ↓ yes                    ↓ no
Document WHY timeout    Use condition-based
needed                  waiting
```

**Quick check:**
- If you see `setTimeout`, `sleep`, or arbitrary delays → Use this skill
- If timeout is for actual behavior testing → Document WHY

## 📋 Core Pattern

```typescript
// ❌ BEFORE: Guessing at timing
await new Promise(r => setTimeout(r, 50));
const result = getResult();
expect(result).toBeDefined();

// ✅ AFTER: Waiting for condition
await waitFor(() => getResult() !== undefined);
const result = getResult();
expect(result).toBeDefined();
```

**Why this works:**
- Completes immediately when condition met (could be 5ms or 500ms)
- No race conditions - always waits for actual state
- Clear error if condition never met
- Fast on all machines regardless of speed

## 📊 Quick Patterns

| Scenario | Pattern |
|----------|---------|
| Wait for event | `waitFor(() => events.find(e => e.type === 'DONE'))` |
| Wait for state | `waitFor(() => machine.state === 'ready')` |
| Wait for count | `waitFor(() => items.length >= 5)` |
| Wait for file | `waitFor(() => fs.existsSync(path))` |
| Complex condition | `waitFor(() => obj.ready && obj.value > 10)` |

## ⚡ Implementation

Generic polling function:
```typescript
async function waitFor<T>(
  condition: () => T | undefined | null | false,
  description: string,
  timeoutMs = 5000
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    const result = condition();
    if (result) return result;

    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for ${description} after ${timeoutMs}ms`);
    }

    await new Promise(r => setTimeout(r, 10)); // Poll every 10ms
  }
}
```

**Domain-specific helpers:**
```typescript
// Wait for specific event
async function waitForEvent(manager, eventType: string) {
  return waitFor(
    () => manager.events.find(e => e.type === eventType),
    `event ${eventType}`
  );
}

// Wait for event count
async function waitForEventCount(manager, count: number) {
  return waitFor(
    () => manager.events.length >= count ? manager.events : undefined,
    `${count} events`
  );
}

// Wait for event matching predicate
async function waitForEventMatch(manager, predicate: (e) => boolean) {
  return waitFor(
    () => manager.events.find(predicate),
    'matching event'
  );
}
```

## 🚫 Common Mistakes

**❌ Polling too fast:** `setTimeout(check, 1)` - wastes CPU
**✅ Fix:** Poll every 10ms (good balance of responsiveness and CPU)

**❌ No timeout:** Loop forever if condition never met
**✅ Fix:** Always include timeout with clear error message

**❌ Stale data:** Cache state before loop
**✅ Fix:** Call getter inside loop for fresh data every check

**❌ Guessing at timing:** "Maybe 100ms is enough?"
**✅ Fix:** Wait for actual condition, not time

## ⚠️ When Arbitrary Timeout IS Correct

```typescript
// Tool ticks every 100ms - need 2 ticks to verify partial output
await waitForEvent(manager, 'TOOL_STARTED'); // First: wait for condition
await new Promise(r => setTimeout(r, 200));   // Then: wait for timed behavior
// 200ms = 2 ticks at 100ms intervals - documented and justified
```

**Requirements for justified arbitrary timeout:**
1. First wait for triggering condition (ensure system is in right state)
2. Based on known timing (not guessing - know the tick interval)
3. Comment explaining WHY (so future readers understand)

**Rule:** Arbitrary timeout must follow condition wait, never replace it

## 📈 Real-World Impact

From debugging session (2025-10-03):
- Fixed 15 flaky tests across 3 files
- Pass rate: 60% → 100%
- Execution time: 40% faster (no waiting longer than needed)
- No more race conditions
- Tests now reliable in CI and under load

## Related Skills

**Complementary:**
- `tdd` - Use condition-based waiting when writing tests
- `testing-anti-patterns` - Arbitrary timeouts are an anti-pattern
- `systematic-debugging` - Use this when debugging flaky tests

**Pairs with:**
- `dispatching-parallel-agents` - Each agent should use this when writing tests
- `executing-plans` - Apply this when plan includes test writing
