---
description: "Research Collection Execute: Launch agents, collect results, pivot analysis, source quality (called by /_research-collect)"
globs: ""
alwaysApply: false
---

## Tool Mapping Reference

**CRITICAL:** Before launching agents, load tool constraints from the shared mapping file.

The tool mapping at `${PAI_DIR}/config/agent-tool-mapping.json` defines:
- `primaryTool` - The tool each agent MUST use
- `forbidden[]` - Tools the agent is FORBIDDEN from using
- `promptBlock` - The exact text to inject into agent prompts
- `toolConflictPatterns` - Regex patterns indicating agent refused due to tool conflict

**Loading the mapping (conceptual - {{DA}} executes mentally):**

```bash
# Read mapping
TOOL_MAPPING=$(cat "$HOME/.claude/config/agent-tool-mapping.json")

# Get prompt block for agent
get_agent_tool_block() {
  local agent_type="$1"
  echo "$TOOL_MAPPING" | jq -r ".agents[\"$agent_type\"].promptBlock"
}

# Example: Get gemini's tool block
GEMINI_BLOCK=$(get_agent_tool_block "gemini-researcher")
```

**Agent Tool Summary:**

| Agent | Primary Tool | Forbidden |
|-------|--------------|-----------|
| claude-researcher | WebSearch | - |
| gemini-researcher | Gemini OAuth CLI | WebSearch, WebFetch, Brightdata, Apify |
| grok-researcher | Grok CLI | WebSearch, WebFetch, Brightdata, Apify |
| perplexity-researcher | Perplexity CLI | WebSearch, WebFetch |

---

# Research Collection - Execute Phase

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Execute research collection by:
1. Launching Wave 1 exploration agents with perspectives from /research-init
2. Validating and scoring Wave 1 results
3. Analyzing for pivots (domain signals, coverage gaps, quality scores)
4. Evaluating source quality (M10 framework)
5. Conditionally launching Wave 2 specialists

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
- `$SESSION_DIR/analysis/quality-scores.md` - Agent quality assessment
- `$SESSION_DIR/analysis/domain-signals.md` - Cross-domain signals detected
- `$SESSION_DIR/analysis/coverage-gaps.md` - Identified coverage gaps
- `$SESSION_DIR/analysis/pivot-decision.md` - Wave 2 decision rationale
- `$SESSION_DIR/analysis/source-quality-report.md` - M10 source tier analysis

**Return to orchestrator:** "Execute complete" with agent counts and pivot decision

---

## STEP-BY-STEP WORKFLOW

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

**YOUR RESEARCH TOOL (MANDATORY)**

${AGENT_TOOL_BLOCK}

**CRITICAL TOOL RULES:**
1. Use ONLY the tool specified above
2. If your primary tool fails, follow the fallback instructions above (or STOP if no fallback)
3. Do NOT improvise with other tools
4. If you encounter a tool you're forbidden from using, STOP and report the conflict

**WHY THIS MATTERS:** Each research agent has constitutional tool constraints. Using a forbidden tool will cause your task to fail. The tool block above is specifically selected for YOUR agent type.

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

**YOUR RESEARCH TOOL (MANDATORY)**

${AGENT_TOOL_BLOCK}

**CRITICAL TOOL RULES:**
1. Use ONLY the tool specified above
2. If your primary tool fails, follow the fallback instructions above (or STOP if no fallback)
3. Do NOT improvise with other tools
4. If you encounter a tool you're forbidden from using, STOP and report the conflict

**WHY THIS MATTERS:** Each research agent has constitutional tool constraints. Using a forbidden tool will cause your task to fail. The tool block above is specifically selected for YOUR agent type.

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

### Agent-Specific Task Examples

**Example 1: claude-researcher (WebSearch allowed)**
```javascript
Task({
  subagent_type: "claude-researcher",
  description: "Research: API design patterns",
  prompt: `
**YOUR AGENT IDENTITY**
Agent: claude-researcher

**YOUR RESEARCH TOOL (MANDATORY)**
**YOUR PRIMARY RESEARCH TOOL:** WebSearch (Claude's native capability)
**YOUR TASK:** Use WebSearch to investigate your assigned perspective.
**FALLBACK CHAIN:** If WebSearch insufficient → Apify → Brightdata

[Rest of research instructions...]
`
})
```

**Example 2: gemini-researcher (WebSearch FORBIDDEN)**
```javascript
Task({
  subagent_type: "gemini-researcher",
  description: "Research: Visual AI architectures",
  prompt: `
**YOUR AGENT IDENTITY**
Agent: gemini-researcher

**YOUR RESEARCH TOOL (MANDATORY)**
**YOUR PRIMARY RESEARCH TOOL:** Gemini OAuth CLI with Google Search grounding
**COMMAND:** ${PAI_DIR}/agents/clients/gemini-oauth/gemini-oauth -s "[your query]"
**YOUR TASK:** Use the Gemini OAuth CLI to investigate your assigned perspective.
**NO FALLBACK:** If Gemini CLI fails, STOP and report error. Do NOT use WebSearch.
**FORBIDDEN:** WebSearch, WebFetch, Brightdata, Apify

**CRITICAL:** If you use WebSearch, you WILL violate your constitution and fail.

[Rest of research instructions...]
`
})
```

**Example 3: grok-researcher (WebSearch FORBIDDEN)**
```javascript
Task({
  subagent_type: "grok-researcher",
  description: "Research: Real-time data analysis",
  prompt: `
**YOUR AGENT IDENTITY**
Agent: grok-researcher

**YOUR RESEARCH TOOL (MANDATORY)**
**YOUR PRIMARY RESEARCH TOOL:** Grok CLI
**COMMAND:** $HOME/.bun/bin/grok -p "[your query]" -m "$GROK_MODEL"
**YOUR TASK:** Use the Grok CLI to investigate your assigned perspective.
**NO FALLBACK:** If Grok CLI fails, STOP and report error. Do NOT use WebSearch.
**FORBIDDEN:** WebSearch, WebFetch, Brightdata, Apify

**CRITICAL:** If you use WebSearch, you WILL violate your constitution and fail.

[Rest of research instructions...]
`
})
```

**Example 4: perplexity-researcher (WebSearch FORBIDDEN)**
```javascript
Task({
  subagent_type: "perplexity-researcher",
  description: "Research: Technical documentation analysis",
  prompt: `
**YOUR AGENT IDENTITY**
Agent: perplexity-researcher

**YOUR RESEARCH TOOL (MANDATORY)**
**YOUR PRIMARY RESEARCH TOOL:** Perplexity CLI with citations
**COMMAND:** ${PAI_DIR}/agents/clients/perplexity -c -m "${PERPLEXITY_MODEL:-sonar-pro}" "[query]"
**YOUR TASK:** Use the Perplexity CLI to investigate your assigned perspective.
**NO FALLBACK:** If Perplexity CLI fails, STOP and report error. Do NOT use WebSearch.
**FORBIDDEN:** WebSearch, WebFetch

**CRITICAL:** If you use WebSearch, you WILL violate your constitution and fail.

[Rest of research instructions...]
`
})
```

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

### Step 2b: Detect Tool Conflict Failures

**Purpose:** Identify agents that refused to execute due to constitutional tool violations.

**Check for these patterns in agent output files:**
- "CONSTITUTIONAL VIOLATION"
- "FORBIDDEN"
- "constitutional requirements"
- "tool conflict"
- "cannot use WebSearch"

**Detection Process:**

```bash
# Patterns from agent-tool-mapping.json
CONFLICT_PATTERNS="CONSTITUTIONAL VIOLATION|FORBIDDEN|constitutional requirements|tool conflict|cannot use WebSearch"

# Scan wave-1 outputs
for output_file in "$SESSION_DIR/wave-1"/*.md; do
  if grep -qiE "$CONFLICT_PATTERNS" "$output_file" 2>/dev/null; then
    AGENT_FILE=$(basename "$output_file" .md)
    echo "⚠️ TOOL CONFLICT: $AGENT_FILE"
    echo "$AGENT_FILE" >> "$SESSION_DIR/analysis/retry-queue.txt"
  fi
done
```

**What to do when conflicts are detected:**

1. Log the agent name to `retry-queue.txt`
2. Extract the correct agent type (e.g., `W1-3-visual-content` → `gemini-researcher`)
3. Retrieve the correct `promptBlock` from agent-tool-mapping.json
4. Proceed to Step 2c for retry

**Conflict Detection Report:**

After scanning, report:
```
📊 Tool Conflict Summary:
- Agents scanned: [count]
- Conflicts detected: [count]
- Agents queued for retry: [list]
```

If no conflicts, skip Step 2c and proceed to pivot analysis.

### Step 2c: Retry Failed Agents with Correct Tool Instructions

**Trigger:** Only execute if `retry-queue.txt` is non-empty.

**Retry Process:**

For each agent in the retry queue:

1. **Extract agent type from filename:**
   - `W1-3-visual-content` → look at track-allocation.json → `gemini-researcher`
   - The agent type is stored in track-allocation.json under `perspectives[].agent`

2. **Get correct tool block:**
   ```javascript
   const agentType = trackAllocation.perspectives.find(p => p.id === agentId).agent;
   const correctToolBlock = agentToolMapping.agents[agentType].promptBlock;
   ```

3. **Relaunch with corrected prompt:**
   ```
   Task({
     subagent_type: agentType,
     description: "RETRY: [original perspective focus]",
     prompt: `
   **RETRY NOTICE:** Your previous attempt failed due to a tool conflict.
   This retry includes the CORRECT tool instructions for your agent type.

   **YOUR RESEARCH TOOL (MANDATORY)**

   ${correctToolBlock}  // ← The ACTUAL correct block for this agent

   **CRITICAL:** You MUST use ONLY the tool specified above.
   Your previous failure was because you were given incorrect tool instructions.
   This has been corrected. Do NOT use any forbidden tools.

   [Original research perspective and instructions...]
   `
   })
   ```

4. **Retry limits:**
   - Maximum 1 retry per agent
   - If retry also fails → log as "partial coverage" and continue
   - Do NOT infinite loop

**Retry Results:**

After retries complete:
```
📊 Retry Results:
- Retried: [count] agents
- Succeeded: [count]
- Still failed: [count] (logged as partial coverage)
```

**Important:** Agents that still fail after retry should be noted in the pivot analysis as coverage gaps that may trigger Wave 2 specialists.

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

**YOUR RESEARCH TOOL (MANDATORY)**

${AGENT_TOOL_BLOCK}

**CRITICAL TOOL RULES:**
1. Use ONLY the tool specified above
2. If your primary tool fails, follow the fallback instructions above (or STOP if no fallback)
3. Do NOT improvise with other tools
4. If you encounter a tool you're forbidden from using, STOP and report the conflict

**WHY THIS MATTERS:** Each research agent has constitutional tool constraints. Using a forbidden tool will cause your task to fail. The tool block above is specifically selected for YOUR agent type.

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

---

## EXECUTE PHASE COMPLETE

After executing Steps 1, 2, 2a, 2.5, 2.6, and 3.5:

**Report back to orchestrator:**
```
EXECUTE PHASE COMPLETE
Wave 1 Agents: [count]
Wave 2 Specialists: [count or "skipped"]
Pivot Decision: [LAUNCH WAVE 2 / SKIP WAVE 2]
Quality Gate: [passed/failed with warnings]
Files Created: wave-1/*.md, wave-2/*.md (if applicable), analysis/*.md
```

The orchestrator will then call `/_research-collect-validate` for citation validation.
