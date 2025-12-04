---
description: "Research Phase 2: Launch agents, collect results, validate citations (called by /conduct-research-adaptive)"
globs: ""
alwaysApply: false
---

# Research Collection Phase (Orchestrator)

**This command is called by /conduct-research-adaptive orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Orchestrate research collection through sub-commands:
1. `/_research-collect-execute` - Launch agents, collect results, pivot analysis, source quality
2. `/_research-collect-validate` - Citation validation and hallucination tracking

**Note:** Sub-commands are prefixed with `_` to indicate they are internal.

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path (passed as argument: $1)
- `$SESSION_DIR/analysis/query-analysis.json` - Query analysis with perspectives
- `$SESSION_DIR/analysis/track-allocation.json` - Track assignments
- `WAVE1_COUNT` - Number of Wave 1 agents to launch

## Phase Output

After completing this phase:
- `$SESSION_DIR/wave-1/*.md` - All Wave 1 agent research outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 specialist outputs (if pivot occurred)
- `$SESSION_DIR/analysis/*.md` - Quality scores, signals, gaps, pivot decision
- `$SESSION_DIR/analysis/validated-citations-pool.md` - Citations approved for synthesis
- `$SESSION_DIR/analysis/hallucination-report.md` - Fabricated citation tracking

**Return to orchestrator:** "Collection complete" with citation count and validation stats

---

## ORCHESTRATION WORKFLOW

### Sub-Phase 1: Execute (SlashCommand: /_research-collect-execute)

```
SlashCommand: /_research-collect-execute $SESSION_DIR
```

**What it does:**
- Launches Wave 1 exploration agents (4-6 agents based on complexity)
- Validates and scores Wave 1 results
- Analyzes for pivots (domain signals, coverage gaps, quality scores)
- Evaluates source quality (M10 framework)
- Conditionally launches Wave 2 specialists (0-8 agents)

**Quality Gate (after /_research-collect-execute completes):**
- [ ] Wave 1 files exist in `$SESSION_DIR/wave-1/`
- [ ] Analysis files exist (quality-scores.md, domain-signals.md, pivot-decision.md)
- [ ] Source quality report exists
- [ ] Wave 2 files exist (if pivot triggered)

**If gate fails:**
- If Wave 1 files missing: Re-run /_research-collect-execute
- If analysis missing: Proceed with warnings, note in synthesis

**Extract from output:**
- Wave 1 agent count
- Wave 2 agent count (or "skipped")
- Pivot decision rationale
- Quality gate status

---

### Sub-Phase 2: Validate (SlashCommand: /_research-collect-validate)

```
SlashCommand: /_research-collect-validate $SESSION_DIR
```

**What it does:**
- Extracts all citations from Wave 1 and Wave 2 outputs
- Validates URL accessibility and content accuracy
- Generates validated citation pool for synthesis
- Tracks hallucinated/invalid citations by agent

**Quality Gate (after /_research-collect-validate completes):**
- [ ] Citation validation report exists
- [ ] Validated citations pool exists
- [ ] Total validated citations ≥ 50
- [ ] Invalid citation rate < 20%

**If gate fails:**
- If citation count < 50: Note as "limited sources" but continue
- If invalid rate > 20%: Re-validate or proceed with warnings

**Extract from output:**
- Total citations count
- Valid/invalid citation counts
- Validation rate percentage

---

## PHASE COMPLETE

After both sub-phases complete:

**Report back to orchestrator:**
```
COLLECTION PHASE COMPLETE
Wave 1 Agents: [count]
Wave 2 Specialists: [count or "skipped"]
Total Citations: [count]
Validated Citations: [count] (use in synthesis)
Invalid Citations: [count] (DO NOT use)
Quality Gate: [passed/failed with warnings]
```

The orchestrator will then call `/_research-synthesize` with the SESSION_DIR.

---

## M13.1 Architecture Note

This file is the **thin orchestrator** for research collection (M13.1).
The actual implementation is in:
- `/_research-collect-execute` (~1,250 lines) - Steps 1, 2, 2a, 2.5, 2.6, 3.5
- `/_research-collect-validate` (~350 lines) - Step 2.7

**Why split?**
- Original research-collect.md was 1,590 lines (~47KB)
- Context efficiency: Each sub-phase loads only its instructions
- Modularity: Sub-phases can be re-run independently
- Content preservation: ZERO content loss, just reorganized

**Version:** M13.1 - Research-Collect Split (2025-11-28)
