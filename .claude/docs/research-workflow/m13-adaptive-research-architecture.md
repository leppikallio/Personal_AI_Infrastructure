# M13 Adaptive Research Architecture

**Complete Technical Documentation**

**Version:** M13.2 (2025-12-25)
**Status:** Production
**Maintainer:** PAI Infrastructure Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Initialize](#phase-1-initialize)
4. [Phase 2: Collect](#phase-2-collect)
5. [Phase 3: Synthesize](#phase-3-synthesize)
6. [Phase 4: Validate](#phase-4-validate)
7. [Quality Analyzer System](#quality-analyzer-system)
8. [Citation Validation System](#citation-validation-system)
9. [Source Quality Framework (M10)](#source-quality-framework-m10)
10. [Platform Coverage Validation (AD-008)](#platform-coverage-validation-ad-008)
11. [Decision Algorithms](#decision-algorithms)
12. [File Structure](#file-structure)
13. [Examples](#examples)
14. [Troubleshooting](#troubleshooting)

---

## Overview

### What is M13?

M13 (Multi-wave Intelligent Research) is an adaptive two-wave research orchestration system that intelligently determines whether additional specialized research is needed based on quality signals from initial exploration.

**Key Innovation:** Instead of brute-forcing 10+ agents, M13 launches 4-6 exploratory agents (Wave 1), analyzes their results using a 5-component quality matrix, and conditionally launches 0-8 specialists (Wave 2) only when needed.

### Why Adaptive Research?

**Problems with Traditional Approaches:**
- **Brute Force (10+ agents):** Expensive, slow, redundant coverage, wasted compute
- **Single-Pass (1-3 agents):** Shallow coverage, missed perspectives, domain blind spots
- **Fixed Pipelines:** No intelligence, can't adapt to query complexity

**M13 Solution:**
- **Wave 1 (4-6 agents):** Broad exploration with structured metadata reporting
- **Pivot Analysis:** 5-component quality matrix determines Wave 2 need
- **Wave 2 (0-8 agents):** Targeted specialists for identified gaps only
- **Result:** Higher quality, lower cost, adaptive coverage

### Core Principles

1. **Perspective-First Routing (AD-005):** Generate research perspectives before agent allocation
2. **Quality-Driven Pivots:** Data-driven Wave 2 decisions, not guesswork
3. **Source Quality Enforcement (M10):** Track allocation ensures source diversity (50/25/25)
4. **Citation Validation (M11):** Pre-synthesis validation prevents hallucinated sources
5. **Command Splitting:** ~75% context reduction through sub-command orchestration

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    M13 ORCHESTRATOR                          │
│           /conduct-research-adaptive (Main)                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ Phase 1 │         │ Phase 2 │        │ Phase 3 │
   │  INIT   │────────▶│ COLLECT │───────▶│SYNTHESIZE│
   └─────────┘         └─────────┘        └─────────┘
                            │                   │
                       ┌────▼────┐         ┌────▼────┐
                       │ Phase 2a│         │ Phase 4 │
                       │ EXECUTE │         │VALIDATE │
                       └─────────┘         └─────────┘
                            │
                       ┌────▼────┐
                       │ Phase 2b│
                       │VALIDATE │
                       └─────────┘
```

### Sub-Command Structure

**Main Orchestrator:** `/conduct-research-adaptive` (~500 lines)
- Calls 4 phase sub-commands
- Manages quality gates
- Returns final results

**Phase Sub-Commands:**
1. **`/_research-init`** (~450 lines)
   - Query analysis
   - Perspective generation
   - Track allocation
   - Session setup

2. **`/_research-collect`** (~130 lines orchestrator)
   - Calls Execute and Validate sub-phases
   - Quality gates

   **2a. `/_research-collect-execute`** (~1,270 lines)
   - Wave 1 agent launch
   - Quality analysis (TypeScript CLI)
   - Pivot decision
   - Wave 2 specialist launch

   **2b. `/_research-collect-validate`** (~370 lines)
   - Citation extraction
   - URL validation
   - Hallucination tracking
   - Validated pool generation

3. **`/_research-synthesize`** (~600 lines)
   - Citation pooling (M11)
   - Pre-synthesis condensation (M12)
   - Final synthesis generation
   - Task graph visualization

4. **`/_research-validate`** (~230 lines)
   - Citation utilization check
   - Structure validation
   - Citation density analysis
   - Quality gate enforcement

**Total:** ~3,550 lines across 6 files (vs. 3,100 in monolith)

### Context Efficiency

**Old Way (Monolithic):**
- Single 116KB command
- All instructions loaded upfront
- Context pollution across phases
- ~47KB context per invocation

**New Way (M13):**
- Orchestrator: 3KB
- Phase commands: 10-20KB each (loaded only when needed)
- Sub-agents get fresh context
- **~75% context reduction per phase**

---

## Phase 1: Initialize

**Command:** `/_research-init "$USER_QUERY"`

**Purpose:** Analyze query and prepare research session

### Step 1.1: Query Analysis

Uses the perspective-first analyzer (`${PAI_DIR}/utilities/query-analyzer/query-analyzer.ts`):

```bash
cd ${PAI_DIR}/utilities/query-analyzer
bun ./query-analyzer.ts --perspectives "$USER_QUERY"
```

**Outputs:**
```typescript
{
  query: string;
  complexity: 'simple' | 'moderate' | 'complex';
  perspectives: EnhancedPerspective[];  // 4-6 research angles
  agentAllocation: {
    'perplexity-researcher': number;
    'claude-researcher': number;
    'gemini-researcher': number;
    'grok-researcher': number;
  };
  totalAgents: number;  // Wave 1 count (4-6)
}
```

**Enhanced Perspective Structure:**
```typescript
interface EnhancedPerspective {
  text: string;                    // Research angle
  domain: 'academic' | 'technical' | 'social_media' | 'multimodal';
  confidence: number;              // 0-100
  recommendedAgent: AgentType;     // Optimal agent for this perspective
  rationale: string;               // Why this perspective matters
  platforms?: Platform[];          // Expected platforms to search (AD-008)
}
```

### Step 1.2: Track Allocation (M10)

Allocates perspectives to research tracks for source diversity:

**Track Distribution (50/25/25):**
- **Standard Track (50%):** Balanced research, any source tier
- **Independent Track (25%):** Academic rigor (Tier 1 preferred)
- **Contrarian Track (25%):** Opposing viewpoints, critical sources

**Source Tier Classification:**
- **Tier 1 (Independent):** Academic papers, standards bodies (NIST, OWASP), independent researchers
- **Tier 2 (Quasi-Independent):** Industry associations, news outlets, non-profits
- **Tier 3 (Vendor):** Product vendors, cloud providers, consulting firms
- **Tier 4 (Suspect):** SEO farms, affiliate sites - USE WITH CAUTION

**Allocation Algorithm:**
```typescript
const trackAllocation = {
  standard: perspectives.slice(0, Math.ceil(perspectives.length * 0.5)),
  independent: perspectives.slice(Math.ceil(perspectives.length * 0.5),
                                   Math.ceil(perspectives.length * 0.75)),
  contrarian: perspectives.slice(Math.ceil(perspectives.length * 0.75))
};
```

### Step 1.3: Session Creation

Creates organized session directory:

```
${PAI_DIR}/scratchpad/research/${SESSION_ID}/
├── analysis/
│   ├── query-analysis.json           # Full perspective analysis
│   ├── track-allocation.json         # Track assignments
│   └── platform-requirements.json    # Expected platforms (AD-008)
├── wave-1/                           # Wave 1 agent outputs
├── wave-2/                           # Wave 2 specialist outputs (conditional)
└── final-synthesis.md                # Final output (Phase 3)
```

**Session ID Format:** `YYYYMMDD-HHMMSS-PID` (e.g., `20251225-153655-10300`)

### Phase 1 Outputs

**Files Created:**
- `$SESSION_DIR/analysis/query-analysis.json`
- `$SESSION_DIR/analysis/track-allocation.json`
- `$SESSION_DIR/analysis/platform-requirements.json`

**Variables Passed to Phase 2:**
- `SESSION_DIR` - Session directory path
- `WAVE1_COUNT` - Number of Wave 1 agents (4-6)

---

## Phase 2: Collect

**Command:** `/_research-collect $SESSION_DIR`

**Purpose:** Execute research collection and validation through two sub-phases

### Sub-Phase 2a: Execute (`/_research-collect-execute`)

#### Step 2.1: Launch Wave 1 Agents

**Agent Allocation:** Based on perspectives from Phase 1

```typescript
// Extract perspectives with assigned agents
perspectives.forEach(perspective => {
  Task({
    subagent_type: perspective.recommendedAgent,  // e.g., "claude-researcher"
    description: `Research: ${perspective.text.substring(0, 50)}`,
    prompt: `
      **YOUR AGENT IDENTITY**
      Agent: ${perspective.recommendedAgent}

      **YOUR ASSIGNED PERSPECTIVE**
      ${perspective.text}

      **YOUR RESEARCH TRACK: ${perspective.track}**
      ${getTrackInstructions(perspective.track)}

      **YOUR RESEARCH TOOL (MANDATORY)**
      ${getAgentToolBlock(perspective.recommendedAgent)}

      **STRUCTURED OUTPUT REQUIREMENTS**

      At the TOP of your research file, include:

      ---
      agent_type: ${perspective.recommendedAgent}
      wave: 1
      query_focus: [your specific focus]
      execution_time: [timestamp]
      track: ${perspective.track}
      ---

      ## Structured Metadata

      ### 1. Confidence Score (0-100)
      **Your Score:** [NUMBER]
      **Reasoning:** [Why this score?]

      ### 2. Coverage Assessment
      - **Thoroughly Covered:** [What you covered well]
      - **Limited Coverage:** [What you found limited info about]
      - **Alternative Domains:** [What other domains might help]

      ### 3. Domain Signals Detected
      **Signals Detected:** [LIST with frequency counts]

      ### 4. Recommended Follow-up
      [Specific questions or specialist searches needed]

      ### 5. Tool Gap Recommendations
      **Inaccessible Platforms:** [e.g., "Discord servers", "Patreon"]

      ### 6. Source Tier Distribution (M10)
      **Sources by Tier:**
      - **Tier 1 (Independent):** [count] - [list]
      - **Tier 2 (Quasi-Independent):** [count] - [list]
      - **Tier 3 (Vendor):** [count] - [list + JUSTIFY if on INDEPENDENT track]
      - **Tier 4 (Suspect):** [count] - [should be 0 on INDEPENDENT track]

      **Track Compliance:** [How well you followed track guidance]

      ### 7. Platforms Searched (AD-008)
      List platforms you actually searched:
      - ✅ [Platform Name]: [Brief description of what you found]

      ## Your Research Findings

      [Detailed research output - minimum 500 characters]

      **CRITICAL:** Write to ${SESSION_DIR}/wave-1/${agent}-${topic}.md
    `
  })
})
```

**Agent Tool Constraints:**

| Agent | Primary Tool | Forbidden |
|-------|--------------|-----------|
| claude-researcher | WebSearch | - |
| gemini-researcher | Gemini OAuth CLI | WebSearch, WebFetch, Brightdata, Apify |
| grok-researcher | Grok CLI | WebSearch, WebFetch, Brightdata, Apify |
| perplexity-researcher | Perplexity CLI | WebSearch, WebFetch |

**Tool mapping file:** `${PAI_DIR}/config/agent-tool-mapping.json`

#### Step 2.2: Validate Wave 1 Results

**Validation Checks:**
1. **Length Check:** Minimum 500 characters of actual content
2. **Content Check:** Must contain findings (not just errors)
3. **Structure Check:** Verify metadata section exists
4. **Error Detection:** Check for API failures, empty results

**Retry Logic:**
- Maximum 2 retries per agent
- Same query, same agent type
- If still failing → mark as partial coverage

#### Step 2.3: Tool Conflict Detection

Scans for agents that refused due to constitutional tool violations:

```bash
CONFLICT_PATTERNS="CONSTITUTIONAL VIOLATION|FORBIDDEN|constitutional requirements|tool conflict"

for output_file in "$SESSION_DIR/wave-1"/*.md; do
  if grep -qiE "$CONFLICT_PATTERNS" "$output_file"; then
    echo "$output_file" >> "$SESSION_DIR/analysis/retry-queue.txt"
  fi
done
```

**Retry with correct tool instructions if conflicts detected**

#### Step 2.5: Quality Analysis & Pivot Decision (AUTOMATED)

**THE KEY INNOVATION - Fully automated TypeScript quality analyzer**

**Single Command:**
```bash
cd ${PAI_DIR}/utilities/quality-analyzer
bun ./cli.ts analyze "${SESSION_DIR}" --wave 1 --output both
```

**This executes all 5 components:**

**Component 1: Agent Quality Scoring**

Algorithm:
```
For each agent output file:

1. Length Score (40 points max):
   - char_count >= 2000: +40 points
   - char_count >= 1000: +25 points
   - char_count >= 500: +15 points
   - char_count < 500: +5 points

2. Source Score (30 points max):
   - source_count >= 5: +30 points
   - source_count >= 3: +20 points
   - source_count >= 1: +10 points
   - source_count = 0: +0 points

3. Confidence Score (30 points max):
   - Extract self-reported confidence from metadata
   - Normalize: (agent_confidence / 100) × 30

Total = Length + Sources + Confidence (0-100)

Quality Bands:
- 80-100: EXCELLENT
- 60-79: GOOD
- 40-59: MODERATE
- 0-39: POOR (triggers retry/replacement)
```

**Component 2: Domain Signal Detection**

```
Domain Keyword Dictionaries:
- social_media: ['twitter', 'X', 'reddit', 'linkedin', ...]
- academic: ['arxiv', 'doi:', 'peer-reviewed', 'journal', ...]
- technical: ['github', 'API', 'implementation', 'code', ...]
- multimodal: ['youtube', 'video', 'visual', 'diagram', ...]
- security: ['vulnerability', 'CVE', 'exploit', ...]
- news: ['breaking', 'latest', 'recent', ...]

For each domain:
  1. Count keyword matches (case-insensitive)
  2. Extract self-reported signals from agent metadata
  3. Weight by quality: signal_strength = matches × (quality_score / 100)

Aggregate: total_signal_strength[domain] = sum(weighted signals)

Signal Strength Bands:
- >150: STRONG → Launch 3 specialists
- 100-150: MEDIUM → Launch 2 specialists
- 50-100: WEAK → Launch 1 specialist
- <50: NO SIGNAL → Skip
```

**Component 3: Coverage Gap Analysis**

```
Extract from agent metadata:
  - "Limited Coverage" sections
  - "Alternative Domains" suggestions
  - "Tool Gaps" reports
  - "Platforms Not Searched"

Identify gaps when:
  - 2+ agents report same limitation (HIGH priority)
  - Single high-quality agent (≥80) reports gap (MEDIUM priority)

Map gaps to specialists:
  - "LinkedIn" / "professional networks" → perplexity-researcher
  - "Academic papers" → perplexity-researcher (independent track)
  - "Code" / "GitHub" → claude-researcher
  - "Videos" / "visuals" → gemini-researcher
  - "Twitter" / "X" → grok-researcher
```

**Component 4: Platform Coverage Validation (AD-008)**

```
Load: $SESSION_DIR/analysis/wave-1-platform-coverage.json

For each perspective:
  expected_platforms = perspective.platforms  // From Phase 1
  searched_platforms = agent.platformsSearched  // From metadata

  coverage_met = any(expected in searched)

  if !coverage_met:
    uncoveredPerspectives.push(perspective)
    recommendations.push({
      agentType: inferFromPlatforms(expected_platforms),
      focus: `Platform coverage gap: ${perspective.text}`,
      platforms: platforms_missed
    })
```

**Component 5: Pivot Decision Engine**

```
Decision Rules:

1. LOW_QUALITY_RETRY:
   if any(quality_score < 40):
     → Launch replacement specialist
     priority: CRITICAL

2. STRONG_PIVOT:
   if max(domain_signal_strength) > 150:
     → Launch 3 specialists for top domain
     priority: HIGH

3. MODERATE_PIVOT:
   if max(domain_signal_strength) 100-150:
     → Launch 2 specialists
     priority: MEDIUM

4. GAPS_IDENTIFIED:
   if count(HIGH_priority_gaps) >= 2:
     → Launch specialists to fill gaps
     priority: HIGH

5. PLATFORM_GAPS (AD-008):
   if any(uncoveredPerspectives):
     → Launch specialists for missing platforms
     priority: HIGH

6. SUFFICIENT_COVERAGE:
   if all(quality >= 60) AND max(signals) < 100 AND gaps == 0:
     → Skip Wave 2
     decision: NO WAVE 2

Aggregate specialists:
  - Deduplicate by (agentType, track)
  - Merge rationales and platforms
  - Keep highest priority
  - Generate allocation map

Output:
  shouldLaunchWave2: boolean
  confidence: number (0-100)
  rationale: string[]
  specialists: SpecialistRecommendation[]
  specialistAllocation: Record<AgentType, number>
```

**Generated Files:**
- `${SESSION_DIR}/analysis/wave-1-quality-analysis.json` - Full analysis
- `${SESSION_DIR}/analysis/wave-1-quality-analysis.md` - Human-readable
- `${SESSION_DIR}/analysis/wave-1-pivot-decision.json` - Decision for Wave 2

#### Step 2.6: Source Quality Evaluation (M10)

**Extract URLs and analyze source balance:**

```bash
# Extract all URLs from Wave 1 outputs
grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md | sort -u > "$SESSION_DIR/analysis/wave1-urls.txt"

# Run balance analyzer
cd ${PAI_DIR}/utilities/query-analyzer
bun -e "
const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
const fs = require('fs');

const urls = fs.readFileSync('$SESSION_DIR/analysis/wave1-urls.txt', 'utf-8')
  .split('\n').filter(u => u.trim());

const report = analyzeSourceBalance(urls);
fs.writeFileSync('$SESSION_DIR/analysis/source-quality-report.json', JSON.stringify(report, null, 2));
fs.writeFileSync('$SESSION_DIR/analysis/source-quality-report.md', generateMarkdownReport(report));
"
```

**Quality Gate Evaluation:**

```bash
bun -e "
const { evaluateQualityGate } = require('${PAI_DIR}/utilities/query-analyzer/source-tiers/quality-gate');
const report = require('$SESSION_DIR/analysis/source-quality-report.json');

const trackType = 'standard';  // or 'independent', 'contrarian'
const gate = evaluateQualityGate(report.citations, trackType);

console.log(JSON.stringify(gate, null, 2));
" > "$SESSION_DIR/analysis/quality-gate.json"
```

**Quality Gate Rules:**
- **Vendor % >40%:** Rebalancing needed (launch independent track agents)
- **Independent % <10%:** More Tier 1 sources needed
- **Tier 4 >0 on independent track:** CRITICAL - replace sources

#### Step 3.5: Launch Wave 2 (Conditional)

**Only if pivot decision says `shouldLaunchWave2: true`**

```bash
PIVOT_DECISION=$(cat "${SESSION_DIR}/analysis/wave-1-pivot-decision.json")
SHOULD_LAUNCH=$(echo "$PIVOT_DECISION" | jq -r '.shouldLaunchWave2')

if [ "$SHOULD_LAUNCH" = "true" ]; then
  # Extract specialist allocation
  PERPLEXITY_COUNT=$(echo "$PIVOT_DECISION" | jq -r '.specialistAllocation["perplexity-researcher"]')
  CLAUDE_COUNT=$(echo "$PIVOT_DECISION" | jq -r '.specialistAllocation["claude-researcher"]')
  GEMINI_COUNT=$(echo "$PIVOT_DECISION" | jq -r '.specialistAllocation["gemini-researcher"]')
  GROK_COUNT=$(echo "$PIVOT_DECISION" | jq -r '.specialistAllocation["grok-researcher"]')

  # Launch specialists in parallel (same pattern as Wave 1)
  # Each specialist gets specific focus from recommendations
fi
```

**Wave 2 Specialist Prompts:**
- Include context: "Wave 1 found X, you should focus on Y"
- Reference specific gaps: "3 agents reported missing Z"
- Provide rationale: "Social media signal strength 185 (STRONG)"

### Sub-Phase 2b: Validate (`/_research-collect-validate`)

**⚠️ MANDATORY - DO NOT SKIP**

#### Step 2.7a: Extract Citations

Extract all citations from Wave 1 and Wave 2 outputs:

```bash
# Extract IEEE-style citations [N] or markdown links
grep -E '\[[0-9]+\]|http[s]?://[^[:space:])\]]+' "$SESSION_DIR"/wave-*/*.md > "$SESSION_DIR/analysis/raw-citations.txt"

# Parse and structure
bun ${PAI_DIR}/utilities/citation-validator/extract-citations.ts \
  --session "$SESSION_DIR" \
  --waves "1,2" \
  --output "$SESSION_DIR/analysis/extracted-citations.json"
```

**Citation Structure:**
```typescript
interface Citation {
  id: string;              // e.g., "[1]" or auto-generated
  url: string;             // Full URL
  title?: string;          // Page title (if extractable)
  sourceAgent: string;     // Which agent cited this
  sourceWave: 1 | 2;       // Which wave
  contexts: string[];      // Surrounding text where cited
}
```

#### Step 2.7b: Validate Citations

**URL Accessibility Check:**
```bash
bun ${PAI_DIR}/utilities/citation-validator/validate-urls.ts \
  --citations "$SESSION_DIR/analysis/extracted-citations.json" \
  --output "$SESSION_DIR/analysis/validated-citations.json" \
  --timeout 10000
```

**Validation Checks:**
1. **HTTP Status:** 200 OK (or 30x redirect)
2. **Content Type:** text/html or application/pdf
3. **Page Title:** Extractable (not "404" or "Error")
4. **Robots:** Respects robots.txt

**Validation States:**
- **VALID:** Passed all checks
- **INACCESSIBLE:** 404, 403, 500, timeout
- **SUSPICIOUS:** Robots disallowed, redirect to different domain
- **INVALID:** Malformed URL, non-HTTP protocol

#### Step 2.7c: Hallucination Tracking

Track which agents fabricated citations:

```bash
# Count invalid citations per agent
bun -e "
const citations = require('$SESSION_DIR/analysis/validated-citations.json');

const byAgent = {};
citations.forEach(c => {
  if (!byAgent[c.sourceAgent]) byAgent[c.sourceAgent] = { valid: 0, invalid: 0 };
  if (c.validationState === 'VALID') byAgent[c.sourceAgent].valid++;
  else byAgent[c.sourceAgent].invalid++;
});

console.log(JSON.stringify(byAgent, null, 2));
" > "$SESSION_DIR/analysis/hallucination-report.json"
```

#### Step 2.7d: Generate Validated Pool

Create citation pool for synthesis (M11):

```bash
# Filter only VALID citations
jq '[.[] | select(.validationState == "VALID")]' \
  "$SESSION_DIR/analysis/validated-citations.json" \
  > "$SESSION_DIR/analysis/validated-citations-pool.json"

# Generate markdown format for synthesis
bun ${PAI_DIR}/utilities/citation-validator/format-pool.ts \
  --pool "$SESSION_DIR/analysis/validated-citations-pool.json" \
  --output "$SESSION_DIR/analysis/validated-citations-pool.md"
```

**Validated Pool Format:**
```markdown
# Validated Citations Pool

**Total Citations:** 128
**Valid Citations:** 115 (89.8%)
**Invalid Citations:** 13 (10.2%)

## Valid Citations

### [1] Anthropic Claude Documentation
**URL:** https://docs.anthropic.com/claude/docs
**Source:** perplexity-1 (Wave 1)
**Context:** "Claude's function calling capabilities allow..."

### [2] OpenAI API Reference
**URL:** https://platform.openai.com/docs/api-reference
**Source:** claude-1 (Wave 1)
**Context:** "The chat completions endpoint supports..."

[... continue for all valid citations ...]
```

### Phase 2 Outputs

**Files Created:**
- `$SESSION_DIR/wave-1/*.md` - Wave 1 agent outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 specialist outputs (if launched)
- `$SESSION_DIR/analysis/wave-1-quality-analysis.json` - Quality scores
- `$SESSION_DIR/analysis/wave-1-quality-analysis.md` - Human-readable report
- `$SESSION_DIR/analysis/wave-1-pivot-decision.json` - Pivot decision
- `$SESSION_DIR/analysis/source-quality-report.json` - M10 source balance
- `$SESSION_DIR/analysis/source-quality-report.md` - Human-readable M10 report
- `$SESSION_DIR/analysis/validated-citations-pool.json` - Valid citations only
- `$SESSION_DIR/analysis/validated-citations-pool.md` - Markdown pool
- `$SESSION_DIR/analysis/hallucination-report.json` - Invalid citations by agent

**Quality Gates:**
- ✅ Wave 1 files exist
- ✅ Total validated citations ≥ 50
- ✅ Invalid citation rate < 20%
- ✅ Pivot decision completed

---

## Phase 3: Synthesize

**Command:** `/_research-synthesize $SESSION_DIR`

**Purpose:** Generate comprehensive synthesis from all wave findings

### Step 3.1: Citation Pooling (M11)

Load validated citation pool from Phase 2:

```bash
CITATION_POOL=$(cat "$SESSION_DIR/analysis/validated-citations-pool.json")
VALID_CITATION_COUNT=$(echo "$CITATION_POOL" | jq 'length')

echo "📊 Loaded $VALID_CITATION_COUNT validated citations for synthesis"
```

**De-duplication:**
- Same URL → merge contexts from multiple agents
- Similar URLs (different params) → consolidate
- Broken duplicates → use first valid instance

### Step 3.2: Pre-Synthesis Condensation (M12)

Condense agent outputs to summaries for synthesis context:

```bash
for file in "$SESSION_DIR"/wave-*/*.md; do
  AGENT=$(basename "$file" .md)

  # Extract key findings (skip metadata)
  SUMMARY=$(tail -n +50 "$file" | head -n 500)

  echo "## $AGENT Summary" >> "$SESSION_DIR/analysis/condensed-summaries.md"
  echo "$SUMMARY" >> "$SESSION_DIR/analysis/condensed-summaries.md"
  echo "" >> "$SESSION_DIR/analysis/condensed-summaries.md"
done
```

**Why condense?**
- Full agent outputs: 50-100KB total
- Condensed summaries: 15-20KB total
- Synthesis agent context: Fits within limits

### Step 3.3: Generate Synthesis

Launch synthesis agent with condensed context and citation pool:

```typescript
Task({
  subagent_type: "synthesis-researcher",  // Specialized synthesis agent
  description: "Generate final synthesis",
  prompt: `
    **YOUR TASK: Generate comprehensive research synthesis**

    **SOURCES:**
    You have findings from ${WAVE1_COUNT} Wave 1 agents and ${WAVE2_COUNT} Wave 2 specialists.

    **CONDENSED SUMMARIES:**
    ${CONDENSED_SUMMARIES}  // 15-20KB of key findings

    **VALIDATED CITATIONS POOL (${VALID_CITATION_COUNT} citations):**
    ${CITATION_POOL_MD}  // Pre-validated citations only

    **CRITICAL SYNTHESIS REQUIREMENTS:**

    1. **Structure (6 Required Parts):**
       - Part 1: Executive Summary
       - Part 2: Core Findings (main research results)
       - Part 3: Methodology (how research was conducted)
       - Part 4: Detailed Analysis (deep dive into findings)
       - Part 5: Limitations & Future Work
       - Part 6: References (ALL citations used)

    2. **Citation Requirements:**
       - Use ONLY citations from the validated pool above
       - DO NOT fabricate URLs or references
       - Inline citations: [N] format (IEEE style)
       - Aim for 60%+ citation utilization
       - Minimum 1 citation per major claim

    3. **Length Requirements:**
       - Target: 15-40KB (3,000-8,000 words)
       - Minimum: 15KB
       - Maximum: 50KB

    4. **Wave Attribution:**
       - Clearly indicate which findings come from Wave 1 vs Wave 2
       - Example: "Wave 1 exploration found... while Wave 2 specialists revealed..."

    5. **Confidence Levels:**
       - HIGH: Confirmed by 3+ agents, multiple sources
       - MEDIUM: Confirmed by 2 agents, good sources
       - LOW: Single agent, limited sources

    **WRITE TO:** ${SESSION_DIR}/final-synthesis.md

    **OUTPUT FORMAT:**

    # [Research Topic]

    **Research Date:** ${DATE}
    **Methodology:** Adaptive two-wave research (Wave 1: ${WAVE1_COUNT} agents, Wave 2: ${WAVE2_COUNT} specialists)
    **Citations:** ${VALID_CITATION_COUNT} validated sources

    ## Part 1: Executive Summary

    [3-5 paragraph overview of key findings]

    ## Part 2: Core Findings

    [Main research results with citations [N]]

    ## Part 3: Methodology

    ### Wave 1: Exploration (${WAVE1_COUNT} agents)
    [Description of broad exploration approach]

    ### Wave 2: Specialists (${WAVE2_COUNT} agents)
    [Description of targeted specialist research]

    ### Citation Validation
    [How sources were validated]

    ## Part 4: Detailed Analysis

    [Deep dive with subsections, heavily cited]

    ## Part 5: Limitations & Future Work

    ### Limitations
    - [What couldn't be fully researched]
    - [Coverage gaps that remain]

    ### Future Research Directions
    - [Questions that emerged]
    - [Areas needing deeper investigation]

    ## Part 6: References

    [1] [Full citation with URL]
    [2] [Full citation with URL]
    ...
    [${VALID_CITATION_COUNT}] [Full citation with URL]
  `
})
```

### Step 3.4: Verify Synthesis

```bash
# Check file exists and meets size requirements
SYNTHESIS_SIZE=$(wc -c < "$SESSION_DIR/final-synthesis.md")
MIN_SIZE=15360  # 15KB
MAX_SIZE=51200  # 50KB

if [ $SYNTHESIS_SIZE -lt $MIN_SIZE ]; then
  echo "⚠️ Warning: Synthesis too small ($SYNTHESIS_SIZE bytes < $MIN_SIZE)"
elif [ $SYNTHESIS_SIZE -gt $MAX_SIZE ]; then
  echo "⚠️ Warning: Synthesis too large ($SYNTHESIS_SIZE bytes > $MAX_SIZE)"
else
  echo "✅ Synthesis size acceptable: $SYNTHESIS_SIZE bytes"
fi
```

### Phase 3 Outputs

**Files Created:**
- `$SESSION_DIR/analysis/condensed-summaries.md` - Agent summaries
- `$SESSION_DIR/final-synthesis.md` - Final output (15-40KB)

**Quality Gates:**
- ✅ Synthesis file exists
- ✅ File size 15-40KB
- ✅ All 6 parts present

---

## Phase 4: Validate

**Command:** `/_research-validate $SESSION_DIR`

**Purpose:** Quality assurance on final synthesis

### Step 4.1: Citation Utilization Check

```bash
# Count citations in synthesis
SYNTHESIS_CITATIONS=$(grep -oE '\[[0-9]+\]' "$SESSION_DIR/final-synthesis.md" | sort -u | wc -l)

# Calculate utilization
UTILIZATION=$(echo "scale=2; $SYNTHESIS_CITATIONS / $VALID_CITATION_COUNT * 100" | bc)

echo "📊 Citation Utilization: $SYNTHESIS_CITATIONS / $VALID_CITATION_COUNT ($UTILIZATION%)"

if (( $(echo "$UTILIZATION >= 60" | bc -l) )); then
  echo "✅ Citation utilization meets threshold (≥60%)"
else
  echo "⚠️ Warning: Low citation utilization ($UTILIZATION% < 60%)"
fi
```

### Step 4.2: Structure Validation

```bash
# Check for required parts
REQUIRED_PARTS=(
  "Part 1: Executive Summary"
  "Part 2: Core Findings"
  "Part 3: Methodology"
  "Part 4: Detailed Analysis"
  "Part 5: Limitations"
  "Part 6: References"
)

MISSING_PARTS=()
for part in "${REQUIRED_PARTS[@]}"; do
  if ! grep -q "$part" "$SESSION_DIR/final-synthesis.md"; then
    MISSING_PARTS+=("$part")
  fi
done

if [ ${#MISSING_PARTS[@]} -eq 0 ]; then
  echo "✅ All 6 required parts present"
else
  echo "⚠️ Missing parts: ${MISSING_PARTS[*]}"
fi
```

### Step 4.3: Citation Density Analysis

```bash
# Calculate citations per 1000 words
WORD_COUNT=$(wc -w < "$SESSION_DIR/final-synthesis.md")
CITATION_DENSITY=$(echo "scale=2; $SYNTHESIS_CITATIONS / ($WORD_COUNT / 1000)" | bc)

echo "📊 Citation Density: $CITATION_DENSITY citations per 1000 words"

if (( $(echo "$CITATION_DENSITY >= 1.0" | bc -l) )); then
  echo "✅ Citation density acceptable (≥1.0)"
else
  echo "⚠️ Warning: Low citation density ($CITATION_DENSITY < 1.0)"
fi
```

### Step 4.4: Generate Validation Report

```bash
cat > "$SESSION_DIR/analysis/validation-report.md" << EOF
# Synthesis Validation Report

**Generated:** $(date)

## Metrics

- **Citation Utilization:** $SYNTHESIS_CITATIONS / $VALID_CITATION_COUNT ($UTILIZATION%)
- **Citation Density:** $CITATION_DENSITY per 1000 words
- **Word Count:** $WORD_COUNT
- **File Size:** $SYNTHESIS_SIZE bytes

## Structure Check

$( [ ${#MISSING_PARTS[@]} -eq 0 ] && echo "✅ All 6 required parts present" || echo "⚠️ Missing: ${MISSING_PARTS[*]}" )

## Quality Gates

- Citation Utilization ≥60%: $( (( $(echo "$UTILIZATION >= 60" | bc -l) )) && echo "✅ PASS" || echo "❌ FAIL" )
- Citation Density ≥1.0: $( (( $(echo "$CITATION_DENSITY >= 1.0" | bc -l) )) && echo "✅ PASS" || echo "❌ FAIL" )
- All Parts Present: $( [ ${#MISSING_PARTS[@]} -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL" )

## Overall Status

$(
  if (( $(echo "$UTILIZATION >= 60" | bc -l) )) && \
     (( $(echo "$CITATION_DENSITY >= 1.0" | bc -l) )) && \
     [ ${#MISSING_PARTS[@]} -eq 0 ]; then
    echo "✅ PASSED - Research meets quality standards"
  else
    echo "⚠️ WARNINGS - See details above"
  fi
)
EOF
```

### Phase 4 Outputs

**Files Created:**
- `$SESSION_DIR/analysis/validation-report.md`

**Quality Gates:**
- ✅ Citation utilization ≥ 60%
- ✅ Citation density ≥ 1.0
- ✅ All 6 parts present

---

## Quality Analyzer System

**Location:** `${PAI_DIR}/utilities/quality-analyzer/`

### Architecture

```
quality-analyzer/
├── types.ts                      # Shared type definitions
├── agent-quality-scorer.ts       # Component 1: 0-100 scoring
├── domain-signal-detector.ts     # Component 2: Keyword detection
├── coverage-gap-analyzer.ts      # Component 3: Metadata extraction
├── platform-coverage-validator.ts # Component 4: AD-008 validation
├── pivot-decision-engine.ts      # Component 5: Decision matrix
├── cli.ts                        # Command-line interface
└── index.ts                      # Module exports
```

### Usage

**Standalone:**
```bash
cd ${PAI_DIR}/utilities/quality-analyzer
bun ./cli.ts analyze /path/to/session --wave 1
```

**Programmatic:**
```typescript
import { makePivotDecision, scoreWave, detectWaveSignals } from '${PAI_DIR}/utilities/quality-analyzer';

const quality = await scoreWave(sessionDir, 1);
const signals = await detectWaveSignals(sessionDir, 1, quality.scores);
const decision = await makePivotDecision({ sessionDir, wave: 1, quality, signals, ... });
```

### CLI Commands

```bash
# Full analysis (all components)
quality-analyzer analyze <session-dir> [--wave N] [--output json|markdown|both]

# Individual components
quality-analyzer score <session-dir> --wave N      # Quality scoring only
quality-analyzer signals <session-dir> --wave N    # Domain signals only
quality-analyzer gaps <session-dir> --wave N       # Coverage gaps only
quality-analyzer pivot <session-dir> --wave N      # Pivot decision only

# Help
quality-analyzer help
```

### Configuration

**Default Pivot Config:**
```typescript
export const DEFAULT_PIVOT_CONFIG = {
  retryThreshold: 40,                  // Score <40 triggers retry
  wave2ConsiderationThreshold: 60,     // Avg <60 considers Wave 2
  highSignalThreshold: 150,            // Signal >150 = 3 specialists
  mediumSignalThreshold: 100,          // Signal 100-150 = 2 specialists
  gapCountThreshold: 2,                // ≥2 gaps triggers Wave 2
  platformCoverageThreshold: 0,        // Any =0% triggers Wave 2
  vendorPercentageThreshold: 40,       // Vendor >40% needs rebalancing
  independentMinimum: 10,              // Independent <10% needs boost
};
```

**Keyword Dictionaries:**
```typescript
export const DEFAULT_KEYWORD_DICTIONARIES = {
  social_media: ['twitter', 'x.com', 'reddit', 'linkedin', 'tiktok', ...],
  academic: ['arxiv', 'doi:', 'peer-reviewed', 'journal', 'citation', ...],
  technical: ['github', 'gitlab', 'stackoverflow', 'API', 'code', ...],
  multimodal: ['youtube', 'video', 'visual', 'tutorial', 'demo', ...],
  security: ['vulnerability', 'CVE', 'exploit', 'penetration test', ...],
  news: ['breaking news', 'latest', 'recent', 'trending', ...],
};
```

---

## Citation Validation System

**Location:** `${PAI_DIR}/.claude/skills/CitationValidation/`

### Workflow

```
Agent Outputs
      │
      ├─► Extract Citations
      │   └─► extracted-citations.json
      │
      ├─► Validate URLs
      │   ├─► HTTP status check
      │   ├─► Content type check
      │   ├─► Title extraction
      │   └─► validated-citations.json
      │
      ├─► Track Hallucinations
      │   └─► hallucination-report.json
      │
      └─► Generate Pool
          └─► validated-citations-pool.md
```

### Citation Extraction

**Supported Formats:**
- IEEE style: `[1]`, `[42]`
- Markdown links: `[title](url)`
- Bare URLs: `https://example.com/path`

**Extraction Algorithm:**
```typescript
interface Citation {
  id: string;              // [N] or auto-generated
  url: string;             // Normalized URL
  title?: string;          // Extracted from page or link text
  sourceAgent: string;     // Which agent cited
  sourceWave: 1 | 2;       // Which wave
  contexts: string[];      // Surrounding text
  validationState: 'PENDING' | 'VALID' | 'INVALID' | 'INACCESSIBLE';
}

function extractCitations(agentOutput: string): Citation[] {
  // 1. Find IEEE citations [N]
  const ieeeCitations = agentOutput.matchAll(/\[(\d+)\]/g);

  // 2. Find markdown links [text](url)
  const mdLinks = agentOutput.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);

  // 3. Find bare URLs
  const bareUrls = agentOutput.matchAll(/https?:\/\/[^\s)]+/g);

  // 4. Consolidate and de-duplicate
  return consolidate([...ieeeCitations, ...mdLinks, ...bareUrls]);
}
```

### URL Validation

**Validation Steps:**
```typescript
async function validateURL(url: string): Promise<ValidationResult> {
  try {
    // Step 1: HTTP request (10s timeout)
    const response = await fetch(url, {
      timeout: 10000,
      redirect: 'follow'
    });

    // Step 2: Check status
    if (!response.ok) {
      return { state: 'INACCESSIBLE', reason: `HTTP ${response.status}` };
    }

    // Step 3: Check content type
    const contentType = response.headers.get('content-type');
    if (!['text/html', 'application/pdf'].some(t => contentType?.includes(t))) {
      return { state: 'SUSPICIOUS', reason: `Unexpected content type: ${contentType}` };
    }

    // Step 4: Extract title (for HTML)
    if (contentType?.includes('text/html')) {
      const html = await response.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch?.[1] || '';

      // Check for error page titles
      if (['404', 'Not Found', 'Error'].some(err => title.includes(err))) {
        return { state: 'INACCESSIBLE', reason: 'Error page detected' };
      }

      return { state: 'VALID', title };
    }

    return { state: 'VALID' };

  } catch (error) {
    return { state: 'INACCESSIBLE', reason: error.message };
  }
}
```

### Hallucination Tracking

**Agent Scoring:**
```typescript
interface AgentHallucinationScore {
  agentId: string;
  wave: 1 | 2;
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  inaccessibleCitations: number;
  validationRate: number;  // valid / total (0-100)
  hallucinationRate: number;  // invalid / total (0-100)
}

function trackHallucinations(citations: Citation[]): AgentHallucinationScore[] {
  const byAgent = groupBy(citations, c => c.sourceAgent);

  return Object.entries(byAgent).map(([agentId, cites]) => ({
    agentId,
    wave: cites[0].sourceWave,
    totalCitations: cites.length,
    validCitations: cites.filter(c => c.validationState === 'VALID').length,
    invalidCitations: cites.filter(c => c.validationState === 'INVALID').length,
    inaccessibleCitations: cites.filter(c => c.validationState === 'INACCESSIBLE').length,
    validationRate: (cites.filter(c => c.validationState === 'VALID').length / cites.length) * 100,
    hallucinationRate: (cites.filter(c => c.validationState === 'INVALID').length / cites.length) * 100,
  }));
}
```

**Thresholds:**
- **Hallucination rate >20%:** CRITICAL - agent may be fabricating sources
- **Validation rate <50%:** WARNING - poor source quality
- **Validation rate ≥80%:** EXCELLENT - reliable agent

---

## Source Quality Framework (M10)

**Purpose:** Ensure research draws from diverse, credible sources

### Source Tier Classification

**Tier 1 (Independent):**
- Academic papers (arxiv.org, ACM, IEEE)
- Standards bodies (NIST, OWASP, IETF, W3C)
- Independent researchers (personal blogs, GitHub)
- Government research (CISA, NSA, RAND)

**Tier 2 (Quasi-Independent):**
- Industry associations
- News outlets (Reuters, BBC, NYT)
- Non-profit organizations
- Conference proceedings

**Tier 3 (Vendor):**
- Product vendors (AWS, Microsoft, Google)
- Cloud providers
- Consulting firms
- Tech blogs (company-sponsored)

**Tier 4 (Suspect):**
- SEO content farms
- Affiliate marketing sites
- Unverified aggregators
- AI-generated content sites

### Classification Algorithm

```typescript
function classifySourceTier(url: string): SourceTier {
  const domain = new URL(url).hostname;

  // Tier 1 patterns
  if (/arxiv\.org|doi\.org|ieee\.org|acm\.org/.test(domain)) return 'tier1';
  if (/nist\.gov|owasp\.org|ietf\.org|w3\.org/.test(domain)) return 'tier1';
  if (/github\.com\/[^\/]+\/[^\/]+\/(?:blob|tree)/.test(url)) return 'tier1';  // Actual repos

  // Tier 2 patterns
  if (/reuters\.com|bbc\.co\.uk|nytimes\.com|theguardian\.com/.test(domain)) return 'tier2';
  if (/stackoverflow\.com|reddit\.com/.test(domain)) return 'tier2';

  // Tier 3 patterns (vendors)
  if (/aws\.amazon\.com|microsoft\.com|google\.com\/cloud/.test(domain)) return 'tier3';
  if (/blog\.|medium\.com/.test(domain) && isCompanyBlog(url)) return 'tier3';

  // Tier 4 patterns (suspect)
  if (/\.xyz|\.top|\.click/.test(domain)) return 'tier4';  // Suspicious TLDs
  if (hasExcessiveAds(url)) return 'tier4';

  // Default: Tier 3 (assume vendor unless proven otherwise)
  return 'tier3';
}
```

### Balance Analysis

```typescript
interface SourceQualityReport {
  totalSources: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  tier1Percentage: number;       // Independent %
  tier2Percentage: number;       // Quasi-independent %
  tier3Percentage: number;       // Vendor %
  tier4Percentage: number;       // Suspect %
  independentPercentage: number; // Tier 1 + Tier 2
  vendorPercentage: number;      // Tier 3
  balance: 'excellent' | 'good' | 'acceptable' | 'poor';
}

function analyzeSourceBalance(urls: string[]): SourceQualityReport {
  const tiers = urls.map(classifySourceTier);

  const tier1Count = tiers.filter(t => t === 'tier1').length;
  const tier2Count = tiers.filter(t => t === 'tier2').length;
  const tier3Count = tiers.filter(t => t === 'tier3').length;
  const tier4Count = tiers.filter(t => t === 'tier4').length;

  const independentPercentage = ((tier1Count + tier2Count) / urls.length) * 100;
  const vendorPercentage = (tier3Count / urls.length) * 100;

  let balance: SourceQualityReport['balance'];
  if (tier1Count >= tier3Count && tier4Count === 0) balance = 'excellent';
  else if (independentPercentage >= 40 && tier4Count === 0) balance = 'good';
  else if (vendorPercentage <= 60 && tier4Count === 0) balance = 'acceptable';
  else balance = 'poor';

  return {
    totalSources: urls.length,
    tier1Count, tier2Count, tier3Count, tier4Count,
    tier1Percentage: (tier1Count / urls.length) * 100,
    tier2Percentage: (tier2Count / urls.length) * 100,
    tier3Percentage: (tier3Count / urls.length) * 100,
    tier4Percentage: (tier4Count / urls.length) * 100,
    independentPercentage,
    vendorPercentage,
    balance,
  };
}
```

### Track Allocation (50/25/25)

**Standard Track (50%):**
- Any source tier acceptable
- Focus on quality and relevance
- Balanced vendor/independent mix

**Independent Track (25%):**
- Prefer Tier 1 sources (academic, standards)
- Tier 2 acceptable
- Avoid Tier 3 unless justified
- NEVER use Tier 4

**Contrarian Track (25%):**
- Seek opposing viewpoints
- Critical analyses
- "What could go wrong" perspectives
- Vendor criticisms acceptable

### Quality Gate Evaluation

```typescript
function evaluateQualityGate(
  citations: Citation[],
  trackType: 'standard' | 'independent' | 'contrarian'
): QualityGateResult {
  const report = analyzeSourceBalance(citations.map(c => c.url));

  const issues: string[] = [];
  let passed = true;

  // Check vendor percentage
  if (report.vendorPercentage > 40) {
    issues.push(`Vendor sources ${report.vendorPercentage}% > 40% threshold`);
    passed = false;
  }

  // Check independent minimum
  if (report.independentPercentage < 10) {
    issues.push(`Independent sources ${report.independentPercentage}% < 10% minimum`);
    passed = false;
  }

  // Check Tier 4 presence
  if (report.tier4Count > 0) {
    issues.push(`Suspect sources detected: ${report.tier4Count}`);
    passed = false;
  }

  // Track-specific checks
  if (trackType === 'independent' && report.tier1Percentage < 50) {
    issues.push(`Independent track requires ≥50% Tier 1, got ${report.tier1Percentage}%`);
    passed = false;
  }

  return {
    passed,
    report,
    issues,
    recommendations: generateRebalancingRecommendations(report, trackType),
  };
}
```

---

## Platform Coverage Validation (AD-008)

**Purpose:** Ensure expected platforms were actually searched

### Expected Platform Generation

**During Phase 1 (query analysis):**

```typescript
interface EnhancedPerspective {
  text: string;
  domain: DomainName;
  platforms?: Platform[];  // Expected platforms for this perspective
}

interface Platform {
  name: string;           // e.g., "LinkedIn", "arXiv", "GitHub"
  reason: string;         // Why this platform is expected
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

function inferExpectedPlatforms(perspective: EnhancedPerspective): Platform[] {
  const platforms: Platform[] = [];

  switch (perspective.domain) {
    case 'academic':
      platforms.push(
        { name: 'arXiv', reason: 'Academic papers', priority: 'HIGH' },
        { name: 'Google Scholar', reason: 'Citation database', priority: 'MEDIUM' }
      );
      break;

    case 'social_media':
      platforms.push(
        { name: 'X/Twitter', reason: 'Real-time discussions', priority: 'HIGH' },
        { name: 'Reddit', reason: 'Community discussions', priority: 'MEDIUM' }
      );
      break;

    case 'technical':
      platforms.push(
        { name: 'GitHub', reason: 'Code repositories', priority: 'HIGH' },
        { name: 'Stack Overflow', reason: 'Technical Q&A', priority: 'MEDIUM' }
      );
      break;

    case 'multimodal':
      platforms.push(
        { name: 'YouTube', reason: 'Video tutorials', priority: 'HIGH' }
      );
      break;
  }

  return platforms;
}
```

### Actual Platform Extraction

**Agents report platforms searched in metadata:**

```markdown
### 7. Platforms Searched (AD-008)

- ✅ arXiv: Searched for academic papers on AI agents, found 12 results
- ✅ Google Scholar: Searched for citations, found 8 papers
- ❌ IEEE Xplore: No access to paid database
```

**Extraction:**
```typescript
function extractSearchedPlatforms(agentOutput: string): string[] {
  const platformLines = agentOutput.match(/^- ✅ ([^:]+):/gm) || [];
  return platformLines.map(line => line.replace(/^- ✅ /, '').split(':')[0].trim());
}
```

### Coverage Validation

```typescript
interface PerspectiveCoverage {
  perspective: string;
  platforms_expected: string[];
  platforms_searched: string[];
  platforms_missed: string[];
  coverage_percent: number;
  coverage_met: boolean;
  potential_insights: string;
}

function validatePlatformCoverage(
  perspective: EnhancedPerspective,
  agentOutput: string
): PerspectiveCoverage {
  const expected = perspective.platforms?.map(p => p.name) || [];
  const searched = extractSearchedPlatforms(agentOutput);

  const missed = expected.filter(e => !searched.some(s => s.includes(e)));
  const coveragePercent = ((expected.length - missed.length) / expected.length) * 100;

  return {
    perspective: perspective.text,
    platforms_expected: expected,
    platforms_searched: searched,
    platforms_missed: missed,
    coverage_percent: Math.round(coveragePercent),
    coverage_met: coveragePercent > 0,  // At least 1 platform searched
    potential_insights: missed.length > 0
      ? `Missing platforms: ${missed.join(', ')}. These could provide additional insights on ${perspective.text}`
      : 'All expected platforms searched',
  };
}
```

### Wave 2 Trigger

```typescript
function shouldTriggerWave2ForPlatforms(
  coverageResults: PerspectiveCoverage[]
): {
  triggered: boolean;
  reason: string;
  recommendations: SpecialistRecommendation[];
} {
  const uncovered = coverageResults.filter(c => !c.coverage_met);

  if (uncovered.length === 0) {
    return {
      triggered: false,
      reason: 'All perspectives have adequate platform coverage',
      recommendations: [],
    };
  }

  const recommendations: SpecialistRecommendation[] = uncovered.map(c => ({
    agentType: inferAgentFromPlatforms(c.platforms_missed),
    track: 'standard',
    focus: `Platform coverage gap: ${c.perspective}`,
    platforms: c.platforms_missed,
    rationale: c.potential_insights,
    priority: 'HIGH',
    source: 'platform_gap',
  }));

  return {
    triggered: true,
    reason: `${uncovered.length} perspective(s) have 0% platform coverage`,
    recommendations,
  };
}
```

---

## Decision Algorithms

### Complexity Scoring

```typescript
function analyzeComplexity(query: string): {
  complexity: 'simple' | 'moderate' | 'complex';
  agentCount: number;
  rationale: string;
} {
  let score = 0;

  // Length signals
  if (query.length > 200) score += 2;
  else if (query.length > 100) score += 1;

  // Multiple questions
  const questions = query.match(/\?/g)?.length || 0;
  score += questions;

  // Technical indicators
  const techKeywords = ['architecture', 'implementation', 'algorithm', 'system', 'framework'];
  score += techKeywords.filter(k => query.toLowerCase().includes(k)).length;

  // Comparative indicators
  if (query.includes('vs') || query.includes('compare')) score += 1;

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex';
  let agentCount: number;

  if (score <= 2) {
    complexity = 'simple';
    agentCount = 4;
  } else if (score <= 5) {
    complexity = 'moderate';
    agentCount = 5;
  } else {
    complexity = 'complex';
    agentCount = 6;
  }

  return {
    complexity,
    agentCount,
    rationale: `Complexity score: ${score}/10 → ${complexity} → ${agentCount} agents`,
  };
}
```

### Agent Type Selection

```typescript
function selectAgentForDomain(domain: DomainName): AgentType {
  const mapping: Record<DomainName, AgentType> = {
    'academic': 'perplexity-researcher',      // Deep search, academic focus
    'technical': 'claude-researcher',         // Technical analysis, code
    'social_media': 'grok-researcher',        // X/Twitter native access
    'multimodal': 'gemini-researcher',        // Videos, images, visuals
    'security': 'perplexity-researcher',      // Security research, CVEs
    'news': 'perplexity-researcher',          // Current events, news
  };

  return mapping[domain] || 'claude-researcher';  // Default to Claude
}
```

### Specialist Allocation

```typescript
function allocateSpecialists(
  signals: DomainSignal[],
  gaps: CoverageGap[],
  platformGaps: PerspectiveCoverage[]
): Record<AgentType, number> {
  const allocation: Record<AgentType, number> = {
    'perplexity-researcher': 0,
    'claude-researcher': 0,
    'gemini-researcher': 0,
    'grok-researcher': 0,
  };

  // Allocate based on domain signals
  for (const signal of signals) {
    let count = 0;
    if (signal.strength > 150) count = 3;
    else if (signal.strength >= 100) count = 2;
    else if (signal.strength >= 50) count = 1;

    const agentType = selectAgentForDomain(signal.domain);
    allocation[agentType] += count;
  }

  // Allocate based on coverage gaps
  for (const gap of gaps) {
    if (gap.specialistType) {
      allocation[gap.specialistType]++;
    }
  }

  // Allocate based on platform gaps
  for (const pg of platformGaps.filter(p => !p.coverage_met)) {
    const agentType = inferAgentFromPlatforms(pg.platforms_missed);
    allocation[agentType]++;
  }

  return allocation;
}
```

---

## File Structure

### Session Directory

```
${PAI_DIR}/scratchpad/research/${SESSION_ID}/
├── analysis/
│   ├── query-analysis.json                    # Phase 1: Query analysis
│   ├── track-allocation.json                  # Phase 1: Track assignments
│   ├── platform-requirements.json             # Phase 1: Expected platforms
│   │
│   ├── wave-1-quality-analysis.json           # Phase 2: Quality scores
│   ├── wave-1-quality-analysis.md             # Phase 2: Human-readable
│   ├── wave-1-pivot-decision.json             # Phase 2: Pivot decision
│   ├── wave-1-platform-coverage.json          # Phase 2: Platform coverage
│   │
│   ├── wave1-urls.txt                         # Phase 2: Extracted URLs
│   ├── source-quality-report.json             # Phase 2: M10 source balance
│   ├── source-quality-report.md               # Phase 2: Human-readable M10
│   ├── quality-gate.json                      # Phase 2: M10 gate evaluation
│   │
│   ├── extracted-citations.json               # Phase 2b: All citations
│   ├── validated-citations.json               # Phase 2b: Validation results
│   ├── validated-citations-pool.json          # Phase 2b: Valid only
│   ├── validated-citations-pool.md            # Phase 2b: Markdown pool
│   ├── hallucination-report.json              # Phase 2b: Invalid by agent
│   │
│   ├── condensed-summaries.md                 # Phase 3: Agent summaries
│   └── validation-report.md                   # Phase 4: Final validation
│
├── wave-1/
│   ├── perplexity-academic-research.md
│   ├── claude-technical-architectures.md
│   ├── gemini-visual-tutorials.md
│   └── grok-social-discussions.md
│
├── wave-2/                                     # Conditional
│   ├── perplexity-deep-academic.md
│   └── grok-twitter-analysis.md
│
└── final-synthesis.md                          # Phase 3: Final output
```

### Index File

**Location:** `${PAI_DIR}/scratchpad/research/README.md`

**Auto-generated after each session:**

```markdown
# Research Sessions Index

Auto-updated after each research session.

## Sessions

| Session | Date | Topic | Agents | Status |
|---------|------|-------|--------|--------|
| [20251225-153655-10300](./20251225-153655-10300/final-synthesis.md) | 2025-12-25 | Text-to-Image Workflows | 9 | ✅ Complete |
| [20251224-102341-98765](./20251224-102341-98765/final-synthesis.md) | 2025-12-24 | OSINT Tools | 7 | ✅ Complete |
| [20251223-151200-45678](./20251223-151200-45678/final-synthesis.md) | 2025-12-23 | AI Agent Frameworks | 6 | ✅ Complete |

---

*Last Updated: 2025-12-25*
```

---

## Examples

### Example 1: Simple Query (4 agents, no Wave 2)

**Query:** "Latest React 19 features"

**Phase 1 Output:**
```json
{
  "complexity": "simple",
  "totalAgents": 4,
  "perspectives": [
    {
      "text": "Core React 19 features and API changes",
      "domain": "technical",
      "recommendedAgent": "claude-researcher"
    },
    {
      "text": "React 19 documentation and migration guides",
      "domain": "technical",
      "recommendedAgent": "perplexity-researcher"
    },
    {
      "text": "Community reactions and adoption patterns",
      "domain": "social_media",
      "recommendedAgent": "grok-researcher"
    },
    {
      "text": "React 19 video tutorials and demos",
      "domain": "multimodal",
      "recommendedAgent": "gemini-researcher"
    }
  ]
}
```

**Phase 2 Wave 1 Results:**
- Average quality: 78 (GOOD)
- No strong domain signals
- No coverage gaps
- All platforms covered

**Pivot Decision:**
```json
{
  "shouldLaunchWave2": false,
  "confidence": 90,
  "rationale": ["Wave 1 coverage is sufficient - no Wave 2 needed"],
  "specialists": [],
  "specialistAllocation": {}
}
```

**Result:** 4 agents, no Wave 2, synthesis complete

---

### Example 2: Complex Query (6 agents + 4 specialists)

**Query:** "Enterprise AI agent architectures - implementation patterns, frameworks, security considerations, deployment strategies, monitoring approaches"

**Phase 1 Output:**
```json
{
  "complexity": "complex",
  "totalAgents": 6,
  "perspectives": [
    {
      "text": "Technical architecture patterns for enterprise AI agents",
      "domain": "technical",
      "recommendedAgent": "claude-researcher",
      "platforms": [
        { "name": "GitHub", "reason": "Open source implementations" },
        { "name": "Stack Overflow", "reason": "Technical discussions" }
      ]
    },
    {
      "text": "Academic research on agent frameworks and formal methods",
      "domain": "academic",
      "recommendedAgent": "perplexity-researcher",
      "platforms": [
        { "name": "arXiv", "reason": "Academic papers" },
        { "name": "Google Scholar", "reason": "Citations" }
      ]
    },
    {
      "text": "Security vulnerabilities and threat models for AI agents",
      "domain": "security",
      "recommendedAgent": "perplexity-researcher",
      "platforms": [
        { "name": "NIST", "reason": "Security standards" },
        { "name": "OWASP", "reason": "Security best practices" }
      ]
    },
    {
      "text": "Real-world deployment experiences from practitioners",
      "domain": "social_media",
      "recommendedAgent": "grok-researcher",
      "platforms": [
        { "name": "X/Twitter", "reason": "Practitioner discussions" },
        { "name": "LinkedIn", "reason": "Professional insights" }
      ]
    },
    {
      "text": "Visual architecture diagrams and implementation demos",
      "domain": "multimodal",
      "recommendedAgent": "gemini-researcher",
      "platforms": [
        { "name": "YouTube", "reason": "Video tutorials" }
      ]
    },
    {
      "text": "Vendor solutions and commercial framework comparisons",
      "domain": "technical",
      "recommendedAgent": "claude-researcher"
    }
  ]
}
```

**Phase 2 Wave 1 Results:**
- Average quality: 72 (GOOD)
- Strong social_media signal: 165 (15 Twitter mentions across 3 agents)
- Academic signal: 105 (8 arxiv papers referenced)
- Coverage gap: "LinkedIn professional network data" (reported by 2 agents)
- Platform gap: Academic perspective had 0% coverage (arXiv not searched)

**Pivot Decision:**
```json
{
  "shouldLaunchWave2": true,
  "confidence": 95,
  "rationale": [
    "Signals: 1 strong domain signal(s) detected",
    "Gaps: 2 HIGH priority gap(s) and 1 MEDIUM priority gap(s)",
    "Platforms: 1 perspective(s) have 0% platform coverage"
  ],
  "specialists": [
    {
      "agentType": "grok-researcher",
      "track": "standard",
      "focus": "Social media specialist: Strong social_media signal (strength: 165)",
      "platforms": [],
      "priority": "HIGH",
      "source": "domain_signal"
    },
    {
      "agentType": "grok-researcher",
      "track": "standard",
      "focus": "LinkedIn and professional network coverage for: LinkedIn professional network data",
      "platforms": [],
      "priority": "HIGH",
      "source": "coverage_gap"
    },
    {
      "agentType": "perplexity-researcher",
      "track": "independent",
      "focus": "Academic research and papers for: Academic research on agent frameworks",
      "platforms": ["arXiv", "Google Scholar"],
      "priority": "HIGH",
      "source": "platform_gap"
    },
    {
      "agentType": "perplexity-researcher",
      "track": "standard",
      "focus": "Latest news and developments",
      "platforms": [],
      "priority": "MEDIUM",
      "source": "domain_signal"
    }
  ],
  "specialistAllocation": {
    "perplexity-researcher": 2,
    "claude-researcher": 0,
    "gemini-researcher": 0,
    "grok-researcher": 2
  }
}
```

**Wave 2 Specialists:**
- 2× grok-researcher (social media + LinkedIn)
- 2× perplexity-researcher (academic + news)

**Result:** 6 Wave 1 agents + 4 Wave 2 specialists = 10 total agents, comprehensive coverage

---

## Troubleshooting

### Issue: Citation Validation Skipped

**Symptom:** No `validated-citations-pool.md` in analysis directory

**Root Cause:** `/_research-collect-validate` not invoked

**Fix:**
1. Check `/_research-collect.md` has explicit SlashCommand invocation
2. Verify orchestrator calls Phase 2b after Phase 2a
3. Run manually: `/_research-collect-validate $SESSION_DIR`

**Prevention:** Updated orchestrator now has explicit "INVOKE THIS SUB-COMMAND NOW" instructions

---

### Issue: Quality Analyzer Not Running

**Symptom:** No `wave-1-quality-analysis.json` in analysis directory

**Root Cause:** TypeScript CLI not installed or path wrong

**Fix:**
1. Verify CLI exists: `ls ${PAI_DIR}/utilities/quality-analyzer/cli.ts`
2. Install dependencies: `cd ${PAI_DIR}/utilities/quality-analyzer && bun install`
3. Test CLI: `bun ./cli.ts help`
4. Run manually: `bun ./cli.ts analyze $SESSION_DIR --wave 1`

---

### Issue: Wave 2 Never Launches

**Symptom:** Pivot decision always says `shouldLaunchWave2: false`

**Diagnosis:**
1. Check quality scores: All ≥60?
2. Check domain signals: All <50?
3. Check coverage gaps: Count <2?
4. Check platform coverage: All perspectives covered?

**Possible Causes:**
- Wave 1 agents actually provided excellent coverage
- Thresholds too high (check `DEFAULT_PIVOT_CONFIG`)
- Domain keywords missing from dictionaries

**Fix:** Review pivot decision rationale in `wave-1-pivot-decision.json`

---

### Issue: Too Many Specialists Launched

**Symptom:** Wave 2 has 8+ agents (expensive, slow)

**Root Cause:** Multiple components triggering simultaneously

**Diagnosis:**
1. Check `pivot-decision.json` for triggered components
2. Review specialist allocation map
3. Look for duplicate recommendations

**Fix:** Specialist deduplication should prevent this, but if it happens:
- Adjust thresholds in `DEFAULT_PIVOT_CONFIG`
- Review gap reporting in Wave 1 agents (may be over-reporting)

---

### Issue: Low Citation Utilization

**Symptom:** Validation report shows <60% citation utilization

**Root Causes:**
1. Too many citations extracted (over-extraction)
2. Synthesis agent not using pool properly
3. Citations not relevant to synthesis

**Fix:**
1. Review citation pool quality
2. Check synthesis prompt includes pool
3. Re-run synthesis with stronger citation requirements
4. Consider re-validating citations

---

### Issue: Source Quality Gate Fails

**Symptom:** Vendor % >40% or Independent % <10%

**Root Cause:** Track allocation not followed by agents

**Fix:**
1. Review track assignments in `track-allocation.json`
2. Check agent prompts include track guidance
3. Verify agents reported source tiers in metadata
4. Consider launching Wave 2 independent track agents

**Prevention:** Stronger track guidance in agent prompts

---

## Conclusion

The M13 Adaptive Research Architecture represents a significant evolution in automated research systems:

**Key Achievements:**
- **Intelligence:** Data-driven pivot decisions, not guesswork
- **Efficiency:** ~75% context reduction through command splitting
- **Quality:** 5-component quality matrix ensures comprehensive coverage
- **Adaptability:** 4-6 agents initially, 0-8 specialists conditionally
- **Reliability:** Citation validation prevents hallucinated sources
- **Diversity:** M10 source tracking ensures balanced research

**Future Enhancements:**
- Real-time adaptive learning (update thresholds based on historical performance)
- Cross-session quality tracking (identify best-performing agent configurations)
- Automated synthesis refinement (iterative improvement based on validation)
- Integration with additional research tools (browser automation, API access)

**Maintenance:**
- Update keyword dictionaries as new domains emerge
- Tune pivot thresholds based on real-world usage
- Expand source tier classification rules
- Monitor agent performance and adjust allocations

---

**Document Version:** M13.2
**Last Updated:** 2025-12-25
**Maintained By:** PAI Infrastructure Team

For questions or issues, consult:
- Code: `${PAI_DIR}/utilities/quality-analyzer/`
- Commands: `${PAI_DIR}/.claude/commands/_research-*.md`
- Skills: `${PAI_DIR}/.claude/skills/CitationValidation/`
