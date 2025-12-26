---
description: "Research Phase 2: Launch agents, collect results, validate citations (called by /conduct-research-adaptive)"
globs: ""
alwaysApply: false
---

# Research Collection Phase (Orchestrator)

**This command is called by /conduct-research-adaptive orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Orchestrate research collection through sub-commands with marker-based gates:
1. `/_research-collect-wave1` - Launch Wave 1 agents with perspectives
2. `/_research-collect-wait` - Wait for ALL agents (no bailout)
3. `/_research-collect-pivot` - Quality analysis + pivot decision
4. `/_research-collect-wave2` - Launch Wave 2 specialists (if pivot triggered)
5. `/_research-collect-validate` - Citation validation and hallucination tracking

**Note:** Sub-commands are prefixed with `_` to indicate they are internal.

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path (passed as argument: $1)
- `$SESSION_DIR/analysis/query-analysis.json` - Query analysis with perspectives
- `$SESSION_DIR/analysis/track-allocation.json` - Track assignments

## Phase Output

After completing this phase:
- `$SESSION_DIR/wave-1/*.md` - All Wave 1 agent research outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 specialist outputs (if pivot occurred)
- `$SESSION_DIR/analysis/*.md` - Quality scores, signals, gaps, pivot decision
- `$SESSION_DIR/analysis/validated-citations-pool.md` - Citations approved for synthesis
- `$SESSION_DIR/analysis/hallucination-report.md` - Fabricated citation tracking
- Phase markers: `.wave1-complete`, `.wave1-validated`, `.pivot-complete`, `.wave2-complete|.wave2-skipped`, `.citations-validated`

**Return to orchestrator:** "Collection complete" with citation count and validation stats

---

## ORCHESTRATION WORKFLOW

**CRITICAL: Execute each sub-phase IN ORDER. Verify phase gate markers before proceeding.**

### STEP 0: Initialize Sub-Phase Tracking (MANDATORY)

**Before executing any sub-phase, set up TodoWrite with all sub-phases visible:**

```typescript
TodoWrite({ todos: [
  { content: "Phase 2: Collect research", status: "in_progress", activeForm: "Collecting research" },
  { content: "  2.1: Launch Wave 1 agents", status: "pending", activeForm: "Launching Wave 1 agents" },
  { content: "  2.2: Wait for all agents", status: "pending", activeForm: "Waiting for agents" },
  { content: "  2.3: Pivot analysis", status: "pending", activeForm: "Running pivot analysis" },
  { content: "  2.4: Wave 2 specialists", status: "pending", activeForm: "Launching Wave 2 specialists" },
  { content: "  2.5: Validate citations", status: "pending", activeForm: "Validating citations" },
]})
```

**Update sub-phase status as you complete each one. User MUST see progress.**

---

### Phase Gate CLI

The phase gate CLI at `${PAI_DIR}/utilities/research-orchestrator/cli.ts` enforces gates:

```bash
# Verify a gate (exit 0 = pass, exit 1 = fail)
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" <phase-name>

# Mark phase complete
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" mark "$SESSION_DIR" <phase-name>

# Check full status
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" status "$SESSION_DIR"
```

---

### Sub-Phase 1: Launch Wave 1 Agents

**Run the Wave 1 launch phase:**

Follow the instructions in `/_research-collect-wave1`. This phase:
- Sanitizes perspectives (security layer)
- Launches all Wave 1 agents in PARALLEL with assigned perspectives
- Each agent gets ONE perspective with track assignment
- Creates `.wave1-launched` marker

**Gate Verification:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" wave1-complete
```

---

### Sub-Phase 2: Wait for ALL Agents (NO BAILOUT)

**CONSTITUTIONAL: Wait for EVERY agent to complete.**

Follow the instructions in `/_research-collect-wait`. This phase:
- Waits for ALL launched agents using AgentOutputTool
- Validates each agent output (length, content, structure)
- Retries failed agents (tool conflicts, empty results)
- Creates `.wave1-complete` marker

**CRITICAL: DO NOT skip waiting for agents. DO NOT proceed until ALL agents complete or explicitly fail.**

**Gate Verification:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" wave1-validated
```

---

### Sub-Phase 3: Pivot Analysis

**Analyze Wave 1 results and decide on Wave 2:**

Follow the instructions in `/_research-collect-pivot`. This phase:
- Runs quality analyzer (automated TypeScript CLI)
- Detects domain signals
- Identifies coverage gaps
- Checks source quality (M10)
- **NEW: Detects missed perspective coverage** (agent slots not executed)
- Makes Wave 2 launch decision
- Creates `.wave1-validated` and `.pivot-complete` markers

**CONSTITUTIONAL: If pivot decision says LAUNCH WAVE 2, you MUST launch Wave 2 (no exceptions).**

**Gate Verification:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" pivot-complete
```

**Read pivot decision:**
```bash
cat "$SESSION_DIR/analysis/wave-1-pivot-decision.json" | jq '.shouldLaunchWave2'
```

---

### Sub-Phase 4: Launch Wave 2 Specialists (Conditional)

**Only if pivot decision says LAUNCH WAVE 2:**

Follow the instructions in `/_research-collect-wave2`. This phase:
- Reads specialist specs from pivot decision
- Launches Wave 2 specialists in PARALLEL
- Waits for Wave 2 completion
- Validates Wave 2 outputs
- Creates `.wave2-complete` marker

**If pivot decision says SKIP WAVE 2:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" skip-wave2 "$SESSION_DIR" "Wave 1 coverage sufficient"
```

**Gate Verification:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" wave2-complete
# OR check for .wave2-skipped marker
```

---

### Sub-Phase 5: Validate Citations (MANDATORY - BLOCKING)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CITATION VALIDATION MUST BE BLOCKING                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DO NOT use run_in_background: true                                     │
│  DO NOT proceed to Phase 3 until validation completes                   │
│  DO NOT launch synthesis while validation runs in background            │
│                                                                          │
│  Hallucinated citations WILL flow into synthesis if you skip this.      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**INVOKE THIS SUB-COMMAND NOW AND WAIT FOR COMPLETION:**

Use the SlashCommand tool to run:
```
/_research-collect-validate $SESSION_DIR
```

**CRITICAL: This is a FOREGROUND operation. You MUST wait for it to complete before proceeding.**

**WARNING: This step is MANDATORY and was being SKIPPED in previous sessions!**

**What it does:**
- Extracts all citations from Wave 1 and Wave 2 outputs
- Validates URL accessibility and content accuracy
- Generates validated citation pool for synthesis
- Tracks hallucinated/invalid citations by agent
- **REMOVES/FLAGS hallucinated citations so they are NOT used in synthesis**
- Creates `.citations-validated` marker

**Quality Gate (after /_research-collect-validate completes):**
- [ ] Citation validation report exists
- [ ] Validated citations pool exists (`validated-citations-pool.md`)
- [ ] Total validated citations >= 50
- [ ] Invalid citation rate < 20%
- [ ] `.citations-validated` marker exists

**Gate Verification (MUST PASS before Phase 3):**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" citations-validated
```

**IF GATE FAILS:** Do NOT proceed to synthesis. Fix citation validation first.

---

## PHASE COMPLETE

After all sub-phases complete:

**Verify all gates passed:**
```bash
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" status "$SESSION_DIR"
```

**Report back to orchestrator:**
```
COLLECTION PHASE COMPLETE
Wave 1 Agents: [count]
Wave 2 Specialists: [count or "skipped"]
Total Citations: [count]
Validated Citations: [count] (use in synthesis)
Invalid Citations: [count] (DO NOT use)
Quality Gate: [passed/failed with warnings]
Phase Markers: [list of markers present]
```

The orchestrator will then call `/_research-synthesize` with the SESSION_DIR.

---

## M13.2 Architecture Note

This file is the **thin orchestrator** for research collection (M13.2).
The actual implementation is split into 5 phases:
- `/_research-collect-wave1` - Launch Wave 1 agents
- `/_research-collect-wait` - Wait for ALL agents (no bailout)
- `/_research-collect-pivot` - Quality analysis + pivot decision (6 components)
- `/_research-collect-wave2` - Launch Wave 2 specialists
- `/_research-collect-validate` - Citation validation

**Why split further (M13.2 from M13.1)?**
- M13.1 had `_research-collect-execute` at 1,500+ lines - autonomous agent could skip phases
- M13.2 splits into 4 phase files with marker-based gates
- Each phase MUST complete before next begins
- Phase gate CLI enforces ordering
- New "missed coverage" trigger in pivot decision

**New in M13.2:**
- Marker-based phase gates (TypeScript CLI)
- 6-component pivot decision (added missed coverage)
- NO BAILOUT rule in wait phase
- Explicit model: "sonnet" for all researcher agents

**Version:** M13.2 - Marker-Based Phase Gates (2025-12-26)
