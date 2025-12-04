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


### Step 3.1: Pre-Synthesis Summary Generation (M12 - NEW)

**⚠️ CRITICAL: Condense raw research files to prevent context overflow during synthesis**

Raw research files total ~216KB for 8 agents. This causes context overflow during synthesis (400KB+ total). This step condenses findings to ~60KB while preserving all citations.

**Step 3.1a: Generate Research Summary**

For each agent file in wave-1/ and wave-2/, create a condensed summary:

```bash
RESEARCH_SUMMARY="${SESSION_DIR}/analysis/research-summary.md"

cat > "$RESEARCH_SUMMARY" << 'HEADER'
# Research Summary (Pre-Synthesis Condensation)

**Generated:** $(date)
**Session:** ${SESSION_ID}
**Purpose:** Condensed findings for synthesis sub-agent (M12)

---

HEADER
```

**Step 3.1b: Condensation Template Per Agent (~150 lines each)**

For each agent file, extract and condense to this format:

```markdown
## Agent: [agent-name]
**Perspective:** [perspective title from query-analysis.json]
**File:** [filename]
**Domain:** [domain]
**Confidence:** [X]%
**Original Size:** [X] KB

### Key Findings (with citation references)

1. **[Finding category]:**
   - [Specific finding with citation ref, e.g., "13.5% adoption rate [4]"]
   - [Related finding [4], [17]]

2. **[Finding category]:**
   - [Finding with citation ref]
   - [Supporting detail [N]]

3. **[Finding category]:**
   - [Finding with citation refs]

### Citations Used (Agent's Original Numbers)

| Agent Ref | Unified Ref | Short Description |
|-----------|-------------|-------------------|
| [1] | [4] | Eurostat AI adoption data |
| [2] | [17] | Denmark AI leadership report |
| [3] | [N] | ... |

### Key Quotes

> "[Exact quote from source]" - [Source name] [N]

> "[Another important quote]" - [Source] [N]

### Unique Insights (Not Found Elsewhere)

- [Insight unique to this agent's perspective]
- [Another unique insight]

---
```

**Step 3.1c: Concatenate All Agent Summaries**

```bash
# Process Wave 1 agents
for agent_file in ${SESSION_DIR}/wave-1/*.md; do
  echo "Processing: $agent_file"
  # Generate summary using the template above
  # Append to research-summary.md
done

# Process Wave 2 agents if they exist
if [ -d "${SESSION_DIR}/wave-2" ]; then
  for agent_file in ${SESSION_DIR}/wave-2/*.md; do
    echo "Processing: $agent_file"
    # Generate summary using the template above
    # Append to research-summary.md
  done
fi

echo "📝 Research summary generated: $RESEARCH_SUMMARY"
wc -l "$RESEARCH_SUMMARY"  # Target: ~1200 lines (~60KB)
```

**Target Sizes:**
- ~150 lines per agent
- 8 agents = ~1200 lines total
- ~60KB condensed (vs. 216KB raw)

---


### Step 3.2: Launch Synthesis Sub-Agent (M12 - NEW)

**⚠️ CRITICAL: Delegate synthesis to fresh-context sub-agent**

The synthesis-researcher agent receives FRESH context with only:
- Agent instructions: ~15KB
- Research summary: ~60KB
- Unified citations: ~15KB
- **Total: ~90KB** (vs. 400KB+ before M12)

**Step 3.2a: Prepare Sub-Agent Input**

Ensure these files exist in `${SESSION_DIR}/analysis/`:
- `research-summary.md` (from Step 3.1)
- `unified-citations.md` (from Step 3.0)

**Step 3.2b: Launch Synthesis Sub-Agent**

```markdown
Use the Task tool to launch synthesis-researcher:

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

**Step 3.2c: Monitor Sub-Agent Quality**

After synthesis-researcher completes, verify:
- [ ] `final-synthesis.md` exists and is 15-40KB
- [ ] Citation utilization is 60%+ (check agent's report)
- [ ] All perspectives from query-analysis.json are covered
- [ ] Six-part structure is present

**If Sub-Agent Fails:**
- Check for context issues (shouldn't happen with fresh context)
- Verify input files exist and are properly formatted
- Re-launch with corrected inputs if needed

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
