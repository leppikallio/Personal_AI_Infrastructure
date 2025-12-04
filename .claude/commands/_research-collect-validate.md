---
description: "Research Collection Validate: Citation validation and hallucination tracking (called by /_research-collect)"
globs: ""
alwaysApply: false
---

# Research Collection - Validate Phase

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Validate all agent citations before synthesis by:
1. Extracting all citations from Wave 1 and Wave 2 outputs
2. Verifying URL accessibility and content accuracy
3. Generating validated citation pool for synthesis
4. Tracking hallucinated/invalid citations by agent

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path (passed as argument: $1)
- `$SESSION_DIR/wave-1/*.md` - Wave 1 agent research outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 specialist outputs (if pivot occurred)

## Phase Output

After completing this phase:
- `$SESSION_DIR/analysis/citation-validation-report.md` - Pre-synthesis validation
- `$SESSION_DIR/analysis/validated-citations-pool.md` - Citations approved for synthesis
- `$SESSION_DIR/analysis/hallucination-report.md` - Fabricated citation tracking

**Return to orchestrator:** "Validation complete" with citation counts and validation stats

---

## STEP-BY-STEP WORKFLOW

### Step 2.7: Citation Validation (MANDATORY - DO NOT SKIP)

**MANDATORY: Validate ALL agent citations BEFORE synthesis.**

LLMs frequently hallucinate citations - URLs that don't exist, papers never written, statistics not in sources. This step ensures research credibility by validating sources BEFORE they are synthesized.

**⚠️ CRITICAL TIMING: Citation validation runs BEFORE synthesis (Step 3). You cannot synthesize from potentially hallucinated sources.**

**Why BEFORE synthesis:**
1. Synthesis should only reference validated, accessible sources
2. Invalid citations must be flagged/removed before appearing in final output
3. Content mismatches must be corrected before being synthesized
4. The synthesis IS the final product - it must be built on verified foundations

**Validation Scope:**
- **ALL citations from Wave 1 agent outputs** (MANDATORY)
- **ALL citations from Wave 2 agent outputs** (MANDATORY if Wave 2 ran)
- Result: A validated citation pool that synthesis can draw from

---

**Step 2.7a: Extract All Agent Citations**

```bash
# CRITICAL: Run this BEFORE synthesis - validates agent outputs
# Extract all URLs from Wave 1 + Wave 2 research files (excludes analysis/)
find $SESSION_DIR/wave-1 $SESSION_DIR/wave-2 -name "*.md" 2>/dev/null | xargs grep -ohE "https?://[^\s\)\]\>\"']+" | sort -u > $SESSION_DIR/analysis/agent-citations-all.txt

TOTAL_CITATION_COUNT=$(wc -l < $SESSION_DIR/analysis/agent-citations-all.txt)
echo "📋 Total agent citations to validate: $TOTAL_CITATION_COUNT"
```

**Step 2.7b: Determine Validation Strategy**

```bash
# Validation strategy based on citation count
if [ "$TOTAL_CITATION_COUNT" -le 30 ]; then
  echo "📋 Strategy: FULL VALIDATION (≤30 citations)"
  VALIDATION_STRATEGY="full"
  VALIDATORS_NEEDED=1
elif [ "$TOTAL_CITATION_COUNT" -le 60 ]; then
  echo "📋 Strategy: FULL VALIDATION with 2 validators (31-60 citations)"
  VALIDATION_STRATEGY="full"
  VALIDATORS_NEEDED=2
else
  echo "📋 Strategy: PRIORITIZED VALIDATION (>60 citations)"
  echo "   - Validate unique domains first"
  echo "   - Sample remaining at 30%"
  VALIDATION_STRATEGY="prioritized"
  VALIDATORS_NEEDED=3
fi
```

**Step 2.7c: Determine Validator Agent Count**

| Agent Citations | Validator Agents | Strategy |
|-----------------|------------------|----------|
| 1-30 | 1 | Single agent validates ALL |
| 31-60 | 2 | Split evenly between validators |
| 61+ | 3 | Prioritized validation (domains first, then sample) |

**Step 2.7d: Launch Citation Validator Agents**

```typescript
// Launch citation validators in PARALLEL
// Model: Sonnet (better judgment for content mismatch detection)
// VALIDATES ALL AGENT OUTPUT CITATIONS *BEFORE* SYNTHESIS

Task({
  subagent_type: "general-purpose",
  model: "sonnet",
  description: "Pre-synthesis citation validation",
  prompt: `
**YOU ARE A PRE-SYNTHESIS CITATION VALIDATOR**

**TIMING:** BEFORE synthesis - validating agent research outputs
**CRITICALITY:** HIGH - Only validated citations can be used in synthesis

**YOUR TASK:** Validate citations from agent research files so synthesis has a verified foundation

**Citations to Validate:**
[URLs from agent-citations-all.txt - extracted from wave-1/ and wave-2/ files]

**VALIDATION PROCESS:**

For EACH citation:

1. **Accessibility Check**
   - Use WebFetch to access the URL
   - If blocked (403/CAPTCHA), use mcp__brightdata__scrape_as_markdown
   - Record: HTTP status, accessible (yes/no)

2. **Content Verification** (if accessible)
   - Search page content for key claims made by the agent
   - Check: Does the page contain relevant information about the research topic?
   - Note what the page actually covers

3. **Convert to IEEE Format**
   - Extract: author(s), title, publication, date, URL
   - Format per IEEE style guide
   - Include access date for online sources

4. **Assign Status**
   - ✅ Valid: URL works AND contains relevant content
   - ⚠️ Mismatch: URL works BUT content doesn't match agent's claims
   - ❌ Invalid: URL doesn't work (404, timeout, etc.)
   - 🔒 Paywalled: URL works but content behind paywall

**OUTPUT FORMAT:**

## Pre-Synthesis Citation Validation Report

### Summary

| Status | Count |
|--------|-------|
| ✅ Valid | X |
| ⚠️ Mismatch | X |
| ❌ Invalid | X |
| 🔒 Paywalled | X |

### VALIDATED CITATION POOL (Use these in synthesis)

**These citations have been verified and CAN be used in synthesis:**

[1] A. Smith, "Title," *Publication*, Month Year. [Online]. Available: https://example.com/article ✅

[2] LangChain Blog, "Production Deployments," Feb. 2025. [Online]. Available: https://blog.langchain.dev/production ✅

[3] Truesec, "Shai-Hulud npm Attack," Sep. 2025. [Online]. Available: https://truesec.com/research/shai-hulud ✅

### Multi-Source References (HIGHLIGHT THESE)

**References appearing in 2+ agent reports get special highlighting:**

[4] 🔥 **MULTI-SOURCE** - Microsoft Blog, "Agent Framework," Oct. 2025. [Online]. Available: https://microsoft.com/agent-framework ✅
- Found by: perplexity-news, claude-technical, gemini-multimodal (3 agents)
- Signal: HIGH confidence (independent corroboration)

### REJECTED CITATIONS (DO NOT USE IN SYNTHESIS)

**These citations FAILED validation and MUST NOT be used:**

[15] ❌ INVALID - 404 Not Found
- Agent: perplexity-threats
- Claimed: "32% improvement in reasoning"
- URL: https://example.com/not-found
- Action: DO NOT USE - citation does not exist

[23] ⚠️ MISMATCH - Content differs from claim
- Agent: claude-technical
- Claimed: "78% adoption rate"
- URL: https://example.com/report (accessible)
- Actual content: "72% adoption rate"
- Action: USE WITH CORRECTION - update statistic to match source

[31] 🔒 PAYWALLED - Cannot verify
- Agent: grok-industry
- URL: https://example.com/premium-report
- Action: DO NOT USE as primary source - mark as [UNVERIFIED] if essential

**Write output to:** ${SESSION_DIR}/analysis/citation-validation-report.md
`
})
```

**Step 2.7e: Process Validation Results**

After validators complete:

```bash
# Count validation results
echo ""
echo "=== PRE-SYNTHESIS CITATION VALIDATION RESULTS ==="
VALID_COUNT=$(grep -c "✅" $SESSION_DIR/analysis/citation-validation-report.md || echo 0)
INVALID_COUNT=$(grep -c "❌" $SESSION_DIR/analysis/citation-validation-report.md || echo 0)
MISMATCH_COUNT=$(grep -c "⚠️" $SESSION_DIR/analysis/citation-validation-report.md || echo 0)
PAYWALLED_COUNT=$(grep -c "🔒" $SESSION_DIR/analysis/citation-validation-report.md || echo 0)
TOTAL=$((VALID_COUNT + INVALID_COUNT + MISMATCH_COUNT + PAYWALLED_COUNT))

echo "  ✅ Valid (use in synthesis): $VALID_COUNT"
echo "  ⚠️ Mismatch (use with corrections): $MISMATCH_COUNT"
echo "  ❌ Invalid (DO NOT USE): $INVALID_COUNT"
echo "  🔒 Paywalled (mark unverified): $PAYWALLED_COUNT"
echo "  📊 Validation Rate: $((VALID_COUNT * 100 / TOTAL))%"

# Extract validated citation pool for synthesis
grep -A2 "✅$" $SESSION_DIR/analysis/citation-validation-report.md > $SESSION_DIR/analysis/validated-citations-pool.md
echo ""
echo "📋 Validated citation pool written to: $SESSION_DIR/analysis/validated-citations-pool.md"
echo "   Synthesis MUST only use citations from this pool"
```

**Step 2.7f: Generate Hallucination Report (SEPARATE FILE)**

**⚠️ MANDATORY: Create a separate report tracking hallucinated/invalid citations by agent**

This report enables:
1. Identifying which agents hallucinate most frequently
2. Pattern detection (certain topics, certain agent types)
3. Agent prompt improvement over time
4. Accountability and transparency

```bash
# Create hallucination report - separate file for visibility
cat > "$SESSION_DIR/analysis/hallucination-report.md" << 'HALLUCINATION_HEADER'
# 🚨 Citation Hallucination Report

**Session:** $SESSION_ID
**Date:** $CURRENT_DATE
**Purpose:** Track fabricated/invalid citations by agent for quality improvement

---

## Summary

| Agent | Total Citations | ❌ Invalid | ⚠️ Mismatch | Hallucination Rate |
|-------|-----------------|------------|-------------|-------------------|
HALLUCINATION_HEADER

# Parse validation report and aggregate by agent
# ({{DA}} will fill this table during validation)

cat >> "$SESSION_DIR/analysis/hallucination-report.md" << 'HALLUCINATION_DETAIL'

---

## Detailed Hallucinations by Agent

### ❌ INVALID Citations (Fabricated URLs)

These URLs do not exist - the agent made them up:

[Agent will list each invalid citation with:]
- **Agent:** [agent-name]
- **Wave:** [1 or 2]
- **Claimed URL:** [the fabricated URL]
- **Claimed Content:** [what the agent said this URL contained]
- **Validation Result:** 404 / DNS failure / timeout
- **Impact:** [what claim in the research this invalidates]

---

### ⚠️ MISMATCH Citations (Real URL, Wrong Content)

These URLs exist but don't say what the agent claimed:

[Agent will list each mismatch with:]
- **Agent:** [agent-name]
- **Wave:** [1 or 2]
- **URL:** [the real URL]
- **Agent Claimed:** [what the agent said]
- **Actual Content:** [what the URL actually says]
- **Discrepancy Type:** [statistic wrong / quote fabricated / source misattributed / etc.]

---

## Agent Reliability Scores

Based on this session's validation:

| Agent | Reliability Score | Notes |
|-------|-------------------|-------|
| [agent] | [valid/total]% | [any patterns noticed] |

---

## Recommendations

[{{DA}} will add recommendations based on patterns:]
- If an agent type consistently hallucinates → note for prompt improvement
- If certain topics trigger hallucinations → note for future research
- If a specific agent had 0 hallucinations → note as reliable

HALLUCINATION_DETAIL

echo "📋 Hallucination report initialized: $SESSION_DIR/analysis/hallucination-report.md"
```

**Validator Agent Instructions (Updated):**

When validating citations, the validator agent MUST:
1. Track which agent produced each citation (from the source file name)
2. For each ❌ INVALID or ⚠️ MISMATCH, record:
   - Agent name and type
   - Wave (1 or 2)
   - The fabricated/mismatched claim
   - What was actually found (or not found)
3. Write detailed entries to the hallucination report
4. Calculate per-agent hallucination rates

**Step 2.7g: Synthesis Citation Rules**

The validation report creates a VALIDATED CITATION POOL that synthesis MUST use:

1. **✅ Valid citations:** Use in synthesis, cite with IEEE format
2. **⚠️ Mismatches:** Use with CORRECTED information (use actual source content, not agent's claim)
3. **❌ Invalid:** DO NOT USE in synthesis - these citations do not exist
4. **🔒 Paywalled:** DO NOT USE as primary evidence - mark as [UNVERIFIED] only if essential context

**CRITICAL SYNTHESIS RULE:**
```
Synthesis MUST ONLY reference URLs from validated-citations-pool.md
Any claim that relied on an ❌ INVALID citation must be:
  - Removed from synthesis entirely, OR
  - Re-sourced from a validated citation, OR
  - Marked explicitly as [UNVERIFIED - original source unavailable]
```

**Reference:** See `${PAI_DIR}/skills/CitationValidation/` for complete validation methodology

---

## VALIDATE PHASE COMPLETE

After executing Step 2.7:

**Report back to orchestrator:**
```
VALIDATION PHASE COMPLETE
Total Citations: [count]
Validated Citations: [count] (use in synthesis)
Invalid Citations: [count] (DO NOT use)
Mismatch Citations: [count] (use with corrections)
Paywalled Citations: [count] (mark unverified)
Validation Rate: [percentage]%
Files Created: citation-validation-report.md, validated-citations-pool.md, hallucination-report.md
```

The orchestrator will then call `/_research-synthesize` with the SESSION_DIR.
