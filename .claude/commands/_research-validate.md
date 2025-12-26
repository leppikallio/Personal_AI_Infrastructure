---
description: "Research Phase 4: Validate synthesis quality, citation density, and utilization (called by /conduct-research-adaptive)"
globs: ""
alwaysApply: false
---

# Research Validation Phase

**This command is called by /conduct-research-adaptive orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Validate synthesis quality by:
1. Verifying synthesis output exists and meets size requirements
2. Validating 60%+ citation utilization
3. Checking six-part structure completeness
4. Validating citation density (EVERY CLAIM rule)
5. Handling sub-agent failures with retry logic

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path
- `$SESSION_DIR/final-synthesis.md` - Synthesis document
- `$SESSION_DIR/analysis/unified-citations.md` - Citation pool

## Phase Output

After completing this phase:
- Validated `$SESSION_DIR/final-synthesis.md`
- `$SESSION_DIR/analysis/citation-density-report.md` - Density validation
- Pass/fail status with metrics

**Return to orchestrator:** "Validation complete" with pass/fail status and metrics

---

## STEP-BY-STEP WORKFLOW

### Step 3.3: Orchestrator Quality Validation (M12)

**After synthesis-researcher completes, the orchestrator MUST validate the deliverable:**

**Step 3.3a: Verify Output Exists**

```bash
set +H  # Disable history expansion
if [ ! -f "${SESSION_DIR}/final-synthesis.md" ]; then
  echo "❌ SYNTHESIS FAILED: No output file"
  echo "ACTION: Diagnose issue and re-launch synthesis-researcher"
  exit 1
fi

SYNTHESIS_SIZE=$(wc -c < "${SESSION_DIR}/final-synthesis.md")
if [ "$SYNTHESIS_SIZE" -lt 15000 ]; then
  echo "⚠️ WARNING: Synthesis suspiciously small ($SYNTHESIS_SIZE bytes)"
  echo "Expected: 15-40KB for comprehensive synthesis"
fi
```

**Step 3.3b: Validate Citation Utilization**

Check synthesis-researcher's reported metrics:
- **Minimum 60% citation utilization** (e.g., 90/150 citations used)
- If below 60% → Diagnose why citations were dropped → Re-launch with corrections

**Step 3.3c: Verify Structure Completeness**

```bash
set +H  # Disable history expansion
# Check for required sections
grep -q "## Part I: Executive Summary" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part I"
grep -q "## Part II: Research Methodology" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part II"
grep -q "## Part III: Research Findings" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part III"
grep -q "## Part IV: Integrated Analysis" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part IV"
grep -q "## Part V: Emergent Research" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part V"
grep -q "## Part VI: References" "${SESSION_DIR}/final-synthesis.md" || echo "❌ Missing Part VI"
```

**Step 3.3d: Handle Sub-Agent Failure**

If synthesis-researcher fails or produces invalid output:

1. **Diagnose the failure:**
   - Check if input files exist (research-summary.md, unified-citations.md)
   - Check for error messages in agent output
   - Verify file permissions and paths

2. **Fix impediments:**
   - Regenerate missing input files
   - Correct malformed data
   - Clear any corrupted state

3. **Re-launch synthesis-researcher:**
   - Do NOT fall back to manual synthesis
   - The agent has the full template and instructions
   - Retry with corrected inputs

**Orchestrator Responsibilities (NOT synthesis-researcher's job):**
- Quality gate enforcement
- Retry logic on failure
- Final validation before proceeding to Step 3.6+

**Synthesis-researcher Responsibilities:**
- Six-part academic structure
- Inline citations (60%+ utilization)
- IEEE reference formatting
- Writing final-synthesis.md

---


### Step 3.9: Citation Density Validation (M11 - EVERY CLAIM RULE)

**⚠️ MANDATORY: Validate citation density BEFORE finalizing synthesis**

This step ensures EVERY factual claim in the synthesis has an inline citation.

**Step 3.9a: Scan for Factual Claims**

Review `final-synthesis.md` Parts III and IV for:
1. **Numbers/Statistics:** "13.5% adoption", "€193K costs", "9x gap"
2. **Dates:** "February 2025", "August 1, 2024"
3. **Named entities doing something:** "Denmark leads", "The EU AI Act requires"
4. **Cause/effect statements:** "costs reached X due to Y"
5. **Comparative statements:** "higher than", "more than", "leads/trails"

**Step 3.9b: Verify Each Claim Has Citation**

For each factual claim identified:
- Check if it has an inline `[N]` citation marker
- Check if the citation number exists in the unified citation pool
- Mark any uncited claims

**Step 3.9c: Generate Validation Report**

```markdown
# Citation Density Report (Every Claim Rule)

**Synthesis File:** ${SESSION_DIR}/final-synthesis.md
**Validation Date:** $(date)

## Summary

| Metric | Count |
|--------|-------|
| Factual claims scanned | [N] |
| Claims with inline citations | [N] |
| Claims WITHOUT citations | [N] |
| Citation density ratio | [X.XX] |

## Validation Status

**Status:** ✅ PASS (all claims cited) / ❌ FAIL ([N] uncited claims)

## Uncited Claims (if any)

If validation FAILS, list each uncited claim:

| Line | Claim | Issue | Recommendation |
|------|-------|-------|----------------|
| 234 | "Adoption is accelerating" | No citation | Add [N] or mark [UNVERIFIED] |
| 312 | "The gap has widened" | No citation | Add [N] or remove claim |

## Remediation Required

For each uncited claim, choose ONE action:
1. **ADD CITATION:** Find the claim in agent output, trace to unified pool, add [N]
2. **MARK UNVERIFIED:** Add "[UNVERIFIED]" suffix if cannot find source
3. **REMOVE CLAIM:** Delete the uncited statement entirely
```

**Step 3.9d: Remediation (If Validation Fails)**

If validation fails:
1. Return to synthesis
2. For each uncited claim:
   - Search unified citation pool for supporting source
   - If found: Add inline `[N]` citation
   - If not found: Either mark `[UNVERIFIED]` or remove claim
3. Re-run validation until PASS

**What Counts as Factual (NEEDS CITATION):**
- ✅ "13.5% adoption" → NEEDS [N]
- ✅ "February 2025" → NEEDS [N]
- ✅ "Denmark leads at 28%" → NEEDS [N]
- ✅ "costs reached €193K" → NEEDS [N]
- ✅ "The EU AI Act prohibits" → NEEDS [N]

**What Does NOT Need Citation:**
- ❌ "This section examines..." (transitional phrase)
- ❌ "Therefore, we can conclude..." (logical conclusion from cited facts)
- ❌ Section headers and metadata
- ❌ "The research revealed several patterns..." (meta-commentary)

**Acceptable [UNVERIFIED] Usage:**

```markdown
According to industry reports, 42% of AI projects are abandoned [UNVERIFIED - original
source could not be accessed], though this figure requires independent verification.
```

**Step 3.9e: Final Validation Checklist**

Before completing synthesis, verify:
- [ ] ALL statistics have inline [N] citations
- [ ] ALL dates have inline [N] citations
- [ ] ALL named entities (countries, companies, laws) have inline [N] citations
- [ ] NO uncited factual claims remain
- [ ] Citation density ratio ≥ 1.0 (every claim cited)
- [ ] Validation report saved to `${SESSION_DIR}/analysis/citation-density-report.md`

---


---

## PHASE COMPLETE

After executing Steps 3.3 and 3.9:

**Report back to orchestrator:**
```
VALIDATION PHASE COMPLETE
Synthesis: $SESSION_DIR/final-synthesis.md
Size: [X] KB (within 15-40KB range)
Citation Utilization: [X]% (>=60% required)
Structure: 6/6 parts present
Citation Density: [X.XX] (all claims cited)
Status: PASS / FAIL (reason if fail)
```

The orchestrator will then proceed to Step 4 (Return Results).
