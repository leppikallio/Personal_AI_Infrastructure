---
description: Adaptive multi-wave research - {{DA}} orchestrates Wave 1 exploration, analyzes results, and conditionally launches Wave 2 specialists
globs: ""
alwaysApply: false
---

# 🔬 ADAPTIVE MULTI-WAVE RESEARCH WORKFLOW FOR MARVIN

**YOU ({{DA}}) are reading this because a research request was detected by the load-context hook.**

This command provides instructions for YOU to orchestrate adaptive two-wave research through intelligent query analysis, parallel agent execution, real-time pivot analysis, and conditional specialist deployment.

## 🎯 YOUR MISSION

When a user asks for research, YOU must deliver **INTELLIGENT RESULTS** through adaptive two-wave execution:

1. **Analyze the query** - Understand domain, complexity, and optimal agent allocation
2. **Launch Wave 1 (4-6 agents)** - Broad exploration with structured output requirements
3. **Analyze Wave 1 results** - Quality scoring, domain signal detection, coverage gap analysis
4. **Decide on pivots** - Determine if Wave 2 specialists are needed
5. **Launch Wave 2 (conditional)** - Deploy 0-6 specialists based on pivot analysis
6. **⚠️ VALIDATE CITATIONS** - Check URLs, verify content matches claims (DO NOT SKIP!)
7. **Synthesize** - Combine findings from both waves with task graph visualization
8. **Report** - Return comprehensive results with confidence levels

**Intelligence Strategy:**
- Wave 1: 4-6 agents for broad coverage (not 10)
- Enhanced agent prompts: confidence scores, coverage assessment, domain signals
- Pivot analysis: Quality scoring, domain signal detection, gap identification
- Wave 2: Launch specialists ONLY when signals warrant it
- Result: Higher quality, lower agent count, better resource efficiency

## 📋 STEP-BY-STEP WORKFLOW

### Step 0: Initialize Session (For File Output)

**FIRST: Get current date and create a session-specific directory for research file output.**

```bash
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_YEAR=$(date +"%Y")
SESSION_ID=$(date +%Y%m%d-%H%M%S)-$RANDOM
SESSION_DIR=${PAI_DIR}/scratchpad/research/$SESSION_ID
mkdir -p "$SESSION_DIR/wave-1"
mkdir -p "$SESSION_DIR/analysis"
# Note: wave-2 will be created conditionally if pivot occurs
echo "Current date: $CURRENT_DATE (Year: $CURRENT_YEAR)"
echo "Session initialized: $SESSION_DIR"
```

**Save CURRENT_DATE and CURRENT_YEAR** - you'll pass these to all agents so they search for current information.

This ensures:
- Wave-based organization (wave-1, wave-2 directories)
- Analysis artifacts preserved (analysis directory)
- Multiple parallel research sessions don't overwrite each other's files
- Clear audit trail (timestamp in path)
- Easy cleanup (delete entire session directory)

**Save SESSION_DIR** - you'll pass it to all agents and use it for cleanup.

### Step 0.5: Intelligent Query Analysis & Initial Routing (Perspective-First)

**BEFORE launching agents, analyze the user's query using PERSPECTIVE-FIRST ROUTING (AD-005).**

**Architecture Decision (AD-005):** Generate research perspectives FIRST, then route each perspective to optimal agent. This provides:
1. Better coverage of research surface area (emergent paths visible)
2. Optimal agent-to-perspective matching
3. Each agent gets a specific, well-defined research angle

**Implementation:** Use the TypeScript/Bun perspective-first analyzer with keyword validation and selective ensemble.

**Step 0.5a: Run Perspective-First Analyzer**

Execute the query analyzer CLI with `--perspectives` flag:

```bash
# Run perspective-first analysis (generates perspectives, classifies, validates, routes)
# stderr contains progress logs, stdout contains JSON result
ANALYSIS_JSON=$(bun ${PAI_DIR}/utilities/query-analyzer/query-analyzer.ts --perspectives "$USER_QUERY" 2>/dev/null)

# Parse results into shell variables
COMPLEXITY=$(echo "$ANALYSIS_JSON" | jq -r '.overallComplexity')
PERSPECTIVE_COUNT=$(echo "$ANALYSIS_JSON" | jq -r '.perspectiveCount')
OVERALL_CONFIDENCE=$(echo "$ANALYSIS_JSON" | jq -r '.overallConfidence')
TIME_SENSITIVE=$(echo "$ANALYSIS_JSON" | jq -r '.timeSensitive')
REASONING=$(echo "$ANALYSIS_JSON" | jq -r '.reasoning')

# Extract agent allocation (calculated from perspective-to-agent mapping)
PERPLEXITY_COUNT=$(echo "$ANALYSIS_JSON" | jq -r '.agentAllocation["perplexity-researcher"]')
CLAUDE_COUNT=$(echo "$ANALYSIS_JSON" | jq -r '.agentAllocation["claude-researcher"]')
GEMINI_COUNT=$(echo "$ANALYSIS_JSON" | jq -r '.agentAllocation["gemini-researcher"]')
GROK_COUNT=$(echo "$ANALYSIS_JSON" | jq -r '.agentAllocation["grok-researcher"]')

# Calculate total Wave 1 agents
WAVE1_COUNT=$((PERPLEXITY_COUNT + CLAUDE_COUNT + GEMINI_COUNT + GROK_COUNT))

# Extract perspectives as array for agent prompts
PERSPECTIVES=$(echo "$ANALYSIS_JSON" | jq -c '.perspectives')

# Check if any perspectives triggered ensemble fallback
ENSEMBLE_TRIGGERED=$(echo "$ANALYSIS_JSON" | jq -r '.ensembleTriggered | length')

# Save full analysis to session directory
echo "$ANALYSIS_JSON" > "$SESSION_DIR/analysis/query-analysis.json"

# Extract platform requirements per perspective (AD-006)
PLATFORM_REQUIREMENTS=$(echo "$ANALYSIS_JSON" | jq -c '[.perspectives[] | {text: .text, platforms: [.platforms[].name]}]')
echo "$PLATFORM_REQUIREMENTS" > "$SESSION_DIR/analysis/platform-requirements.json"

# Report analysis results
echo "📊 Perspective-First Analysis Complete (AD-005)"
echo "   Perspectives Generated: $PERSPECTIVE_COUNT"
echo "   Overall Confidence: ${OVERALL_CONFIDENCE}%"
echo "   Complexity: $COMPLEXITY"
echo "   Time Sensitive: $TIME_SENSITIVE"
echo "   Ensemble Fallbacks: $ENSEMBLE_TRIGGERED perspectives"
echo "   Wave 1 Agents: $WAVE1_COUNT total"
echo "   Allocation: ${PERPLEXITY_COUNT}×perplexity, ${CLAUDE_COUNT}×claude, ${GEMINI_COUNT}×gemini, ${GROK_COUNT}×grok"
echo ""
echo "📝 Perspectives:"
echo "$ANALYSIS_JSON" | jq -r '.perspectives[] | "   → [\(.domain)] \(.text | .[0:60])..."'
```

**What This Does:**
- Generates 4-8 research perspectives from the query (single LLM call)
- Each perspective is classified into a primary domain
- Keyword validation provides instant sanity check (no API cost)
- Selective ensemble runs ONLY on uncertain perspectives (LLM/keyword mismatch or low confidence)
- Returns optimal perspective-to-agent mapping

**Output Structure:**
```json
{
  "perspectives": [
    { "text": "Technical architectures...", "domain": "technical", "recommendedAgent": "claude-researcher" },
    { "text": "Academic research on...", "domain": "academic", "recommendedAgent": "perplexity-researcher" },
    ...
  ],
  "validatedPerspectives": [...],  // With keyword validation results
  "agentAllocation": { "perplexity-researcher": 4, "claude-researcher": 2, ... },
  "overallComplexity": "COMPLEX",
  "overallConfidence": 90,
  "ensembleTriggered": ["perspective text 1", ...],  // Which needed deep analysis
  "reasoning": "..."
}
```

**Performance (Option B - Fast + Fallback):**
- Typical: 1-4 API calls, 3-5 seconds
- Worst case: More calls if many perspectives need ensemble
- Best case: 1 call if all perspectives validate with keywords

**Step 0.5b: Domain Understanding**

The analyzer evaluates 6 domains:
- **social_media**: X/Twitter, Reddit, community discussions, trending topics
- **academic**: Research papers, scholarly articles, peer-reviewed studies
- **technical**: Code, APIs, implementation, tools, frameworks, system architecture
- **multimodal**: Videos, images, visual content, diagrams, YouTube tutorials
- **security**: OSINT, threat intelligence, vulnerabilities, cybersecurity
- **news**: Current events, breaking news, latest developments

**Step 0.5c: Understanding the Allocation**

The analyzer uses this mapping:
- **social_media** → grok-researcher (native X/Twitter access)
- **academic** → perplexity-researcher (deep search, citations)
- **technical** → claude-researcher (technical analysis, code)
- **multimodal** → gemini-researcher (video, images, visual content)
- **security** → perplexity-researcher (threat intel = research-heavy)
- **news** → perplexity-researcher (current events, recency)

Allocation strategy:
1. Primary domain specialist: ~35% of agents (rounded)
2. Secondary domain specialists: 1 each for top 2 secondary domains
3. Generalists: Fill remaining slots for diversity
4. Diversity maintained: No single agent type > 50% of total

**Step 0.5d: Review Expected Pivots**

The analyzer automatically predicts likely Wave 2 pivots based on domain composition. Review the `expected_pivots` field in the JSON for:
- Scenario descriptions
- Likely pivot domains
- Trigger conditions (what Wave 1 finding would cause the pivot)
- Recommended Wave 2 specialist allocation
- Confidence levels (HIGH/MODERATE/LOW)

Example pivot predictions:
- **Technical + Social**: Wave 1 discovers developer communities → Wave 2 launches 2-3 grok specialists
- **Social + Academic**: Wave 1 finds research papers on social media → Wave 2 launches 2-3 perplexity specialists
- **Multi-domain**: Wave 1 finds cross-domain signals → Wave 2 launches mixed specialists
- **Single-domain**: Wave 1 provides sufficient coverage → Wave 2 may be skipped

**Step 0.5e: Create Human-Readable Analysis Report**

```bash
# Extract pivot predictions and reasoning from JSON
PIVOTS_JSON=$(echo "$ANALYSIS_JSON" | jq '.expected_pivots')
REASONING=$(echo "$ANALYSIS_JSON" | jq -r '.reasoning')
SECONDARY_DOMAINS=$(echo "$ANALYSIS_JSON" | jq -r '.secondary_domains | join(", ")')

# Create human-readable markdown report
cat > "$SESSION_DIR/analysis/query-analysis.md" <<EOF
# Query Analysis Results

**Query:** $USER_QUERY
**Date:** $CURRENT_DATE
**Analyzer:** $ANALYZER_USED${LLM_CONFIDENCE:+ (confidence: ${LLM_CONFIDENCE}%)}
**Session:** $SESSION_ID

---

## Domain Scoring

$(echo "$ANALYSIS_JSON" | jq -r '
  .domain_scores |
  to_entries |
  map("| \(.key | gsub("_"; " ") | ascii_upcase[:1] + .[1:]) | \(.value) | \(
    if .key == .primary_domain then "PRIMARY"
    elif (.secondary_domains | index(.key)) then "SECONDARY"
    else "None"
    end
  ) |") |
  join("\n")
')

**Primary Domain:** $PRIMARY_DOMAIN
**Secondary Domains:** ${SECONDARY_DOMAINS:-None}

---

## Complexity Assessment

**Complexity Level:** $COMPLEXITY
**Wave 1 Agent Count:** $WAVE1_COUNT
**Reasoning:** $REASONING

---

## Wave 1 Agent Allocation

**Total Agents:** $WAVE1_COUNT

| Agent Type | Count |
|------------|-------|
| perplexity-researcher | $PERPLEXITY_COUNT |
| claude-researcher | $CLAUDE_COUNT |
| gemini-researcher | $GEMINI_COUNT |
| grok-researcher | $GROK_COUNT |

---

## Expected Pivot Predictions

$(echo "$PIVOTS_JSON" | jq -r '
  to_entries |
  map("### Prediction \(.key + 1): \(.value.scenario)\n- **Likely Pivot:** \(.value.likely_pivot)\n- **Trigger:** \(.value.trigger)\n- **Wave 2 Response:** \(.value.wave2_specialists)\n- **Confidence:** \(.value.confidence // "MODERATE")\n") |
  join("\n")
')

---

## Next Steps

1. Launch Wave 1 with $WAVE1_COUNT agents as allocated above
2. Collect Wave 1 outputs in \`$SESSION_DIR/wave-1/\`
3. Run quality scoring and domain signal detection
4. Run pivot decision to determine Wave 2 allocation
5. Conditionally launch Wave 2 specialists (0-6 agents)

EOF

echo "📝 Analysis report written to: $SESSION_DIR/analysis/query-analysis.md"
```

### Step 0.6: Track Allocation (M10 - Source Quality Framework)

**After generating perspectives, allocate them to research tracks using 50/25/25 distribution.**

Research tracks ensure diverse sourcing strategies:
- **Standard Track (50%):** Balanced research using all source tiers
- **Independent Track (25%):** Focus on Tier 1 sources (academic, standards, researchers)
- **Contrarian Track (25%):** Actively seek opposing viewpoints and criticism

**Step 0.6a: Allocate Perspectives to Tracks**

```bash
# Calculate track distribution from perspective count
STANDARD_COUNT=$(( PERSPECTIVE_COUNT / 2 ))  # 50%
INDEPENDENT_COUNT=$(( PERSPECTIVE_COUNT / 4 ))  # 25%
CONTRARIAN_COUNT=$(( PERSPECTIVE_COUNT - STANDARD_COUNT - INDEPENDENT_COUNT ))  # Remaining 25%

# Create track allocation file
TRACK_ALLOCATION="$SESSION_DIR/analysis/track-allocation.json"

# Build track allocation JSON from perspectives
cat > "$TRACK_ALLOCATION" <<'TRACK_EOF'
{
  "allocation_strategy": "50/25/25 (standard/independent/contrarian)",
  "total_perspectives": PERSPECTIVE_COUNT_PLACEHOLDER,
  "distribution": {
    "standard": STANDARD_COUNT_PLACEHOLDER,
    "independent": INDEPENDENT_COUNT_PLACEHOLDER,
    "contrarian": CONTRARIAN_COUNT_PLACEHOLDER
  },
  "tracks": []
}
TRACK_EOF

# Replace placeholders
sed -i '' "s/PERSPECTIVE_COUNT_PLACEHOLDER/$PERSPECTIVE_COUNT/" "$TRACK_ALLOCATION"
sed -i '' "s/STANDARD_COUNT_PLACEHOLDER/$STANDARD_COUNT/" "$TRACK_ALLOCATION"
sed -i '' "s/INDEPENDENT_COUNT_PLACEHOLDER/$INDEPENDENT_COUNT/" "$TRACK_ALLOCATION"
sed -i '' "s/CONTRARIAN_COUNT_PLACEHOLDER/$CONTRARIAN_COUNT/" "$TRACK_ALLOCATION"

# Add track assignments to JSON (using jq to build array)
TRACKS_ARRAY=$(echo "$ANALYSIS_JSON" | jq -c --argjson std "$STANDARD_COUNT" --argjson ind "$INDEPENDENT_COUNT" '
  [.perspectives | to_entries[] |
    if .key < $std then
      {
        perspective: .value.text,
        perspective_index: .key,
        domain: .value.domain,
        recommended_agent: .value.recommendedAgent,
        track: "standard",
        source_guidance: "Use any source tier. Balance breadth with authority."
      }
    elif .key < ($std + $ind) then
      {
        perspective: .value.text,
        perspective_index: .key,
        domain: .value.domain,
        recommended_agent: .value.recommendedAgent,
        track: "independent",
        source_guidance: "STRONGLY prefer Tier 1 sources. Avoid Tier 3 unless necessary. NEVER use Tier 4."
      }
    else
      {
        perspective: .value.text,
        perspective_index: .key,
        domain: .value.domain,
        recommended_agent: .value.recommendedAgent,
        track: "contrarian",
        source_guidance: "Actively seek opposing viewpoints. Find critics and skeptics."
      }
    end
  ]
')

# Merge tracks array into allocation JSON
FINAL_ALLOCATION=$(jq --argjson tracks "$TRACKS_ARRAY" '.tracks = $tracks' "$TRACK_ALLOCATION")
echo "$FINAL_ALLOCATION" > "$TRACK_ALLOCATION"

echo "🎯 Track Allocation Complete (M10)"
echo "   Standard Track: $STANDARD_COUNT perspectives (50%)"
echo "   Independent Track: $INDEPENDENT_COUNT perspectives (25%)"
echo "   Contrarian Track: $CONTRARIAN_COUNT perspectives (25%)"
echo ""
echo "📊 Track Distribution:"
echo "$FINAL_ALLOCATION" | jq -r '.tracks[] | "   [\(.track | ascii_upcase)] \(.perspective | .[0:50])... → \(.recommended_agent)"'
echo ""
echo "💾 Track allocation saved: $TRACK_ALLOCATION"
```

**Track Distribution Examples:**
- **8 perspectives:** 4 standard, 2 independent, 2 contrarian
- **6 perspectives:** 3 standard, 1-2 independent, 1-2 contrarian
- **4 perspectives:** 2 standard, 1 independent, 1 contrarian

**Step 0.6b: Human-Readable Track Report**

```bash
# Create markdown report for track allocation
cat > "$SESSION_DIR/analysis/track-allocation.md" <<EOF
# Track Allocation Report (M10 - Source Quality Framework)

**Session:** $SESSION_ID
**Date:** $CURRENT_DATE
**Total Perspectives:** $PERSPECTIVE_COUNT
**Distribution:** 50% standard / 25% independent / 25% contrarian

---

## Track Assignments

$(echo "$FINAL_ALLOCATION" | jq -r '.tracks[] |
"### Perspective \(.perspective_index + 1): \(.track | ascii_upcase) Track

**Domain:** \(.domain)
**Agent:** \(.recommended_agent)
**Track:** \(.track)
**Source Guidance:** \(.source_guidance)

**Perspective:**
\(.perspective)

---
"')

## Track Purpose Reference

### Standard Track (50% - Balanced Coverage)
- Use any source tier that provides quality information
- Prioritize depth and accuracy
- Balance breadth with authoritative sources
- Vendor content acceptable when valuable

### Independent Track (25% - Academic Rigor)
- STRONGLY prefer Tier 1 sources (academic, standards, researchers)
- AVOID Tier 3 (vendor) unless necessary - justify usage
- NEVER use Tier 4 (suspect/SEO)
- Look in: arxiv, ACM, IEEE, NIST, OWASP, researcher blogs

### Contrarian Track (25% - Opposing Views)
- Seek sources that DISAGREE with mainstream narrative
- Find critics, skeptics, alternative perspectives
- Search for: "[topic] criticism", "[topic] risks", "[topic] fails"
- Look for failure case studies and academic rebuttals

---

## Source Tier Reference

**Tier 1 (Independent):** Academic papers, standards bodies (NIST, OWASP), independent researchers
**Tier 2 (Quasi-Independent):** Industry associations, news outlets, non-profits
**Tier 3 (Vendor):** Product vendors, cloud providers, consulting firms
**Tier 4 (Suspect):** SEO farms, affiliate sites - USE WITH CAUTION

EOF

echo "📝 Track allocation report: $SESSION_DIR/analysis/track-allocation.md"
```

### Step 1: Launch Wave 1 Exploration Agents

**PERSPECTIVE-DRIVEN ALLOCATION - Each agent gets its assigned perspective from Step 0.5**

**Step 1a: Use Generated Perspectives Directly**

**CRITICAL CHANGE (AD-005):** You no longer manually create sub-questions. The perspective-first analyzer already generated optimal research angles. Use them directly:

```bash
# Extract perspectives with their assigned agents
echo "$ANALYSIS_JSON" | jq -r '.perspectives[] | "\(.recommendedAgent): \(.text)"'
```

Each perspective already has:
- A specific research angle (text)
- A domain classification (domain)
- An optimal agent assignment (recommendedAgent)
- A rationale for why this perspective matters

**Step 1b: Prepare Track-Specific Instructions**

Before spawning agents, prepare track-specific guidance based on allocations from Step 0.6:

```bash
# Extract track-specific instructions for agent prompts
# These will be injected into each agent based on their track assignment

# Load track allocation
TRACK_DATA=$(cat "$SESSION_DIR/analysis/track-allocation.json")

# For each perspective, get its track and prepare instructions
# You'll use these when building agent prompts below
```

**Track-Specific Agent Instructions:**

**FOR STANDARD TRACK AGENTS (50% of perspectives):**
```
## Your Research Track: STANDARD

**Track Purpose:** Balanced research using all source tiers for comprehensive coverage.

**Source Strategy:**
- Use any source tier that provides quality information
- Prioritize depth and accuracy over source purity
- Balance breadth with authoritative sources
- Vendor content is acceptable when it provides unique insights
- Note source tier when citing

**What to Report:**
- Cite sources with tier classification in metadata
- Note any potential conflicts of interest when citing vendor sources
- Flag if over 50% of sources are from a single tier
```

**FOR INDEPENDENT TRACK AGENTS (25% of perspectives):**
```
## Your Research Track: INDEPENDENT

**Track Purpose:** Academic rigor and practitioner authenticity - sources WITHOUT commercial incentives.

**Source Strategy:**
- STRONGLY prefer Tier 1 sources (academic, standards, researchers)
- Tier 2 acceptable when Tier 1 unavailable
- AVOID Tier 3 (vendor) unless absolutely necessary
- NEVER use Tier 4 (suspect/SEO)

**Where to Look:**
- Academic databases: arxiv.org, ACM Digital Library, IEEE Xplore
- Standards bodies: NIST, ISO, OWASP, IETF, W3C
- Independent researcher blogs (named individuals, not companies)
- Conference proceedings: Black Hat, DEF CON, USENIX Security
- Government research: CISA, NSA publications, RAND Corporation

**What Makes a Source "Independent":**
- Author is named individual, not "Company Team"
- No product being sold in the same content
- Published through academic or journalistic process
- Author's employer is not directly selling related products

**What to Report:**
- JUSTIFY any Tier 3 source usage explicitly
- Explicitly mark source tiers in citations
- If you cannot find Tier 1 sources, explain what you searched
```

**FOR CONTRARIAN TRACK AGENTS (25% of perspectives):**
```
## Your Research Track: CONTRARIAN

**Track Purpose:** Find opposing viewpoints to ensure final synthesis includes dissenting perspectives.

**Source Strategy:**
- Seek sources that DISAGREE with mainstream narrative
- Find critics, skeptics, and alternative perspectives
- Look for "what could go wrong" analyses
- Identify voices marginalized in vendor-dominated discourse
- Contrarian Tier 3 (vendor criticizing other vendors) is acceptable

**Search Strategies:**
- Add "criticism", "problems", "fails", "overhyped" to searches
- Search for: "[topic] skeptics", "[topic] risks overstated", "why [topic] may fail"
- Look for academic rebuttals and critique papers
- Find industry veterans who've seen similar hype cycles
- Search for failure case studies and post-mortems
- Look for voices from affected communities

**Where to Look:**
- Academic critiques and rebuttals
- Industry skeptics and critics (often on personal blogs)
- Historical lessons from similar technologies
- Failure case studies and post-mortems
- Competitor analyses (vendors criticizing each other)

**What to Report:**
- Clearly label as contrarian perspective
- Explain what mainstream view is being challenged
- Assess validity of contrarian arguments (fringe vs. legitimate minority)
```

**Step 1c: Launch Wave 1 Agents in Parallel**

Use the **Task tool** to spawn agents with **ENHANCED PROMPTS**. **Each agent gets ONE perspective** from the analysis WITH its track assignment:

**Allocation from perspectives:**
- $PERPLEXITY_COUNT × perplexity-researcher (for academic, security, news perspectives)
- $CLAUDE_COUNT × claude-researcher (for technical perspectives)
- $GEMINI_COUNT × gemini-researcher (for multimodal perspectives)
- $GROK_COUNT × grok-researcher (for social_media perspectives)

```typescript
// Launch ALL agents in PARALLEL - each agent gets ONE PERSPECTIVE from the analysis
// Use a SINGLE message with multiple Task tool calls
// Total agents: $WAVE1_COUNT (one per perspective)
// NOTE: Agent prompts now include STRUCTURED OUTPUT requirements

// Example: For perspective { text: "Technical architectures...", domain: "technical", recommendedAgent: "claude-researcher" }
Task({
  subagent_type: "claude-researcher",  // FROM perspective.recommendedAgent
  description: "Research: Technical architectures",  // FROM perspective.text (truncated)
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: claude-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR ASSIGNED PERSPECTIVE (from query analysis)**
Research this specific angle: "Technical architectures, frameworks, and implementation patterns for building AI agents in enterprise environments"

**WHY THIS PERSPECTIVE**
This perspective was identified as relevant because: Enterprise productivity requires understanding specific technical implementations, APIs, system design patterns, and integration approaches for AI agents

**YOUR RESEARCH TRACK: [TRACK_NAME]** ← Inject from track allocation

[TRACK_SPECIFIC_INSTRUCTIONS] ← Inject appropriate track guidance based on track assignment

**Source Tier Reference:**
- **Tier 1 (Independent):** Academic papers, standards bodies (NIST, OWASP), independent researchers
- **Tier 2 (Quasi-Independent):** Industry associations, news outlets, non-profits
- **Tier 3 (Vendor):** Product vendors, cloud providers, consulting firms
- **Tier 4 (Suspect):** SEO farms, affiliate sites - USE WITH CAUTION

**YOUR TASK**
Investigate this perspective thoroughly. Do ONE focused search query and ONE follow-up if needed.

**ENHANCED TOOL GUIDANCE**
You have access to powerful MCP tools beyond basic WebSearch:

For **LinkedIn** research:
- Use \`mcp__apify__call-actor\` with actor="harvestapi/linkedin-profile-posts"
- Input: { "profileUrls": ["https://linkedin.com/in/username"] }
- No cookies required, extracts posts + engagement metrics

For **protected/paywalled content**:
- Use \`mcp__brightdata__scrape_as_markdown\` to bypass bot detection
- Works on most protected sites and CAPTCHAs

**Fallback Chain:** Apify → Brightdata → WebSearch

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/wave-1/perplexity-[descriptive-topic].md

Example: ${SESSION_DIR}/wave-1/perplexity-quantum-breakthroughs.md

**STRUCTURED OUTPUT REQUIREMENTS** ← UPDATED WITH TRACK INFO

At the TOP of your research file, include this structured header:

---
agent_type: perplexity-researcher
wave: 1
query_focus: [your specific sub-question]
execution_time: [timestamp]
track: [standard|independent|contrarian]
source_guidance: [track-specific guidance you received]
---

## Structured Metadata

### 1. Confidence Score (0-100)
Rate your confidence in these findings:
- 90-100: Highly confident, authoritative sources, comprehensive coverage
- 70-89: Good information, multiple sources, solid findings
- 50-69: Moderate confidence, single sources, acceptable depth
- Below 50: Limited information found, gaps in coverage

**Your Score:** [NUMBER]
**Reasoning:** [Why this score?]

### 2. Coverage Assessment
Answer these questions:
- **Thoroughly Covered:** What aspects of the query did you cover well?
- **Limited Coverage:** What aspects did you find LIMITED information about?
- **Alternative Domains:** What other domains might provide better information?

### 3. Domain Signals Detected
Did you encounter recurring themes that suggest other domains?

Examples:
- Frequent mentions of Twitter/X, social media platforms → Social Media signal
- Multiple arxiv papers, journal references → Academic signal
- GitHub repos, code examples, implementation details → Technical signal
- Video references, visual content, images → Multimodal signal

**Signals Detected:** [LIST with frequency counts]

Example:
- Social Media (STRONG): Twitter mentioned 8 times, Reddit mentioned 3 times
- Academic (WEAK): 2 arxiv papers referenced

### 4. Recommended Follow-up
If you could investigate further, what would you explore next?
- Specific questions that remain unanswered
- Domains that might have better information
- Specialist searches that would add value

### 5. Tool Gap Recommendations
Did you encounter data sources you couldn't access with current tools?

**Report any tool gaps:**
- **Inaccessible Platform:** [e.g., "Slack communities", "Discord servers", "Patreon content"]
- **Data Type Blocked:** [e.g., "Video transcripts", "PDF documents", "API rate limited"]
- **Suggested Tool/MCP:** If you know of an Apify actor, MCP, or tool that could help, recommend it
  - Search Apify: \`mcp__apify__search-actors\` with keywords
  - Example: "Couldn't access Discord → Search Apify for 'Discord scraper'"

### 6. Source Tier Distribution (M10 - Track Quality Metrics)
Report the source tiers you used (required for all tracks, especially INDEPENDENT and CONTRARIAN):

**Sources by Tier:**
- **Tier 1 (Independent):** [count] - [list key sources: arxiv papers, NIST docs, etc.]
- **Tier 2 (Quasi-Independent):** [count] - [list key sources: news, associations, etc.]
- **Tier 3 (Vendor):** [count] - [list key sources and JUSTIFY if on INDEPENDENT track]
- **Tier 4 (Suspect):** [count] - [should be 0 on INDEPENDENT track]

**Track Compliance:**
- **Standard Track:** Any distribution acceptable if sources are quality
- **Independent Track:** Tier 1 should be majority; justify any Tier 3; Tier 4 must be 0
- **Contrarian Track:** Focus on critical/skeptical sources; note mainstream vs. contrarian

**Tier 3 Justifications (if on INDEPENDENT track):**
- [URL]: [Why this vendor source was necessary despite track guidance]

---

## Your Research Findings

[Normal detailed research output with sources - minimum 500 characters]

**CRITICAL OUTPUT REQUIREMENTS:**
1. Write your findings to the session directory above
2. Use a descriptive filename (not timestamp/random)
3. Include the structured header at the TOP
4. Verify the file was written (show path and size)
5. Return the FULL content in your response
6. Minimum 500 characters of actual findings
7. Include all source URLs

**DO NOT** return stubs like "Research complete" without actual content.
`
})

Task({
  subagent_type: "claude-researcher",  // Or agent type from Step 0.5 allocation
  description: "Research sub-question 2",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: claude-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR TASK**
Research this specific angle: [sub-question 2]. Do ONE focused search query and ONE follow-up if needed.

**ENHANCED TOOL GUIDANCE**
You have access to powerful MCP tools beyond basic WebSearch:

For **GitHub repository** research:
- Use \`mcp__apify__call-actor\` with actor="benthepythondev/github-repository-intelligence"
- Input: { "repositoryUrls": ["https://github.com/owner/repo"], "includeReadme": true }
- Extracts: README content, stars, forks, languages, last update

For **library documentation**:
- Use \`mcp__context7__resolve-library-id\` to find library ID
- Use \`mcp__context7__get-library-docs\` for current documentation

For **protected/paywalled technical docs**:
- Use \`mcp__brightdata__scrape_as_markdown\` to bypass bot detection

**Fallback Chain:** Context7 → Apify → Brightdata → WebSearch

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/wave-1/claude-[descriptive-topic].md

Example: ${SESSION_DIR}/wave-1/claude-quantum-companies.md

**STRUCTURED OUTPUT REQUIREMENTS** ← NEW SECTION

At the TOP of your research file, include this structured header:

---
agent_type: claude-researcher
wave: 1
query_focus: [your specific sub-question]
execution_time: [timestamp]
---

## Structured Metadata

### 1. Confidence Score (0-100)
Rate your confidence in these findings:
- 90-100: Highly confident, authoritative sources, comprehensive coverage
- 70-89: Good information, multiple sources, solid findings
- 50-69: Moderate confidence, single sources, acceptable depth
- Below 50: Limited information found, gaps in coverage

**Your Score:** [NUMBER]
**Reasoning:** [Why this score?]

### 2. Coverage Assessment
Answer these questions:
- **Thoroughly Covered:** What aspects of the query did you cover well?
- **Limited Coverage:** What aspects did you find LIMITED information about?
- **Alternative Domains:** What other domains might provide better information?

### 3. Domain Signals Detected
Did you encounter recurring themes that suggest other domains?

Examples:
- Frequent mentions of Twitter/X, social media platforms → Social Media signal
- Multiple arxiv papers, journal references → Academic signal
- GitHub repos, code examples, implementation details → Technical signal
- Video references, visual content, images → Multimodal signal

**Signals Detected:** [LIST with frequency counts]

### 4. Recommended Follow-up
If you could investigate further, what would you explore next?
- Specific questions that remain unanswered
- Domains that might have better information
- Specialist searches that would add value

### 5. Tool Gap Recommendations
Did you encounter data sources you couldn't access with current tools?

**Report any tool gaps:**
- **Inaccessible Platform:** [e.g., "Slack communities", "Discord servers", "Patreon content"]
- **Data Type Blocked:** [e.g., "Video transcripts", "PDF documents", "API rate limited"]
- **Suggested Tool/MCP:** If you know of an Apify actor, MCP, or tool that could help, recommend it
  - Search Apify: \`mcp__apify__search-actors\` with keywords
  - Example: "Couldn't access Discord → Search Apify for 'Discord scraper'"

### 6. Source Tier Distribution (M10 - Track Quality Metrics)
Report the source tiers you used (required for all tracks, especially INDEPENDENT and CONTRARIAN):

**Sources by Tier:**
- **Tier 1 (Independent):** [count] - [list key sources: arxiv papers, NIST docs, etc.]
- **Tier 2 (Quasi-Independent):** [count] - [list key sources: news, associations, etc.]
- **Tier 3 (Vendor):** [count] - [list key sources and JUSTIFY if on INDEPENDENT track]
- **Tier 4 (Suspect):** [count] - [should be 0 on INDEPENDENT track]

**Track Compliance:**
- **Standard Track:** Any distribution acceptable if sources are quality
- **Independent Track:** Tier 1 should be majority; justify any Tier 3; Tier 4 must be 0
- **Contrarian Track:** Focus on critical/skeptical sources; note mainstream vs. contrarian

**Tier 3 Justifications (if on INDEPENDENT track):**
- [URL]: [Why this vendor source was necessary despite track guidance]

---

## Your Research Findings

[Normal detailed research output with sources - minimum 500 characters]

**CRITICAL OUTPUT REQUIREMENTS:**
1. Write your findings to the session directory above
2. Use a descriptive filename (not timestamp/random)
3. Include the structured header at the TOP
4. Verify the file was written (show path and size)
5. Return the FULL content in your response
6. Minimum 500 characters of actual findings
7. Include all source URLs

**DO NOT** return stubs like "Research complete" without actual content.
`
})

// Continue launching agents according to Step 0.5 allocation
// Total: 4-6 agents (complexity-dependent)
// Mix agent types based on domain analysis
// Each gets ONE focused sub-question with structured output requirements
```

**Available Research Agents:**
- **perplexity-researcher**: Fast Perplexity API searches, good for academic and broad coverage
- **claude-researcher**: Claude WebSearch with intelligent query decomposition and analysis
- **gemini-researcher**: Google Gemini multi-perspective research, multimodal capabilities
- **grok-researcher**: xAI Grok with native X/Twitter access, social media focus

**CRITICAL RULES FOR WAVE 1:**
1. ✅ **Launch ALL agents in ONE message** (parallel execution)
2. ✅ **Use allocation from Step 0.5** (4-6 agents based on complexity)
3. ✅ **Each agent gets ONE specific sub-question** (focused research)
4. ✅ **Enhanced prompts with structured output** (confidence, coverage, signals)
5. ✅ **Each agent does 1 query + 1 follow-up max** (quick cycles)
6. ✅ **All agents write to wave-1 directory** (organized by wave)
7. ❌ **DON'T launch 10 agents** (this is adaptive, not brute force)
8. ❌ **DON'T skip structured output section** (required for pivot analysis)

### Step 2: Collect Wave 1 Results (15-30 seconds)

**Wait for Wave 1 agents to complete** - they typically return results within 15-30 seconds due to parallel execution.

Each agent returns:
- Focused findings from their specific sub-question
- **Structured metadata** (confidence score, coverage assessment, domain signals)
- Source citations (**MANDATORY**)
- Recommended follow-up

### Step 2a: Validate Wave 1 Agent Results

**MANDATORY: Check each agent's output before pivot analysis**

For EACH Wave 1 agent result:
1. **Length Check:** Minimum 500 characters of actual content (not just headers/boilerplate)
2. **Content Check:** Must contain actual findings (look for data, facts, sources)
3. **Structure Check:** Verify structured metadata section exists (confidence, coverage, signals)
4. **Error Detection:** Check for error indicators (API failures, empty results, errors)

**If validation fails for an agent:**
1. Log which agent failed and why (empty, too short, error, missing structure)
2. Retry the agent with the SAME query (launch new Task with same subagent_type and prompt)
3. Maximum 2 retry attempts per agent
4. If still failing after retries, mark as **partial coverage** and note the gap in pivot analysis

**Validation Example:**
```typescript
// After collecting results, for each agent output:
if (output.length < 500 || !output.includes("Confidence Score") || !output.includes("Domain Signals")) {
  // Retry this agent
  Task({
    subagent_type: "same-type",
    description: "RETRY: [original description]",
    prompt: "[original prompt with structured output requirements]"
  })
}
```

### Step 2.5: Analyze Wave 1 & Determine Pivots (NEW - CRITICAL STEP)

**THIS IS THE KEY INNOVATION - Analyze Wave 1 results to make intelligent Wave 2 decisions.**

**Step 2.5a: Quality Scoring (Component 2 from system-design.md)**

For each Wave 1 agent result, calculate a quality score (0-100):

```markdown
Quality Scoring Algorithm:

For each agent result file:

1. Length Scoring (40 points max):
   - char_count >= 2000: +40 points (excellent depth)
   - char_count >= 1000: +25 points (good depth)
   - char_count >= 500: +15 points (acceptable)
   - char_count < 500: +5 points (insufficient)

2. Source Counting (30 points max):
   - source_count >= 5: +30 points (well-sourced)
   - source_count >= 3: +20 points (adequately sourced)
   - source_count >= 1: +10 points (minimal sourcing)
   - source_count = 0: +0 points (no sources - red flag)

3. Confidence Score (30 points max):
   - Extract agent's self-reported confidence score
   - Normalize to 30-point scale: (agent_confidence / 100) × 30

Total Quality Score = Length + Sources + Confidence

Quality Bands:
- 80-100: EXCELLENT (high confidence, rich information)
- 60-79: GOOD (solid findings, acceptable quality)
- 40-59: MODERATE (usable but limited depth)
- 0-39: POOR (insufficient or low-value output)
```

**TODO:** Implement automated quality scoring - for now, manually assess each agent.

Write quality analysis to: `${SESSION_DIR}/analysis/quality-scores.md`

Example:
```markdown
## Wave 1 Quality Scoring

| Agent | Char Count | Sources | Confidence | Quality Score | Band |
|-------|-----------|---------|------------|---------------|------|
| perplexity-1 | 1850 | 6 | 85 | 81 | EXCELLENT |
| claude-1 | 1200 | 4 | 70 | 66 | GOOD |
| grok-1 | 950 | 3 | 65 | 59 | MODERATE |
| gemini-1 | 450 | 1 | 50 | 30 | POOR |

**Average Quality Score:** 59 (MODERATE)
**Low Quality Agents:** 1 (gemini-1)
**Recommendation:** Consider retry or specialist replacement for gemini-1
```

**Step 2.5b: Domain Signal Detection (Component 3 from system-design.md)**

Scan all Wave 1 results for cross-domain signals:

```markdown
Domain Signal Detection Algorithm:

Domain Keyword Dictionaries:
- social_media: ['twitter', 'X', 'reddit', 'social', 'viral', 'trending', 'hashtag', 'influencer', 'tiktok', 'instagram']
- academic: ['paper', 'arxiv', 'journal', 'study', 'research', 'citation', 'peer review', 'academic', 'scholar']
- technical: ['implementation', 'code', 'api', 'framework', 'architecture', 'algorithm', 'library', 'github', 'documentation']
- multimodal: ['video', 'image', 'visual', 'youtube', 'diagram', 'screenshot', 'graphic', 'animation']

For each Wave 1 agent result:
  For each domain:
    1. Count keyword matches (case-insensitive)
    2. Extract agent's self-reported domain signals from structured metadata
    3. Weight by agent quality score: signal_strength = matches × (quality_score / 100)

Aggregate across all agents:
  total_signal_strength[domain] = sum(weighted signals from all agents)

Signal Strength Bands:
- >150: STRONG signal - Launch 3 specialists for this domain
- 100-150: MODERATE signal - Launch 2 specialists
- 50-100: WEAK signal - Launch 1 specialist
- <50: NO signal - Skip this domain
```

**TODO:** Implement automated domain signal detection - for now, manually count from structured metadata.

Write signal analysis to: `${SESSION_DIR}/analysis/domain-signals.md`

Example:
```markdown
## Domain Signal Analysis (Wave 1)

**Total Agents Analyzed:** 5

**Detected Signals:**

1. **Social Media: Signal Strength = 185 (STRONG)**
   - Keyword mentions: 15 across 4 agents
   - Keywords: twitter(7), X(5), reddit(3)
   - Agent reports:
     - perplexity-1: "Social Media (STRONG) - Twitter mentioned 8 times"
     - claude-1: "Social Media (MODERATE) - Reddit discussions prevalent"
   - **Recommendation:** Launch 3× grok-researcher (native X access)

2. **Academic: Signal Strength = 95 (WEAK)**
   - Keyword mentions: 6 across 2 agents
   - Keywords: paper(3), arxiv(2), research(1)
   - Agent reports:
     - perplexity-1: "Academic (WEAK) - 2 arxiv papers referenced"
   - **Recommendation:** Launch 1× perplexity-researcher

3. **Technical: Signal Strength = 45 (NO SIGNAL)**
   - Keyword mentions: 3 across 1 agent
   - **Recommendation:** Skip

**Top Signals for Wave 2:**
1. Social Media (185) - 3 specialists
2. Academic (95) - 1 specialist
```

**Step 2.5c: Coverage Gap Analysis (Component 4 from system-design.md)**

Extract self-reported coverage gaps from structured metadata:

```markdown
Coverage Gap Identification:

For each Wave 1 agent result:
  1. Extract "Limited Coverage" section from structured metadata
  2. Extract "Alternative Domains" suggestions
  3. Extract "Recommended Follow-up" section

Identify gaps when:
  - 2+ agents report the same limitation
  - Agent explicitly says "outside my capability" or "limited access"
  - Agent suggests alternative domain/specialist

Map gaps to specialists:
  - "Social media content" / "Twitter data" → grok-researcher
  - "Academic depth" / "Research papers" → perplexity-researcher
  - "Technical implementation" / "Code examples" → claude-researcher
  - "Visual/video content" / "Multimedia" → gemini-researcher
```

Write gap analysis to: `${SESSION_DIR}/analysis/coverage-gaps.md`

Example:
```markdown
## Coverage Gap Analysis (Wave 1)

**Gap 1: Real-time Twitter/X Data**
- Reported by: perplexity-1, claude-1, gemini-1 (3 agents)
- Quotes:
  - perplexity-1: "Limited access to real-time social media discussions"
  - claude-1: "Twitter/X mentioned frequently but couldn't access platform data"
  - gemini-1: "Suggest grok-researcher for X-specific content"
- **Recommendation:** Launch 2× grok-researcher (native X access)

**Gap 2: Visual Tutorials**
- Reported by: claude-1 (1 agent)
- Quotes:
  - claude-1: "Found tool descriptions but no visual tutorials or video guides"
- **Recommendation:** Launch 1× gemini-researcher (multimodal search)

**Total Gaps Identified:** 2
**Recommended Wave 2 Specialists:** 3 agents (2 grok + 1 gemini)
```

**Step 2.5d: Pivot Decision Matrix (Component 5 from system-design.md)**

Combine quality scores, domain signals, and coverage gaps to make final Wave 2 decision:

```markdown
Pivot Decision Logic:

FLAGS:
1. LOW_QUALITY_RETRY: any(quality_score < 40)
   → Recommendation: Retry failed agents with different type

2. STRONG_PIVOT_DETECTED: max(domain_signal_strength) > 150
   → Recommendation: Launch 3 specialists for top domain

3. GAPS_IDENTIFIED: count(coverage_gaps) >= 2
   → Recommendation: Launch specialists to fill gaps

4. SUFFICIENT_COVERAGE: all(quality_scores >= 60) AND max(domain_signals) < 100 AND gaps == 0
   → Recommendation: Skip Wave 2, proceed to synthesis

5. MODERATE_PIVOT: Otherwise
   → Recommendation: Launch 2-3 specialists for top 1-2 signals

FINAL DECISION:
- Count flags
- Calculate recommended specialist count
- Allocate specialists by domain/gap priority
- Generate Wave 2 execution plan
```

Write pivot decision to: `${SESSION_DIR}/analysis/pivot-decision.md`

Example:
```markdown
## Pivot Decision Matrix

### Input Summary
- Wave 1 Agents: 5
- Average Quality Score: 67 (GOOD)
- Top Domain Signal: Social Media (185 - STRONG)
- Coverage Gaps: 2 identified
- Low Quality Agents: 1 (gemini-1)

### Decision Flags
✅ STRONG_PIVOT_DETECTED (Social Media: 185)
✅ GAPS_IDENTIFIED (2 gaps: Twitter data, Visual content)
⚠️ LOW_QUALITY_RETRY (gemini-1: score 30)
❌ SUFFICIENT_COVERAGE (pivot needed)

### Wave 2 Execution Plan

**Decision: LAUNCH WAVE 2**

**Specialists to Launch:** 4 agents

1. **grok-researcher × 2** (Social Media Pivot - STRONG signal)
   - Focus: Twitter/X OSINT tools and real-time discussions
   - Context: Wave 1 found 15 social media mentions, 3 agents reported X data gap
   - Priority: HIGH

2. **gemini-researcher × 1** (Visual Content Gap)
   - Focus: Video tutorials and visual examples
   - Context: claude-1 reported missing visual content
   - Priority: MEDIUM

3. **perplexity-researcher × 1** (Academic Signal - WEAK + retry low quality)
   - Focus: Research papers and academic sources
   - Context: Wave 1 signal strength 95, replaces failed gemini-1 from Wave 1
   - Priority: LOW-MEDIUM

**Total Wave 2 Agents:** 4
**Expected Outcome:** Deep social media coverage + visual examples + academic depth
**Estimated Time:** 15-30 seconds (parallel execution)
```

**Step 2.5e: Platform Coverage Analysis (AD-008 - NEW)**

**Extract platform coverage from Wave 1 agent outputs:**

Each Wave 1 agent now reports "Platforms Searched" at the end of their output. Parse these to determine coverage:

```bash
# Initialize coverage tracking
COVERAGE_REPORT="$SESSION_DIR/analysis/platform-coverage.md"
echo "# Platform Coverage Report (AD-008)" > "$COVERAGE_REPORT"
echo "" >> "$COVERAGE_REPORT"
echo "**Generated:** $(date +%Y-%m-%d\ %H:%M:%S)" >> "$COVERAGE_REPORT"
echo "" >> "$COVERAGE_REPORT"

# Load expected platforms from query analysis
EXPECTED_PLATFORMS=$(cat "$SESSION_DIR/analysis/platform-requirements.json")

# For each Wave 1 output file, extract "Platforms Searched" section
for file in "$SESSION_DIR/wave-1"/*.md; do
  # Extract platforms searched from agent output (looking for ✅ markers)
  SEARCHED=$(grep -E "^- ✅" "$file" | sed 's/- ✅ //' | cut -d: -f1)

  # Store for comparison
  echo "Agent: $(basename "$file")" >> "$COVERAGE_REPORT"
  echo "Platforms Searched: $SEARCHED" >> "$COVERAGE_REPORT"
  echo "" >> "$COVERAGE_REPORT"
done

echo "📋 Platform coverage extracted: $COVERAGE_REPORT"
```

**Coverage determination per perspective:**
1. Parse each Wave 1 agent's "Platforms Searched" section
2. Compare against expected platforms from query analysis (platform-requirements.json)
3. Mark `coverage_met = true` if at least 1 expected platform was searched
4. List missed platforms for human judgment

**Wave 2 trigger additions (AD-008):**
```
WAVE 2 TRIGGERS IF (existing triggers):
  - Quality score < 60 on any agent
  - Strong domain signal emerged that wasn't covered

WAVE 2 TRIGGERS IF (NEW - AD-008):
  - ANY perspective has 0 expected platforms searched (coverage_met = false)
  - PRIMARY tool failure on any agent (couldn't complete research)
```

**Update pivot decision to include coverage:**
```bash
# Check for coverage failures
UNCOVERED_PERSPECTIVES=0
for perspective in $(echo "$EXPECTED_PLATFORMS" | jq -c '.[]'); do
  expected=$(echo "$perspective" | jq -r '.platforms | join(",")')
  # Compare against actually searched platforms
  # If none of the expected platforms were searched, increment
done

if [ $UNCOVERED_PERSPECTIVES -gt 0 ]; then
  echo "⚠️ WAVE 2 TRIGGER: $UNCOVERED_PERSPECTIVES perspectives have no platform coverage"
  WAVE2_NEEDED=true
fi
```

### Step 2.6: Source Quality Evaluation (M10 - Source Quality Framework)

**CRITICAL: Evaluate source quality after Wave 1 completes to determine if rebalancing is needed.**

After Wave 1 agents complete, analyze the source distribution to identify vendor-heavy research, lack of independent sources, or other quality issues that could compromise research credibility.

**Step 2.6a: Extract and Classify Sources**

Extract all URLs from Wave 1 outputs and prepare for analysis:

```bash
# Extract URLs from all Wave 1 agent outputs
mkdir -p "$SESSION_DIR/analysis"
grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md 2>/dev/null | sort -u > "$SESSION_DIR/analysis/wave1-urls.txt"
URL_COUNT=$(wc -l < "$SESSION_DIR/analysis/wave1-urls.txt" | tr -d ' ')
echo "📊 Extracted $URL_COUNT unique URLs from Wave 1"
```

**Step 2.6b: Analyze Source Balance**

Use the balance analyzer to evaluate source distribution:

```bash
cd ${PAI_DIR}/utilities/query-analyzer
bun -e "
const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
const fs = require('fs');

const sessionDir = '$SESSION_DIR';
const urls = fs.readFileSync(sessionDir + '/analysis/wave1-urls.txt', 'utf-8')
  .split('\n')
  .filter(u => u.trim());

const report = analyzeSourceBalance(urls);
console.log('Source quality analysis complete');
fs.writeFileSync(sessionDir + '/analysis/source-quality-report.json', JSON.stringify(report, null, 2));
fs.writeFileSync(sessionDir + '/analysis/source-quality-report.md', generateMarkdownReport(report));
"

echo "✅ Source quality report generated: $SESSION_DIR/analysis/source-quality-report.md"
```

**Step 2.6c: Evaluate Quality Gate**

Check if rebalancing is needed:

```bash
bun -e "
const { evaluateQualityGate, shouldAttemptRebalancing, generateQualityGateMarkdown } = require('./source-tiers/quality-gate');
const fs = require('fs');

const sessionDir = '$SESSION_DIR';
const report = JSON.parse(fs.readFileSync(sessionDir + '/analysis/source-quality-report.json'));
const gate = evaluateQualityGate(report);
const rebalance = shouldAttemptRebalancing(report, 0);

console.log('Quality Gate Status: ' + (gate.passed ? 'PASSED' : 'FAILED'));
console.log('Rebalancing Needed: ' + rebalance.shouldRebalance);

fs.writeFileSync(sessionDir + '/analysis/quality-gate-result.json', JSON.stringify({ gate, rebalance }, null, 2));
fs.writeFileSync(sessionDir + '/analysis/quality-gate-result.md', generateQualityGateMarkdown(report, gate));
"

echo "✅ Quality gate evaluation complete: $SESSION_DIR/analysis/quality-gate-result.json"
```

**Step 2.6d: Quality Gate Decision**

Based on the quality gate result, determine next steps:

```bash
# Read quality gate result
GATE_PASSED=$(cat "$SESSION_DIR/analysis/quality-gate-result.json" | grep -o '"passed":[^,}]*' | cut -d: -f2 | tr -d ' ')
SHOULD_REBALANCE=$(cat "$SESSION_DIR/analysis/quality-gate-result.json" | grep -o '"shouldRebalance":[^,}]*' | cut -d: -f2 | tr -d ' ')

if [ "$GATE_PASSED" = "true" ]; then
  echo "✅ Quality gate PASSED - proceeding to synthesis"
  QUALITY_REBALANCE_NEEDED=false
elif [ "$SHOULD_REBALANCE" = "true" ]; then
  echo "⚠️ Quality gate FAILED - triggering source rebalancing"
  QUALITY_REBALANCE_NEEDED=true

  # Read required agents for rebalancing
  # These will be added to Wave 2 agent specifications
  cat "$SESSION_DIR/analysis/quality-gate-result.json"
else
  echo "⚠️ Quality gate FAILED but max attempts reached - proceeding with warnings"
  QUALITY_REBALANCE_NEEDED=false
fi
```

**Step 2.6e: Wave 2 Quality Rebalancing (Conditional)**

If quality rebalancing is triggered, prepare agent specifications for Wave 2:

```bash
if [ "$QUALITY_REBALANCE_NEEDED" = "true" ]; then
  # Extract required agents from quality gate result
  # These will be integrated into Step 3.5 Wave 2 agent launches

  echo "📝 Quality rebalancing agents required:"
  cat "$SESSION_DIR/analysis/quality-gate-result.json" | grep -A 20 '"requiredAgents"'

  # Store rebalancing specs for Wave 2 integration
  cat "$SESSION_DIR/analysis/quality-gate-result.json" | \
    grep -A 50 '"requiredAgents"' > "$SESSION_DIR/analysis/quality-rebalancing-specs.json"

  echo ""
  echo "⚡ These agents will be spawned in Wave 2 with:"
  echo "   - Track assignment from quality gate (independent/contrarian)"
  echo "   - Focus from quality gate specifications"
  echo "   - Source tier restrictions enforced"
  echo ""
fi
```

**Integration with Wave 2 Decision:**

The quality gate results integrate with the existing pivot decision (Step 2.5d):

```markdown
Wave 2 will be triggered if EITHER:
1. Pivot analysis detects domain signals/gaps (Step 2.5d) - EXISTING
2. Quality gate fails and rebalancing needed (Step 2.6d) - NEW

If both trigger Wave 2:
- Merge agent specifications from both sources
- Deduplicate overlapping independent/contrarian agents
- Total Wave 2 agents = pivot specialists + quality rebalancing agents (max 6-8 total)
```

**Source Quality in Final Synthesis:**

The quality reports will be included in Step 3 synthesis:

```markdown
In the final synthesis output, include:

## Source Quality Assessment (M10)

[Contents of source-quality-report.md]

### Quality Gate Result
[Contents of quality-gate-result.md]

### Rebalancing Actions
- Rebalancing triggered: [yes/no]
- Agents spawned: [list with tracks and focus]
- Final quality status after Wave 2: [passed/failed with warnings]
```

**Step 2.6f: Post-Wave 2 Re-evaluation (If Rebalancing Occurred)**

If Wave 2 quality rebalancing was performed, re-evaluate after Wave 2 completes:

```bash
# This runs AFTER Wave 2 completes (in Step 3.5d)
if [ "$QUALITY_REBALANCE_NEEDED" = "true" ]; then
  echo "🔄 Re-evaluating source quality after Wave 2 rebalancing..."

  # Extract URLs from BOTH Wave 1 and Wave 2
  grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md "$SESSION_DIR"/wave-2/*.md 2>/dev/null | \
    sort -u > "$SESSION_DIR/analysis/wave1+2-urls.txt"

  cd ${PAI_DIR}/utilities/query-analyzer
  bun -e "
  const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
  const { evaluateQualityGate, shouldAttemptRebalancing } = require('./source-tiers/quality-gate');
  const fs = require('fs');

  const sessionDir = '$SESSION_DIR';
  const urls = fs.readFileSync(sessionDir + '/analysis/wave1+2-urls.txt', 'utf-8')
    .split('\n')
    .filter(u => u.trim());

  const report = analyzeSourceBalance(urls);
  const gate = evaluateQualityGate(report);
  const rebalance = shouldAttemptRebalancing(report, 1); // previousAttempts=1

  console.log('Post-rebalancing Quality Gate: ' + (gate.passed ? 'PASSED' : 'FAILED'));

  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.json', JSON.stringify({ report, gate, rebalance }, null, 2));
  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.md', generateMarkdownReport(report));
  "

  FINAL_GATE=$(cat "$SESSION_DIR/analysis/source-quality-final.json" | grep -o '"passed":[^,}]*' | head -1 | cut -d: -f2 | tr -d ' ')

  if [ "$FINAL_GATE" = "true" ]; then
    echo "✅ Source quality improved - gate now PASSED"
  else
    echo "⚠️ Source quality still concerning - proceeding with quality warnings in synthesis"
  fi
fi
```

---

### Step 3.5: Launch Wave 2 Specialists (CONDITIONAL - NEW STEP)

**ONLY execute this step if EITHER Step 2.5d (pivot decision) OR Step 2.6d (quality gate) determined Wave 2 is needed.**

Wave 2 triggers if:
1. Pivot analysis detected domain signals/gaps (Step 2.5d) - EXISTING
2. Quality gate failed and rebalancing needed (Step 2.6d) - NEW (M10)

If pivot decision AND quality gate both = "Skip Wave 2", go directly to Step 3 (Synthesis).

**Step 3.5a: Create Wave 2 Directory**

```bash
mkdir -p "$SESSION_DIR/wave-2"
echo "Wave 2 directory created: $SESSION_DIR/wave-2"
```

**Step 3.5b: Assign Tracks to Wave 2 Specialists**

Wave 2 specialists inherit track diversity. Maintain 50/25/25 distribution:

```bash
# If launching 4 Wave 2 agents: 2 standard, 1 independent, 1 contrarian
# If launching 6 Wave 2 agents: 3 standard, 2 independent, 1 contrarian

# Track assignments should complement Wave 1, not duplicate
# Example: If Wave 1 had strong standard coverage on topic X,
# assign Wave 2 agent on topic X to independent or contrarian track
```

**Step 3.5c: Merge Agent Specifications**

Merge agent specifications from both pivot analysis (Step 2.5d) and quality gate (Step 2.6e):

```bash
# Combine agents from both sources
# - Pivot decision agents (gap/signal focused)
# - Quality rebalancing agents (source tier focused)
# Deduplicate overlapping independent/contrarian agents
# Max total: 6-8 Wave 2 agents

# If quality-rebalancing-specs.json exists, merge with pivot agents
if [ -f "$SESSION_DIR/analysis/quality-rebalancing-specs.json" ]; then
  echo "🔀 Merging quality rebalancing agents with pivot specialists"
  # Read both specifications and combine
fi
```

**Step 3.5d: Launch Wave 2 Specialists in Parallel**

Based on the merged agent specifications, launch 0-8 specialists with FOCUSED queries AND track assignments:

```typescript
// Launch Wave 2 specialists in PARALLEL
// Use a SINGLE message with multiple Task tool calls
// NOTE: These are SPECIALISTS - focused on specific gaps/signals

Task({
  subagent_type: "grok-researcher",  // From pivot decision
  description: "Wave 2: Twitter/X OSINT deep dive",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: grok-researcher
**WAVE CONTEXT:** You are a Wave 2 specialist agent launched to address specific gaps identified in Wave 1.

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR SPECIALIST TASK**
You were launched because Wave 1 agents detected:
- STRONG Social Media signal (185 strength)
- Coverage gap: Real-time Twitter/X data

**Focus on:** [Specific gap/signal - e.g., "Twitter/X discussions about OSINT tools and real-world usage"]

Do ONE focused search query and ONE follow-up if needed. Use your native X access to fill the gap.

**ENHANCED TOOL GUIDANCE**
You have access to powerful MCP tools beyond your native X access:

For **Twitter/X historical** data (beyond native access):
- Use \`mcp__apify__call-actor\` with actor="scraper_one/x-profile-posts-scraper"
- Input: { "profileUrls": ["https://x.com/username"], "maxPosts": 50 }
- 99.8% success rate, extracts posts + engagement

For **Instagram** cross-platform research:
- Use \`mcp__apify__call-actor\` with actor="apify/instagram-post-scraper"
- Input: { "usernames": ["instagram_handle"], "resultsLimit": 20 }

**Fallback Chain:** Native Grok → Apify → Brightdata

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/wave-2/grok-[descriptive-topic].md

Example: ${SESSION_DIR}/wave-2/grok-twitter-osint-discussion.md

**YOUR RESEARCH TRACK: [TRACK_NAME]** ← Inject track assignment for Wave 2

[TRACK_SPECIFIC_INSTRUCTIONS] ← Same track guidance as Wave 1

**Source Tier Reference:**
- **Tier 1 (Independent):** Academic papers, standards bodies (NIST, OWASP), independent researchers
- **Tier 2 (Quasi-Independent):** Industry associations, news outlets, non-profits
- **Tier 3 (Vendor):** Product vendors, cloud providers, consulting firms
- **Tier 4 (Suspect):** SEO farms, affiliate sites - USE WITH CAUTION

**STRUCTURED OUTPUT REQUIREMENTS**

At the TOP of your research file, include this structured header:

---
agent_type: grok-researcher
wave: 2
specialist_focus: [gap/signal you're addressing]
execution_time: [timestamp]
track: [standard|independent|contrarian]
source_guidance: [track-specific guidance you received]
---

## Structured Metadata

### 1. Confidence Score (0-100)
**Your Score:** [NUMBER]
**Reasoning:** [Why this score?]

### 2. Gap Coverage
- **Gap Addressed:** [Which Wave 1 gap did you fill?]
- **New Information:** [What did you find that Wave 1 missed?]
- **Overlap with Wave 1:** [Any duplicate information?]

### 3. Additional Signals
Did your specialist search reveal any NEW domains or angles?

**New Signals:** [LIST]

### 4. Source Tier Distribution (M10 - Track Quality Metrics)
Report the source tiers you used:

**Sources by Tier:**
- **Tier 1 (Independent):** [count] - [list key sources]
- **Tier 2 (Quasi-Independent):** [count] - [list key sources]
- **Tier 3 (Vendor):** [count] - [JUSTIFY if on INDEPENDENT track]
- **Tier 4 (Suspect):** [count] - [should be 0 on INDEPENDENT track]

**Track Compliance:**
- Report if you met your track's sourcing requirements
- Justify any deviations from track guidance

---

## Your Specialist Research Findings

[Detailed research output focused on filling the identified gap - minimum 500 characters]

**CRITICAL OUTPUT REQUIREMENTS:**
1. Write to wave-2 directory (not wave-1)
2. Focus on filling the specific gap you were assigned
3. Include structured header
4. Minimum 500 characters
5. Include all source URLs

**DO NOT** duplicate Wave 1 findings - focus on NEW information.
`
})

// Continue launching specialists according to merged specifications
// Total: 0-8 agents (pivot + quality rebalancing)
// Each targets a specific gap, signal, or source quality issue
```

**Step 3.5e: Wait for Wave 2 Completion**

Wait for all Wave 2 specialists to complete (15-30 seconds).

**Step 3.5f: Validate Wave 2 Results**

Same validation as Step 2a:
- Length check (500+ characters)
- Content check (actual findings)
- Structure check (metadata present)
- Error detection

**Note:** If Wave 2 agents fail validation, log the failure but DO NOT retry. Wave 2 is already a refinement step. Proceed to synthesis with partial Wave 2 coverage.

**Step 3.5g: Post-Wave 2 Quality Re-evaluation (M10)**

If quality rebalancing was triggered (Step 2.6d), re-evaluate source quality:

```bash
# Execute the post-rebalancing quality check from Step 2.6f
# This runs after Wave 2 completes to verify quality improvement

if [ "$QUALITY_REBALANCE_NEEDED" = "true" ]; then
  echo "🔄 Re-evaluating source quality after Wave 2 rebalancing..."

  # Extract URLs from BOTH Wave 1 and Wave 2
  grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md "$SESSION_DIR"/wave-2/*.md 2>/dev/null | \
    sort -u > "$SESSION_DIR/analysis/wave1+2-urls.txt"

  cd ${PAI_DIR}/utilities/query-analyzer
  bun -e "
  const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
  const { evaluateQualityGate, shouldAttemptRebalancing } = require('./source-tiers/quality-gate');
  const fs = require('fs');

  const sessionDir = '$SESSION_DIR';
  const urls = fs.readFileSync(sessionDir + '/analysis/wave1+2-urls.txt', 'utf-8')
    .split('\n')
    .filter(u => u.trim());

  const report = analyzeSourceBalance(urls);
  const gate = evaluateQualityGate(report);
  const rebalance = shouldAttemptRebalancing(report, 1); // previousAttempts=1

  console.log('Post-rebalancing Quality Gate: ' + (gate.passed ? 'PASSED' : 'FAILED'));

  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.json', JSON.stringify({ report, gate, rebalance }, null, 2));
  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.md', generateMarkdownReport(report));
  "

  FINAL_GATE=$(cat "$SESSION_DIR/analysis/source-quality-final.json" | grep -o '"passed":[^,}]*' | head -1 | cut -d: -f2 | tr -d ' ')

  if [ "$FINAL_GATE" = "true" ]; then
    echo "✅ Source quality improved - gate now PASSED"
  else
    echo "⚠️ Source quality still concerning - proceeding with quality warnings in synthesis"
  fi
fi
```

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

**Step 2.7f: Synthesis Citation Rules**

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

### Step 3.3: Orchestrator Quality Validation (M12)

**After synthesis-researcher completes, the orchestrator MUST validate the deliverable:**

**Step 3.3a: Verify Output Exists**

```bash
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

### Step 4: Return Results Using MANDATORY Format (Enhanced)

📅 [current date from `date` command]
**📋 SUMMARY:** Adaptive two-wave research coordination and key findings overview
**🔍 ANALYSIS:** Synthesis of Wave 1 exploration + Wave 2 specialist findings
**⚡ ACTIONS:** Wave 1 ([N] agents), Pivot Analysis (quality scoring, domain signals, gap detection), Wave 2 ([N] specialists or skipped)
**✅ RESULTS:** Complete synthesized findings with source attribution and wave-based confidence levels
**📊 STATUS:** Research coverage, confidence levels, pivot efficiency, data quality
**➡️ NEXT:** Recommended follow-up research or verification needed (if any gaps remain)
**🎯 COMPLETED:** Completed adaptive multi-wave [topic] research
**🗣️ CUSTOM COMPLETED:** [Optional: Voice-optimized under 8 words]

**📈 RESEARCH METRICS:**
- **Wave 1 Agents:** [N] (Quality Avg: [score])
- **Wave 2 Specialists:** [N] or "Skipped" (Quality Avg: [score] if launched)
- **Total Queries:** [X] (Wave 1: [Y], Wave 2: [Z])
- **Services Used:** [N] (List: [service1, service2])
- **Total Output:** [~X words/characters across both waves]
- **Confidence Level:** [High/Medium/Low] ([percentage]%)
- **Pivot Decision:** [LAUNCH WAVE 2 / SKIP WAVE 2] - [reasoning]
- **Platform Coverage:** [X/Y] perspectives fully covered (AD-008)
- **Result:** [Brief summary answer to the query]

**📊 AGENT PERFORMANCE (TWO-WAVE):**

**Wave 1: Exploration**

| Agent | Type | Time | Quality | Confidence | Sources | Success |
|-------|------|------|---------|------------|---------|---------|
| Agent-1 | perplexity | X.Xs | [score] | [score] | N | ✅/❌ |
| Agent-2 | claude | X.Xs | [score] | [score] | N | ✅/❌ |
| ... | ... | ... | ... | ... | ... | ... |

**Wave 2: Specialists** [Only if Wave 2 launched]

| Agent | Type | Time | Quality | Gap Addressed | Sources | Success |
|-------|------|------|---------|---------------|---------|---------|
| Spec-1 | grok | X.Xs | [score] | Social Media | N | ✅/❌ |
| Spec-2 | gemini | X.Xs | [score] | Visual Content | N | ✅/❌ |
| ... | ... | ... | ... | ... | ... | ... |

**🔄 PIVOT ANALYSIS:**
- **Domain Signals:** [top signals with strengths]
- **Coverage Gaps:** [N] identified in Wave 1
- **Decision Rationale:** [why Wave 2 was launched or skipped]
- **Wave 2 Value:** [did specialists add significant new information?]

## 🚨 CRITICAL RULES FOR {{DA}}

### Query Analysis Phase (NEW)
1. **ALWAYS start with Step 0.5** - Analyze query before launching agents
2. **DETERMINE complexity** - Simple (4 agents), Moderate (5 agents), Complex (6 agents)
3. **ALLOCATE intelligently** - Match agent types to dominant domains
4. **WRITE analysis report** - Document your reasoning in analysis/query-analysis.md

### Wave 1 Execution
5. **LAUNCH 4-6 agents in parallel** - NOT 10, complexity-dependent
6. **USE enhanced prompts** - Include structured output requirements (confidence, coverage, signals)
7. **ONE QUERY + ONE FOLLOW-UP per agent** - Quick, focused research cycles
8. **WAIT for ALL agents to complete** before pivot analysis

### Pivot Analysis Phase (NEW - CRITICAL)
9. **CALCULATE quality scores** - Length + sources + confidence (0-100 scale)
10. **DETECT domain signals** - Count keywords, extract agent reports, calculate signal strength
11. **IDENTIFY coverage gaps** - Extract from agent structured metadata
12. **MAKE pivot decision** - Use decision matrix to determine if Wave 2 is needed
13. **WRITE all analysis artifacts** - quality-scores.md, domain-signals.md, coverage-gaps.md, pivot-decision.md

### Wave 2 Execution (CONDITIONAL)
14. **LAUNCH Wave 2 ONLY if pivot decision says so** - Otherwise skip to synthesis
15. **FOCUS specialists** - Each addresses specific gap or strong signal
16. **USE specialist prompts** - Include Wave 2 context and gap assignment
17. **WAIT for Wave 2 completion** - Typically 15-30 seconds

### Citation Validation Phase (CRITICAL - DO NOT SKIP)
18. **EXTRACT all URLs** - From Wave 1 + Wave 2 research files
19. **LAUNCH citation validators** - 1-3 agents based on citation count
20. **VALIDATE each citation** - Check URL accessibility AND content match
21. **FLAG issues** - Mark ✅ valid, ⚠️ mismatch, ❌ invalid, 🔒 paywalled
22. **URLs MANDATORY in output** - Every reference MUST include its source URL

### Synthesis & Reporting
23. **COMBINE both waves** - Don't synthesize Wave 1 alone
24. **USE task graph visualization** - Show wave structure and flow
25. **ATTRIBUTE by wave** - Show which wave contributed which findings
26. **REPORT pivot efficiency** - Was Wave 2 decision correct?
27. **USE mandatory response format** - Triggers voice notifications
28. **INCLUDE enhanced metrics** - Two-wave performance, quality scores, pivot analysis

### Preservation (Raw Materials)
29. **DO NOT DELETE session directory** - Preserve for future analysis

**ADAPTIVE WORKFLOW CHECKLIST:**
- ✅ Step 0.5: Query analyzed and perspectives generated?
- ✅ Wave 1: Launched agents based on perspective-first routing?
- ✅ Wave 1: Enhanced prompts with structured output?
- ✅ Step 2.5: Quality scores calculated?
- ✅ Step 2.5: Domain signals detected?
- ✅ Step 2.5: Coverage gaps identified?
- ✅ Step 2.5: Pivot decision matrix executed?
- ✅ **Step 2.6: SOURCE QUALITY EVALUATED?** ← M10
- ✅ Step 2.6: URLs extracted from Wave 1 outputs?
- ✅ Step 2.6: Source balance analysis completed?
- ✅ Step 2.6: Quality gate evaluation executed?
- ✅ Step 2.6: Quality gate decision documented?
- ✅ Step 2.6: Rebalancing triggered if needed?
- ✅ Step 2.6: Source quality report saved to analysis/?
- ✅ Wave 2: Launched conditionally based on pivot decision OR quality gate?
- ✅ Wave 2: Quality rebalancing agents included if triggered?
- ✅ Wave 2: Specialists focused on gaps/signals?
- ✅ **Step 2.7: CITATION VALIDATION EXECUTED (BEFORE synthesis)?** ← CRITICAL
- ✅ Step 2.7: All agent citations extracted and validated?
- ✅ Step 2.7: Validated citation pool created?
- ✅ Step 2.7: Invalid citations flagged for exclusion?
- ✅ Step 2.7: **HALLUCINATION REPORT generated with per-agent tracking?** ← NEW
- ✅ Step 3: **SYNTHESIS USES ONLY VALIDATED CITATIONS?** ← CRITICAL
- ✅ Step 3: **SIX-PART ACADEMIC STRUCTURE USED?**
- ✅ Step 3: Clickable Table of Contents with internal links?
- ✅ Step 3: **ALL PERSPECTIVES COVERED EXPLICITLY** with agent attribution?
- ✅ Step 3: Methodology in Part II (separate from findings)?
- ✅ Step 3: Findings by Perspective in Part III?
- ✅ Step 3.8: **EMERGENT RESEARCH DIRECTIONS INCLUDED?** ← MANDATORY
- ✅ Step 3.8: Minimum 5 research gaps with agent attribution?
- ✅ Step 3.8: Minimum 5 follow-up queries with target agents?
- ✅ Step 3.8: Synthesis observations (emergent patterns)?
- ✅ **Step 3.0: UNIFIED CITATION POOL CREATED?** ← M11 NEW
- ✅ Step 3.0: All citations extracted from wave-1/*.md and wave-2/*.md?
- ✅ Step 3.0: Citations renumbered to unified [1]...[N] sequence?
- ✅ Step 3.0: Quick lookup table with agent → unified mapping?
- ✅ Step 3.0: Multi-source markers (🔥) for citations found by 2+ agents?
- ✅ **Step 3b: INLINE CITATIONS IN PROSE?** ← M11 CRITICAL
- ✅ Step 3b: Every statistic has [N] citation?
- ✅ Step 3b: Every date has [N] citation?
- ✅ Step 3b: Every named entity claim has [N] citation?
- ✅ Step 3b: NO uncited factual claims in Part III/IV?
- ✅ Step 3b: Prose format (NOT bullet lists) for findings?
- ✅ **Step 3.9: CITATION DENSITY VALIDATION PASSED?** ← M11 MANDATORY
- ✅ Step 3.9: Citation density ratio ≥ 1.0?
- ✅ Step 3.9: Validation report saved to analysis/?
- ✅ **FLAGGED CLAIMS: Full details provided?** ← M11
- ✅ Flagged claims include: exact text, agent, URL, issue, recommendation?
- ✅ References: ALL include URLs from validated pool (mandatory)?
- ✅ Step 3.6: Task graph generated with decision trail?
- ✅ Metrics: Reported two-wave performance and pivot efficiency?
- ✅ Preservation: Session directory NOT deleted?

## 🚧 HANDLING BLOCKED OR FAILED CRAWLS

If research commands report being blocked, encountering CAPTCHAs, or facing bot detection, note this in your synthesis and recommend using:
- `mcp__Brightdata__scrape_as_markdown` - Scrape single URLs that bypass bot detection
- `mcp__Brightdata__scrape_batch` - Scrape multiple URLs (up to 10)
- `mcp__Brightdata__search_engine` - Search Google, Bing, or Yandex with CAPTCHA bypass
- `mcp__Brightdata__search_engine_batch` - Multiple search queries simultaneously

## 💡 EXAMPLE EXECUTION (Adaptive Two-Wave)

**User asks:** "Research OSINT tools for threat intelligence"

**Your adaptive workflow:**

1. ✅ **Step 0: Initialize**
   - Create session: `${PAI_DIR}/scratchpad/research/20251124-143022-12345/`
   - Create directories: wave-1, analysis

2. ✅ **Step 0.5: Query Analysis**
   - Keywords: research, OSINT, tools, threat, intelligence
   - Domain scores: Security (60), Technical (40), Social (20)
   - Complexity: MODERATE-HIGH (research-oriented, multi-faceted)
   - Initial allocation: 5 agents (2 perplexity, 2 claude, 1 grok)
   - Write to: `analysis/query-analysis.md`

3. ✅ **Step 1: Launch Wave 1 (5 agents in parallel)**
   ```typescript
   Task({ perplexity-researcher: "OSINT tool listings and capabilities" })
   Task({ perplexity-researcher: "Threat intelligence use cases" })
   Task({ claude-researcher: "Technical analysis of top OSINT tools" })
   Task({ claude-researcher: "OSINT tool comparisons" })
   Task({ grok-researcher: "Community discussions and real-world usage" })
   ```
   - Each agent includes structured output requirements
   - All write to wave-1 directory

4. ✅ **Step 2: Collect Wave 1 Results**
   - Wait 15-30 seconds
   - Validate each agent result (length, sources, structure)

5. ✅ **Step 2.5: Pivot Analysis**
   - **Quality Scoring:**
     - perplexity-1: 82 (EXCELLENT)
     - perplexity-2: 75 (GOOD)
     - claude-1: 68 (GOOD)
     - claude-2: 71 (GOOD)
     - grok-1: 45 (MODERATE)
     - Average: 68.2 (GOOD)
   - **Domain Signals:**
     - Social Media: 185 (STRONG) - Twitter mentioned 12 times across agents
     - Academic: 95 (WEAK) - 4 research paper references
     - Technical: 65 (WEAK) - 3 GitHub repos mentioned
   - **Coverage Gaps:**
     - Gap 1: Real-time Twitter/X discussions (reported by perplexity-1, claude-2)
     - Gap 2: Visual tutorials (reported by claude-1)
   - **Pivot Decision:**
     - Flags: STRONG_PIVOT_DETECTED (Social: 185), GAPS_IDENTIFIED (2)
     - Decision: LAUNCH WAVE 2 with 3 specialists
   - Write all to: analysis/ directory

6. ✅ **Step 3.5: Launch Wave 2 (3 specialists in parallel)**
   ```typescript
   Task({ grok-researcher: "Twitter/X OSINT tool discussions" })
   Task({ grok-researcher: "X threat intel community insights" })
   Task({ gemini-researcher: "Video tutorials and visual guides for OSINT tools" })
   ```
   - Each specialist targets identified gap
   - All write to wave-2 directory

7. ✅ **Step 3: Synthesize**
   - Read all Wave 1 files (5 agents)
   - Read all Wave 2 files (3 specialists)
   - Read analysis artifacts
   - Create task graph visualization
   - Combine findings with wave attribution
   - Calculate two-wave metrics
   - Write to: `final-synthesis.md`

8. ✅ **Step 4: Report Results**
   - Use mandatory format with two-wave metrics
   - Report pivot decision and efficiency
   - Include agent performance by wave
   - Voice notification triggered automatically

9. ✅ **Step 5: Cleanup**
   - Remove session directory after reporting

**Result:** User gets intelligent, adaptive research with 5 Wave 1 exploratory agents + 3 Wave 2 specialists (total: 8 agents, not 10). Strong social media signal detected and addressed. High-quality synthesis with task graph visualization. Completed in under 2 minutes with optimized resource allocation.

## 🎤 VOICE NOTIFICATIONS

Voice notifications are AUTOMATIC when you use the mandatory response format. The stop-hook will:
- Extract your 🎯 COMPLETED line
- Send it to the voice server with voiceId onwK4e9ZLuTAKqWW03F9
- Announce "Completed adaptive multi-wave [topic] research"

**YOU DO NOT NEED TO MANUALLY SEND VOICE NOTIFICATIONS** - just use the format.

## Step 5: Preserve Raw Materials (DO NOT DELETE)

**⚠️ CRITICAL: Raw research files are preserved by default. DO NOT delete session directories.**

**Why we preserve:**
- Raw agent outputs are valuable for future analysis (researching the researchers)
- {{ENGINEER_NAME}} may want to reference specific agent findings later
- Citation validation links and evidence must remain accessible
- Enables post-hoc quality assessment and agent comparison
- Blog series and documentation may reference specific findings

**Preservation Policy:**
- Wave 1 files: KEEP in `wave-1/` directory
- Wave 2 files: KEEP in `wave-2/` directory
- Analysis files: KEEP in `analysis/` directory
- Final synthesis: KEEP in session root

**Session Directory Location:** `${PAI_DIR}/scratchpad/research/$SESSION_ID/`

**Cleanup Rules:**
- Sessions are ONLY deleted when {{ENGINEER_NAME}} explicitly requests it
- Manual cleanup command: `rm -rf ${PAI_DIR}/scratchpad/research/$SESSION_ID`
- Bulk cleanup (all sessions): `rm -rf ${PAI_DIR}/scratchpad/research/*`

**Optional: Archive Completed Sessions**
```bash
# Archive to permanent location (preserves structure)
ARCHIVE_NAME="[topic-slug]-$CURRENT_DATE"
cp -r "$SESSION_DIR" ${PAI_DIR}/scratchpad/research-archive/"$ARCHIVE_NAME"
echo "Session archived to: ${PAI_DIR}/scratchpad/research-archive/$ARCHIVE_NAME"
```

## Step 5.1: Update Research Index (M12)

**⚠️ MANDATORY: Update the research index after every completed session.**

After synthesis is complete, update `${PAI_DIR}/scratchpad/research/README.md`:

```bash
README_PATH="$HOME/.claude/scratchpad/research/README.md"

# Create header if doesn't exist
if [ ! -f "$README_PATH" ]; then
  cat > "$README_PATH" << 'HEADER'
# Research Sessions Index

Auto-updated after each research session by conduct-research-adaptive.md.

## Sessions

| Session ID | Date | Query/Topic | Agents | Status |
|------------|------|-------------|--------|--------|
HEADER
fi

# Extract info from current session
QUERY_TITLE="[Extract from final-synthesis.md header or query-analysis.json]"
AGENT_COUNT="[Count files in wave-1/ and wave-2/]"

# Append row to index (insert at line 9, after header)
NEW_ROW="| $SESSION_ID | $(date +%Y-%m-%d) | $QUERY_TITLE | $AGENT_COUNT | ✅ Complete |"
sed -i '' "9i\\
$NEW_ROW
" "$README_PATH" 2>/dev/null || echo "$NEW_ROW" >> "$README_PATH"

echo "📋 Research index updated: $README_PATH"
```

**Index Format (M12):**
- Session ID: Directory name (e.g., `20251127-230707-6559`)
- Date: YYYY-MM-DD format
- Query/Topic: Short description extracted from synthesis header
- Agents: Count of agents used (Wave 1 + Wave 2)
- Status: ✅ Complete, ⚠️ Partial, or 📋 Legacy

**Index Location:** `${PAI_DIR}/scratchpad/research/README.md`

## 🔄 BENEFITS OF ADAPTIVE TWO-WAVE ARCHITECTURE

**Why this is superior to the original brute-force approach:**

### Intelligence over Brute Force
1. ✅ **Step 0.5 query analysis** - Understand before executing
2. ✅ **4-6 Wave 1 agents** - Not 10, optimized allocation
3. ✅ **Quality scoring** - Assess agent performance objectively
4. ✅ **Domain signal detection** - Find cross-domain opportunities
5. ✅ **Coverage gap analysis** - Identify what's missing
6. ✅ **Conditional Wave 2** - Launch specialists ONLY when needed
7. ✅ **Task graph visualization** - Show research architecture

### Resource Efficiency
- ❌ **Old way:** Always 10 agents regardless of complexity
- ✅ **New way:** 4-6 Wave 1 + 0-6 Wave 2 = 4-12 agents (dynamic)
- **Simple queries:** 4 agents total (no Wave 2 needed)
- **Complex queries:** Up to 12 agents with specialist depth

### Quality Improvements
- **Structured agent output** - Confidence scores, coverage assessment, domain signals
- **Real-time pivot analysis** - Make intelligent decisions based on Wave 1 results
- **Specialist deployment** - Address specific gaps, not random coverage
- **Multi-wave validation** - Cross-wave corroboration increases confidence

### Transparency
- **Query analysis documented** - User sees reasoning for agent allocation
- **Quality scores visible** - User sees agent performance metrics
- **Pivot rationale explained** - User understands why Wave 2 launched (or didn't)
- **Task graph shows flow** - Visual representation of research architecture

**Speed Comparison:**
- ❌ **Old way:** 10 agents always → Sometimes overkill, sometimes insufficient
- ✅ **New way:** Adaptive allocation → Right-sized for query complexity

**Quality Comparison:**
- ❌ **Old way:** No quality assessment → Can't evaluate agent performance
- ✅ **New way:** Quality scoring → Know which agents delivered value

**Intelligence Comparison:**
- ❌ **Old way:** Static plan → No learning from initial results
- ✅ **New way:** Dynamic pivoting → Wave 2 adapts based on Wave 1 discoveries

**This is the intelligent, adaptive architecture. Use it for SMART research.**

---

## 📝 IMPLEMENTATION NOTES & TODOs

**Areas requiring detailed implementation:**

### TODO: Step 0.5 - Query Analysis Refinement
- [ ] Build comprehensive domain keyword dictionaries
- [ ] Implement complexity scoring algorithm
- [ ] Create agent allocation decision tree
- [ ] Add examples for edge cases (very simple queries, highly complex queries)

### TODO: Step 2.5a - Automated Quality Scoring
- [ ] Implement character counting function
- [ ] Implement URL extraction and counting
- [ ] Create quality score calculator (combines length, sources, confidence)
- [ ] Add quality band classification logic

### TODO: Step 2.5b - Automated Domain Signal Detection
- [ ] Build keyword matching engine (case-insensitive, stemming)
- [ ] Implement weighted signal strength calculation
- [ ] Create domain ranking and threshold application
- [ ] Parse structured metadata sections from agent files

### TODO: Step 2.5c - Coverage Gap Extraction
- [ ] Parse "Limited Coverage" sections from structured metadata
- [ ] Aggregate gaps across multiple agents
- [ ] Map gaps to specialist recommendations
- [ ] Prioritize gaps by frequency and severity

### TODO: Step 2.5d - Pivot Decision Matrix
- [ ] Implement flag detection logic
- [ ] Create specialist allocation calculator
- [ ] Generate Wave 2 execution plan with reasoning
- [ ] Add edge case handling (e.g., all agents fail, no signals detected)

### TODO: Step 3 - Enhanced Synthesis
- [ ] Task graph visualization formatting (ASCII art? Mermaid?)
- [ ] Cross-wave validation algorithm (finding overlap and unique contributions)
- [ ] Pivot efficiency assessment (was Wave 2 worth it?)
- [ ] Coverage analysis by domain

### TODO: Testing & Validation
- [ ] Test with simple queries (expect 4 agents, no Wave 2)
- [ ] Test with moderate queries (expect 5 agents, possible Wave 2)
- [ ] Test with complex queries (expect 6 agents, likely Wave 2)
- [ ] Test pivot decision edge cases
- [ ] Validate cleanup works for both wave structures

### QUESTIONS FOR MARVIN (Orchestrator Review):
1. Should query analysis (Step 0.5) be automated or manual for first iteration?
2. What's the preferred task graph visualization format? ASCII? Mermaid? Plain markdown?
3. Should we persist analysis artifacts or clean them up with session?
4. How aggressive should quality thresholds be? (Currently: <40 = poor)
5. Should Wave 2 have a maximum cap? (Currently: up to 6 specialists)
6. What happens if ALL Wave 1 agents fail? Fallback strategy?
7. Should we add a Wave 3 option for highly complex queries?

---

**END OF ADAPTIVE RESEARCH COMMAND FILE**

**Status:** SKELETON COMPLETE - Ready for orchestrator review and refinement
**Next Steps:** {{DA}} spotcheck, refinement, testing, integration into ${PAI_DIR}/commands/
