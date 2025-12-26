---
description: "Research Phase 3: Citation pooling, pre-synthesis summary, launch synthesis agent (called by /conduct-research-adaptive)"
globs: ""
alwaysApply: false
---

# Research Synthesis Phase

**This command is called by /conduct-research-adaptive orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Prepare and execute synthesis by:
1. Building unified citation pool from all agent outputs
2. Generating pre-synthesis summaries to prevent context overflow
3. Launching synthesis-researcher sub-agent with fresh context
4. Generating task graph for decision trail transparency
5. Adding platform coverage summary
6. Generating emergent research directions

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path
- `$SESSION_DIR/wave-1/*.md` - Wave 1 agent outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 specialist outputs (if applicable)
- `$SESSION_DIR/analysis/validated-citations-pool.md` - Validated citations
- `$SESSION_DIR/analysis/query-analysis.json` - Original query analysis

## Phase Output

After completing this phase:
- `$SESSION_DIR/analysis/unified-citations.md` - Unified citation pool
- `$SESSION_DIR/analysis/research-summary.md` - Condensed agent findings
- `$SESSION_DIR/final-synthesis.md` - Final synthesis document
- `$SESSION_DIR/analysis/task-graph.md` - Decision trail visualization

**Return to orchestrator:** "Synthesis complete" with file location and citation utilization %

---

## STEP-BY-STEP WORKFLOW

### STEP -1: Entry Gate - Citation Validation MUST Be Complete (CONSTITUTIONAL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│           SYNTHESIS ENTRY GATE - CITATION VALIDATION                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BEFORE ANY SYNTHESIS WORK, YOU MUST VERIFY:                            │
│                                                                          │
│  1. .citations-validated marker exists in $SESSION_DIR/analysis/        │
│  2. validated-citations-pool.md exists                                  │
│                                                                          │
│  IF EITHER IS MISSING → DO NOT PROCEED                                  │
│                                                                          │
│  Synthesizing without validated citations = HALLUCINATIONS IN OUTPUT    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Run this verification FIRST:**

```bash
set +H  # Disable history expansion
PAI_DIR="${HOME}/.claude"

# GATE 1: Check marker exists
if [ ! -f "$SESSION_DIR/analysis/.citations-validated" ]; then
  echo "🛑🛑🛑 ENTRY GATE FAILED: CITATION VALIDATION NOT COMPLETE 🛑🛑🛑"
  echo ""
  echo "The .citations-validated marker does not exist."
  echo "This means citation validation was either:"
  echo "  - Skipped entirely"
  echo "  - Run in background and not yet complete"
  echo "  - Failed with an error"
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Go back to Phase 2.5 (/_research-collect-validate)"
  echo "2. Run citation validation as a BLOCKING operation"
  echo "3. Wait for it to complete"
  echo "4. Verify .citations-validated marker exists"
  echo "5. Then return to synthesis"
  echo ""
  echo "DO NOT PROCEED WITH SYNTHESIS."
  exit 1
fi

# GATE 2: Check validated pool exists
if [ ! -f "$SESSION_DIR/analysis/validated-citations-pool.md" ]; then
  echo "🛑🛑🛑 ENTRY GATE FAILED: VALIDATED CITATION POOL MISSING 🛑🛑🛑"
  echo ""
  echo "The validated-citations-pool.md file does not exist."
  echo "This file is REQUIRED for synthesis - it contains ONLY verified citations."
  echo ""
  echo "Without this file, synthesis will use unvalidated citations,"
  echo "which may include hallucinated URLs from research agents."
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Re-run /_research-collect-validate"
  echo "2. Ensure it creates validated-citations-pool.md"
  echo "3. Then return to synthesis"
  exit 1
fi

echo "✅ Entry gate passed: Citation validation complete"
echo "   Marker: $SESSION_DIR/analysis/.citations-validated"
echo "   Pool: $SESSION_DIR/analysis/validated-citations-pool.md"
```

**If gate fails:** Return to `/_research-collect` and complete Sub-Phase 5 (Citation Validation) properly.

---

### STEP 0: Initialize Sub-Phase Tracking (MANDATORY)

**Before executing any step, set up TodoWrite with all sub-phases visible:**

```typescript
TodoWrite({ todos: [
  { content: "Phase 3: Synthesize findings", status: "in_progress", activeForm: "Synthesizing findings" },
  { content: "  3.0: Pool all citations", status: "pending", activeForm: "Pooling citations" },
  { content: "  3.1: Launch N summarizers", status: "pending", activeForm: "Launching summarizers" },
  { content: "  3.2: Cross-perspective synthesis", status: "pending", activeForm: "Running cross-synthesis" },
  { content: "  3.3: Generate task graph", status: "pending", activeForm: "Generating task graph" },
  { content: "  3.4: Platform coverage check", status: "pending", activeForm: "Checking platform coverage" },
]})
```

**Update sub-phase status as you complete each one. User MUST see progress.**

---

### Step 2.9: Agent Output Security Scan (Pre-Synthesis)

**MANDATORY: Scan all agent outputs for security concerns before synthesis**

Research agents fetch external content that may contain:
- Prompt injection patterns (from malicious sites or security research examples)
- Shell injection attempts that could affect downstream processing
- Path traversal patterns

**This step DETECTS and LOGS but does NOT block** - legitimate security research may contain injection examples.

**Step 2.9a: Scan Wave 1 and Wave 2 Outputs**

```bash
set +H  # Disable history expansion
SANITIZER="${PAI_DIR}/utilities/input-sanitizer/sanitizer.ts"
SECURITY_REPORT="${SESSION_DIR}/analysis/agent-output-security-scan.md"

echo "# Agent Output Security Scan" > "$SECURITY_REPORT"
echo "" >> "$SECURITY_REPORT"
echo "**Scan Date:** $(date)" >> "$SECURITY_REPORT"
echo "**Session:** ${SESSION_ID}" >> "$SECURITY_REPORT"
echo "" >> "$SECURITY_REPORT"

TOTAL_WARNINGS=0
FILES_SCANNED=0

# Scan all agent output files
for output_dir in wave-1 wave-2; do
  if [ -d "${SESSION_DIR}/${output_dir}" ]; then
    for output_file in "${SESSION_DIR}/${output_dir}"/*.md; do
      [ -f "$output_file" ] || continue
      FILES_SCANNED=$((FILES_SCANNED + 1))
      FILENAME=$(basename "$output_file")

      # Check for prompt injection patterns
      INJECTION_CHECK=$(bun "$SANITIZER" --check "$(cat "$output_file")" 2>/dev/null || echo '{"detected":false}')
      DETECTED=$(echo "$INJECTION_CHECK" | jq -r '.detected // false')

      if [ "$DETECTED" = "true" ]; then
        PATTERNS=$(echo "$INJECTION_CHECK" | jq -r '.patterns | join(", ")')
        echo "## ⚠️ $FILENAME" >> "$SECURITY_REPORT"
        echo "" >> "$SECURITY_REPORT"
        echo "**Patterns Detected:** $PATTERNS" >> "$SECURITY_REPORT"
        echo "" >> "$SECURITY_REPORT"
        echo "**Note:** This may be legitimate security research content or a prompt injection attempt. Review manually if concerns arise." >> "$SECURITY_REPORT"
        echo "" >> "$SECURITY_REPORT"
        TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
      fi
    done
  fi
done

# Summary
echo "---" >> "$SECURITY_REPORT"
echo "" >> "$SECURITY_REPORT"
echo "## Summary" >> "$SECURITY_REPORT"
echo "" >> "$SECURITY_REPORT"
echo "- **Files Scanned:** $FILES_SCANNED" >> "$SECURITY_REPORT"
echo "- **Security Warnings:** $TOTAL_WARNINGS" >> "$SECURITY_REPORT"
echo "- **Status:** $([ $TOTAL_WARNINGS -eq 0 ] && echo '✅ Clean' || echo '⚠️ Review recommended')" >> "$SECURITY_REPORT"
echo "" >> "$SECURITY_REPORT"

if [ $TOTAL_WARNINGS -gt 0 ]; then
  echo "⚠️ SECURITY SCAN: $TOTAL_WARNINGS file(s) contain potential injection patterns"
  echo "   Report: $SECURITY_REPORT"
  echo "   NOTE: Proceeding to synthesis - patterns may be legitimate security research content"
else
  echo "✅ SECURITY SCAN: All $FILES_SCANNED files clean"
fi
```

**Step 2.9b: Security Scan Decision**

The scan is **informational only** - synthesis continues regardless because:
1. Security research legitimately contains injection examples
2. Academic papers on LLM security show attack patterns
3. Blocking would prevent researching security topics

**However:** The security report is preserved in `analysis/agent-output-security-scan.md` for review if the final synthesis contains unexpected content.

**Integration with PAI Agent Guardrails:**

Research agents have strong identity anchoring (see agent definition `.md` files):
- MANDATORY FIRST ACTION sections
- Structured output requirements
- Voice system integration

These guardrails provide defense-in-depth against external content influencing agent behavior.

---

### Step 3.0: Citation Pooling (M11 - NEW)

**⚠️ CRITICAL: Build unified citation pool BEFORE synthesis begins**

This step extracts all citations from all agent outputs and creates a unified, renumbered citation pool for use in synthesis.

**Why Citation Pooling is Required:**
- Each agent has its own `[1], [2], [3]...` numbering
- Synthesis needs ONE sequential `[1]...[N]` numbering system
- Deduplication identifies which sources were found by multiple agents (high confidence)
- Unified pool enables proper inline citation in synthesis prose

**Step 3.0a: Extract Citations from All Agent Files**

```bash
set +H  # Disable history expansion
# Create unified citations file
UNIFIED_CITATIONS="${SESSION_DIR}/analysis/unified-citations.md"

echo "# Unified Citation Pool" > "$UNIFIED_CITATIONS"
echo "" >> "$UNIFIED_CITATIONS"
echo "**Generated:** $(date)" >> "$UNIFIED_CITATIONS"
echo "**Session:** ${SESSION_ID}" >> "$UNIFIED_CITATIONS"
echo "" >> "$UNIFIED_CITATIONS"

# Extract all URLs from Wave 1 and Wave 2
echo "## All Extracted URLs" >> "$UNIFIED_CITATIONS"
grep -hoE 'https?://[^[:space:]"<>)]+' ${SESSION_DIR}/wave-1/*.md ${SESSION_DIR}/wave-2/*.md 2>/dev/null | sort -u
```

**Step 3.0b: Build Quick Lookup Table**

After extracting all citations, create a mapping table:

```markdown
## Quick Lookup Table

| New # | Agent | Original # | Short Ref | Tier |
|-------|-------|------------|-----------|------|
| [1] | perplexity-1 | [3] | artificialintelligenceact.eu/timeline | Tier 1 |
| [2] | perplexity-1 | [4] | euronews.com/digital-omnibus | Tier 2 |
| [3] | claude-1 | [1] | mistral.ai | Tier 3 |
| [4] | 🔥 perplexity-1, grok-1 | [5], [2] | arxiv.org/abs/2401.12345 | Tier 1 |
...
```

**Multi-Source Markers:**
- 🔥 = Same URL found by 2+ agents (HIGH CONFIDENCE)
- No marker = Single agent source (verify carefully)

**Step 3.0c: Generate Full References (IEEE Format)**

```markdown
## Full References (IEEE Format)

[1] Artificial Intelligence Act EU. "Implementation Timeline." [Online]. Available: https://artificialintelligenceact.eu/implementation-timeline/ ✅ [Tier 1]

[2] EuroNews. "European Commission Delays Full Implementation of AI Act to 2027." November 19, 2025. [Online]. Available: https://www.euronews.com/next/2025/11/19/digital-omnibus ✅ [Tier 2]

[3] 🔥 **MULTI-SOURCE (2 agents)** ArXiv. "Comprehensive Review of EU AI Regulation." Aug. 2025. [Online]. Available: https://arxiv.org/abs/2401.12345 ✅ [Tier 1]
...
```

**Step 3.0d: Write Unified Citations File**

```bash
set +H  # Disable history expansion
cat > "$UNIFIED_CITATIONS" <<EOF
# Unified Citation Pool

**Generated:** $(date)
**Session:** ${SESSION_ID}
**Total Unique Citations:** [N]
**Multi-Source Citations:** [N] (found by 2+ agents)

---

## Quick Lookup Table

[Table as shown above]

---

## Full References (IEEE Format)

[All numbered references with URLs and tier classification]

---

## Usage Instructions for Synthesis

When writing synthesis prose, use citations from this unified pool:

**CORRECT Example:**
> Enterprise adoption reached 13.5% in 2024 [4], up from 8% in 2023 [4].
> Denmark leads at 28% [17], while Romania trails at 3% [17].

**INCORRECT Example (DO NOT DO THIS):**
> Enterprise adoption has grown significantly. Denmark leads while Romania lags.
> (NO CITATIONS = UNACCEPTABLE)

Every factual claim MUST have an inline [N] citation from this pool.
EOF

echo "📚 Unified citation pool written to: $UNIFIED_CITATIONS"
```

---


### Step 3.1+3.2: Parallel Synthesis (M13.2 - MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PARALLEL SYNTHESIS LAW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  YOU MUST USE /_research-synthesize-parallel                            │
│                                                                          │
│  DO NOT:                                                                 │
│      ❌ Launch a single "synthesis agent" directly                      │
│      ❌ Use synthesis-researcher without the parallel orchestrator      │
│      ❌ Skip the perspective-summarizer step                            │
│      ❌ "Optimize" by going straight to synthesis                       │
│                                                                          │
│  THE SLASH COMMAND IS THE AUTHORITY, NOT YOUR JUDGMENT.                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why Parallel is REQUIRED (not optional):**
- Single-agent synthesis causes context overflow with 200-450KB input
- Each perspective-summarizer gets FRESH context (no degradation)
- N files processed concurrently = faster completion
- Cross-perspective synthesizer receives organized summaries = better synthesis
- Citation utilization improves dramatically with structured input

---

**INVOKE THE PARALLEL SYNTHESIS ORCHESTRATOR:**

Use the SlashCommand tool to run:
```
/_research-synthesize-parallel $SESSION_DIR
```

This orchestrator will:
1. Create `$SESSION_DIR/summaries/` directory
2. Count perspective files dynamically (wave-1/*.md + wave-2/*.md)
3. Launch N perspective-summarizer agents IN PARALLEL
4. Wait for ALL summarizers to complete
5. Verify all summaries created
6. Launch single cross-perspective-synthesizer agent (opus model)
7. Verify final-synthesis.md meets quality gates

**Gate Verification:**
```bash
set +H  # Disable history expansion
PAI_DIR="${HOME}/.claude"
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" verify "$SESSION_DIR" parallel-synthesis-complete
```

---

**After /_research-synthesize-parallel completes, verify:**
- [ ] `final-synthesis.md` exists and is 15-40KB
- [ ] Citation utilization is 60%+ (from orchestrator report)
- [ ] All perspectives from query-analysis.json are covered
- [ ] summaries/ directory contains N summary files

**If Parallel Synthesis Fails:**
- Check `$SESSION_DIR/summaries/` for missing files
- Verify unified-citations.md exists
- Check orchestrator output for specific agent failures

---

**LEGACY FALLBACK (Use only if parallel fails):**

If parallel synthesis cannot complete, fall back to the old synthesis-researcher approach:
1. Generate manual research-summary.md (condense each agent file to ~150 lines)
2. Launch synthesis-researcher with research-summary.md + unified-citations.md

```markdown
Use the Task tool to launch synthesis-researcher (legacy):

Prompt:
---
You are the synthesis-researcher agent. Your task is to produce a comprehensive
research synthesis with inline citations.

**Session Directory:** ${SESSION_DIR}
**Session ID:** ${SESSION_ID}
**Query:** "${USER_QUERY}"

**Input Files:**
- Research Summary: ${SESSION_DIR}/analysis/research-summary.md
- Unified Citations: ${SESSION_DIR}/analysis/unified-citations.md

**Output File:**
Write synthesis to: ${SESSION_DIR}/final-synthesis.md

**Requirements:**
1. Read research-summary.md for condensed findings
2. Read unified-citations.md for citation pool
3. Follow six-part academic structure from your agent instructions
4. Ensure 60%+ citation utilization
5. Every factual claim must have inline [N] citation
6. Write output to final-synthesis.md

Report completion with citation utilization metrics.
---
```

---


> **NOTE:** Step 3.3 (Orchestrator Quality Validation) is handled by /research-validate

### Step 3.6: Generate Task Graph (NEW - Decision Trail Transparency)

**CRITICAL: Create transparent decision trail showing what was researched, discovered, and why pivots occurred.**

After synthesis is complete, generate the task graph for user visibility:

**Step 3.6a: Collect Task Graph Data**

Aggregate data from all phases:
- Wave 1 metrics: agents launched, output bytes, quality scores, execution time
- Wave 2 metrics (if launched): specialists, output, quality, execution time
- Coverage data: domains explored, coverage %, confidence %, key findings
- Gaps identified: severity, resolution status, resolved by which agent
- Pivots executed: trigger, rationale, agents launched, success/failure
- Tool gaps reported: platforms agents couldn't access, suggested tools

**Step 3.6b: Write Task Graph to Session Directory**

```bash
set +H  # Disable history expansion
# Write task graph to analysis directory
cat > "$SESSION_DIR/analysis/task-graph.md" <<EOF
# Research Task Graph

**Query:** $USER_QUERY
**Session:** $SESSION_ID
**Status:** ✅ COMPLETE

---

## Execution Timeline

\`\`\`
[Wave 1] ────────────────────────────────────────────────────
│
├─ [agent-type]-1      [quality bar] [confidence]% conf
├─ [agent-type]-2      [quality bar] [confidence]% conf
├─ [agent-type]-N      [quality bar] [confidence]% conf
│
▼ [PIVOT DECISION: reason if pivot, or "No pivot needed"]
│
[Wave 2] ──────────────────────────────────────────────────── [IF LAUNCHED]
│
└─ [specialist-type]-1  [quality bar] [confidence]% conf
│
▼ COMPLETE
\`\`\`

---

## Domain Coverage Map

| Domain | Coverage | Confidence | Agents | Status |
|--------|----------|------------|--------|--------|
| [domain1] | [X]% | [Y]% | [N] | ✅/⚠️ |
| [domain2] | [X]% | [Y]% | [N] | ✅/⚠️ |
| **Overall** | **[X]%** | **[Y]%** | **[N]** | **Status** |

---

## Pivot Trail

### Pivot 1: [Description] [IF PIVOT OCCURRED]

**Trigger:** [STRONG_SIGNAL_DETECTED / GAPS_IDENTIFIED / etc.]
**Signal Strength:** [X] (threshold: 150)

**Rationale:**
> [Why this pivot was made - what Wave 1 discovered]

**Action:** Launched [N]× [agent-type]
**Result:** ✅ SUCCESS / ⚠️ PARTIAL / ❌ FAILED

---

## Gap Resolution

| Gap | Severity | Source | Resolution | Status |
|-----|----------|--------|------------|--------|
| [gap1] | HIGH/MODERATE/LOW | [agent] | [action taken] | ✅/⏸️/❌ |

---

## Tool Gap Recommendations

| Platform | Suggested Action | Priority |
|----------|-----------------|----------|
| [platform] | [recommendation] | HIGH/MODERATE/LOW |

---

## Final Metrics

| Metric | Value |
|--------|-------|
| Total Agents | [N] |
| Total Output | [X] KB |
| Sources Cited | [N]+ |
| Execution Time | ~[X] min |
| Pivots Executed | [N] |
| Gaps Resolved | [X]/[Y] |
EOF

echo "📊 Task graph written to: $SESSION_DIR/analysis/task-graph.md"
```

**Step 3.6c: Include Task Graph in Final Report**

The task graph provides transparency:
- **Users see WHY decisions were made** - Not just what was found
- **Pivot rationale is documented** - Users understand research evolution
- **Quality metrics are visible** - Users can assess agent performance
- **Gap resolution is tracked** - Users see what's covered vs. remaining

**Note:** Task graph is written to analysis directory and included in synthesis. It's cleaned up with the session unless user requests preservation.


### Step 3.7: Generate Platform Coverage Summary (AD-008 - NEW)

**Add Platform Coverage Summary to final synthesis report:**

This section enables {{ENGINEER_NAME}} to make informed judgment on whether follow-up research is needed:

```markdown
┌─────────────────────────────────────────────────────────────┐
│ 🌐 PLATFORM COVERAGE SUMMARY (AD-008)                       │
├─────────────────────────────────────────────────────────────┤
│ Perspective: "[perspective text - truncated to 60 chars]"   │
│   Expected: x, linkedin, reddit                             │
│   ✅ Searched: x (14 results), reddit (3 discussions)       │
│   ⚠️ Not searched: linkedin                                 │
│   → Potential: B2B discussions, enterprise use cases        │
├─────────────────────────────────────────────────────────────┤
│ Perspective: "[perspective text - truncated to 60 chars]"   │
│   Expected: arxiv, github                                   │
│   ✅ Searched: arxiv (8 papers), github (12 repos)          │
│   ✅ Full coverage                                          │
├─────────────────────────────────────────────────────────────┤
│ ... (repeat for each perspective)                           │
├─────────────────────────────────────────────────────────────┤
│ OVERALL COVERAGE: [X/Y] perspectives fully covered          │
│ RECOMMENDATION: [specific follow-up if gaps found, or       │
│                  "Coverage sufficient for query scope"]     │
└─────────────────────────────────────────────────────────────┘
```

**Generate from platform-coverage.md:**

```bash
set +H  # Disable history expansion
# Read coverage report and format for synthesis
if [ -f "$SESSION_DIR/analysis/platform-coverage.md" ]; then
  echo "" >> "$SESSION_DIR/final-synthesis.md"
  echo "## 🌐 Platform Coverage Summary (AD-008)" >> "$SESSION_DIR/final-synthesis.md"
  echo "" >> "$SESSION_DIR/final-synthesis.md"

  # Parse platform-requirements.json and coverage report to build summary
  # For each perspective, compare expected vs searched
  cat "$SESSION_DIR/analysis/platform-coverage.md" >> "$SESSION_DIR/final-synthesis.md"

  # Add recommendation
  if [ $UNCOVERED_PERSPECTIVES -gt 0 ]; then
    echo "**RECOMMENDATION:** Consider follow-up research on missed platforms for uncovered perspectives." >> "$SESSION_DIR/final-synthesis.md"
  else
    echo "**RECOMMENDATION:** Coverage sufficient for query scope." >> "$SESSION_DIR/final-synthesis.md"
  fi
fi
```

**Why This Matters:**
- {{ENGINEER_NAME}} can see exactly WHAT platforms were searched vs expected
- Missed platforms are clearly flagged (not silently skipped)
- "Potential" notes explain what might be found on missed platforms
- Human judgment determines if follow-up research is warranted


### Step 3.8: Generate Emergent Research Directions (MANDATORY)

**⚠️ THIS SECTION IS MANDATORY IN EVERY RESEARCH REPORT**

After synthesizing research, you've developed a unique perspective from combining multiple agent outputs. Use this meta-knowledge to identify where the research POINTS but doesn't GO.

**Why This Matters:**
- Research reveals boundaries of current knowledge
- Gaps identified by multiple agents signal important unknown areas
- Your synthesis perspective sees patterns individual agents cannot
- Follow-up queries enable {{ENGINEER_NAME}} to easily continue the investigation

**Step 3.8a: Extract Emergent Gaps from Agent Metadata**

Review all agent structured metadata for:
1. **"Limited Coverage" sections** - What agents explicitly couldn't find
2. **"Alternative Domains" suggestions** - Where agents thought answers might be
3. **"Recommended Follow-up" sections** - Questions agents wanted answered
4. **Cross-agent pattern recognition** - Similar gaps across multiple agents

**Step 3.8b: Generate Emergent Research Directions Section**

Add this section to `final-synthesis.md`:

```markdown
## Part V: Emergent Research Directions

### 5.1 Research Gaps Identified

Based on synthesis analysis, the following areas warrant further investigation:

#### High-Priority Gaps (Critical to understanding)

1. **[Gap Title]** - [Brief description of what's missing]
   - Reported by: [agent1, agent2] (N agents)
   - Why it matters: [Impact on the query understanding]
   - Suggested approach: [How to investigate]

2. **[Gap Title]** - [Brief description]
   - Reported by: [agents]
   - Why it matters: [Impact]
   - Suggested approach: [Method]

[List 3-5 high-priority gaps]

#### Medium-Priority Gaps (Emerging concerns)

3. **[Gap Title]** - [Description]
   - Signal strength: [MODERATE]
   - Source: [Single agent or synthesis observation]

[List 2-3 medium-priority gaps]

#### Speculative / Horizon Areas

4. **[Area Title]** - [What the research hints at but doesn't explore]
   - Confidence: LOW
   - Based on: [Which findings suggest this]

[List 1-2 speculative areas]

### 5.2 Recommended Follow-up Queries

To address identified gaps, the following specific searches are recommended:

| Priority | Query | Target Agents | Expected Insight |
|----------|-------|---------------|------------------|
| HIGH | "[Specific search query 1]" | perplexity + claude | [What this would reveal] |
| HIGH | "[Specific search query 2]" | grok | [What this would reveal] |
| MEDIUM | "[Specific search query 3]" | perplexity | [What this would reveal] |
| MEDIUM | "[Specific search query 4]" | gemini | [What this would reveal] |
| LOW | "[Specific search query 5]" | claude | [What this would reveal] |

### 5.3 Synthesis Observations

*Patterns identified from cross-agent analysis that weren't explicitly researched:*

- **[Observation 1]**: [Pattern you noticed from combining agent outputs]
- **[Observation 2]**: [Another emergent pattern]
- **[Observation 3]**: [Third observation if applicable]

*These observations represent emergent insights from synthesis - they were not directly researched but arise from combining multiple perspectives.*
```

**Step 3.8c: Quality Checklist for Emergent Directions**

Before completing the synthesis, verify:

- [ ] **Minimum 5 gaps identified** (3 high, 2 medium minimum)
- [ ] **Each gap has agent attribution** (which agents reported it)
- [ ] **5 follow-up queries generated** (actionable, specific searches)
- [ ] **Queries include target agents** (who should research it)
- [ ] **At least 1 synthesis observation** (emergent pattern you noticed)

**Why Include This Every Time:**
1. Research is never complete - gaps are EXPECTED and valuable
2. Follow-up queries enable continuation without re-synthesis
3. Agent attribution helps improve agent performance over time
4. Synthesis observations capture unique orchestrator-level insights
5. {{ENGINEER_NAME}} can decide which gaps warrant immediate follow-up


---

## PHASE COMPLETE

After executing Steps 3.0, 3.1, 3.2, 3.6, 3.7, and 3.8:

**Report back to orchestrator:**
```
SYNTHESIS PHASE COMPLETE
Output: $SESSION_DIR/final-synthesis.md
Size: [X] KB
Citation Utilization: [X]%
Parts Complete: 6/6
```

The orchestrator will then call `/research-validate` with the SESSION_DIR.
