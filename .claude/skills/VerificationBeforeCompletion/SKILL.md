---
name: VerificationBeforeCompletion
description: Require running verification commands and confirming output BEFORE making ANY success claims, committing, or creating PRs. Evidence before assertions, always. USE WHEN about to claim work complete, fixed, or passing. Iron law - NO completion claims without fresh verification evidence. Dishonesty prevention through mandatory verification.
---

# Verification Before Completion

## When to Activate This Skill

**Use this skill ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction ("Great!", "Perfect!", "Done!")
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**This skill prevents:**
- False completion claims
- Unverified success assertions
- Trust violations with user
- Shipping broken code
- Wasted rework time

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Violating the letter of this rule is violating the spirit of this rule.**

## Core Philosophy

**Evidence before claims, always = Trust and quality maintained**

This skill implements mandatory verification:

- **No Shortcuts:** Run full verification command fresh, every time
- **Evidence Required:** Output must confirm the claim before making it
- **No Assumptions:** Confidence ≠ evidence, "should work" ≠ verification
- **No Exceptions:** Not "just this once", not when tired, never
- **Spirit Over Letter:** Different wording doesn't bypass the rule
- **Fresh Verification:** Previous runs don't count, must be in current context
- **Full Command:** Partial checks prove nothing

## ⚖️ The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## 🚪 The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## 📋 Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## 🚨 Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## 🛡️ Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## ✅ Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## 💡 Why This Matters

From failure memories:
- User said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## 📖 When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## ⚠️ The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

## Related Skills

**Pairs with:**
- `executing-plans` - Apply this before marking tasks complete
- `subagent-driven-development` - Apply this after each subagent completes
- `finishing-a-development-branch` - Apply this at Step 1 (Verify Tests)
- `requesting-code-review` - Apply this before claiming review issues fixed

**Complementary:**
- `tdd` - Red-green cycle requires verification at each step
- `systematic-debugging` - Verify bug fixed before closing investigation
