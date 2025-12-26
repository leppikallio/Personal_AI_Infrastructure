---
description: "Research Collection Wave 1: Launch exploration agents with perspectives (called by /_research-collect)"
globs: ""
alwaysApply: false
---

# Research Collection - Wave 1 Agent Launch

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Gate: Entry Verification

```bash
set +H  # Disable history expansion
# CONSTITUTIONAL: Verify gate before proceeding
PAI_DIR="${HOME}/.claude"
GATE_CLI="${PAI_DIR}/utilities/research-orchestrator/cli.ts"

# Wave 1 is the first phase - no prerequisites to check
# But verify session directory exists
if [ ! -d "$SESSION_DIR/analysis" ]; then
  echo "GATE FAILED: Session directory not initialized"
  exit 1
fi

echo "Gate passed: Ready for wave1-launch"
```

## Phase Purpose

Launch Wave 1 exploration agents with perspectives from query analysis. Each agent gets ONE perspective with its assigned track (standard/independent/contrarian).

## Phase Input

Expects from previous phase:
- `SESSION_DIR` - Research session directory path
- `$SESSION_DIR/analysis/query-analysis.json` - Query analysis with perspectives
- `$SESSION_DIR/analysis/track-allocation.json` - Track assignments

## Phase Output

After completing this phase:
- Wave 1 agents launched in parallel
- `.wave1-launched` marker created (NOT .wave1-complete - that comes after collection)

---

## Tool Mapping Reference

**CRITICAL:** Load tool constraints from the shared mapping file before launching agents.

The tool mapping at `${PAI_DIR}/config/agent-tool-mapping.json` defines:
- `primaryTool` - The tool each agent MUST use
- `forbidden[]` - Tools the agent is FORBIDDEN from using
- `promptBlock` - The exact text to inject into agent prompts

**Agent Tool Summary:**

| Agent | Primary Tool | Forbidden |
|-------|--------------|-----------|
| claude-researcher | WebSearch | - |
| gemini-researcher | Gemini OAuth CLI | WebSearch, WebFetch, Brightdata, Apify |
| grok-researcher | Grok CLI | WebSearch, WebFetch, Brightdata, Apify |
| perplexity-researcher | Perplexity CLI | WebSearch, WebFetch |

---

## Step 1: Prepare Agent Launch

### Step 1a: Sanitize Perspective Content (Security Layer)

**MANDATORY: Before passing perspectives to agents, validate and sanitize all content.**

```bash
set +H  # Disable history expansion
SANITIZER="${PAI_DIR}/utilities/input-sanitizer/sanitizer.ts"

# Sanitize analysis JSON with blocking enabled
SANITIZE_RESULT=$(cat "$SESSION_DIR/analysis/query-analysis.json" | bun "$SANITIZER" --schema=analysis --for-prompt --block-injection 2>/dev/null)
SANITIZE_VALID=$(echo "$SANITIZE_RESULT" | jq -r '.valid // false')
SANITIZE_BLOCKED=$(echo "$SANITIZE_RESULT" | jq -r '.blocked // false')

if [ "$SANITIZE_BLOCKED" = "true" ]; then
  BLOCK_REASON=$(echo "$SANITIZE_RESULT" | jq -r '.blockReason')
  echo "SECURITY BLOCK: Prompt injection detected in perspectives"
  echo "   Reason: $BLOCK_REASON"
  echo "$SANITIZE_RESULT" > "$SESSION_DIR/analysis/security-block.json"
  exit 1
fi

if [ "$SANITIZE_VALID" != "true" ]; then
  echo "SECURITY WARNING: Sanitization validation failed"
  echo "$SANITIZE_RESULT" | jq '.errors'
  echo "$SANITIZE_RESULT" > "$SESSION_DIR/analysis/sanitization-warnings.json"
fi

# Use sanitized data for agent prompts
ANALYSIS_JSON=$(echo "$SANITIZE_RESULT" | jq -r '.data | tojson')
echo "$ANALYSIS_JSON" > "$SESSION_DIR/analysis/query-analysis-sanitized.json"
echo "Perspectives sanitized for agent consumption"
```

### Step 1b: Extract Perspectives and Allocations

```bash
set +H  # Disable history expansion
# Extract perspectives with their assigned agents
echo "$ANALYSIS_JSON" | jq -r '.perspectives[] | "\(.recommendedAgent): \(.text)"'

# Load track allocation
TRACK_DATA=$(cat "$SESSION_DIR/analysis/track-allocation.json")
```

---

## Step 2: Launch Wave 1 Agents in Parallel

**CRITICAL: Use a SINGLE message with multiple Task tool calls for parallel execution.**

**Model Selection: ALL researcher agents MUST use model: "sonnet"**

Each agent gets:
1. ONE specific perspective from the analysis
2. Track assignment (standard/independent/contrarian)
3. Track-specific instructions
4. Tool block from agent-tool-mapping.json

```typescript
// Launch ALL agents in PARALLEL - each agent gets ONE PERSPECTIVE
// Use a SINGLE message with multiple Task tool calls
// CRITICAL: Specify model: "sonnet" for all researcher agents

Task({
  subagent_type: "claude-researcher",  // FROM perspective.recommendedAgent
  model: "sonnet",                      // EXPLICIT - do not use Haiku
  description: "Research: [perspective text truncated]",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: claude-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR ASSIGNED PERSPECTIVE (from query analysis)**
Research this specific angle: "[perspective.text]"

**WHY THIS PERSPECTIVE**
This perspective was identified as relevant because: [perspective.rationale]

**YOUR RESEARCH TRACK: [TRACK_NAME]**

[TRACK_SPECIFIC_INSTRUCTIONS - inject based on track assignment]

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

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/wave-1/[agent]-[descriptive-topic].md

**STRUCTURED OUTPUT REQUIREMENTS**

At the TOP of your research file, include this structured header:

---
agent_type: [your-agent-type]
wave: 1
query_focus: [your specific perspective]
execution_time: [timestamp]
track: [standard|independent|contrarian]
---

## Structured Metadata

### 1. Confidence Score (0-100)
**Your Score:** [NUMBER]
**Reasoning:** [Why this score?]

### 2. Coverage Assessment
- **Thoroughly Covered:** What aspects did you cover well?
- **Limited Coverage:** What aspects had LIMITED information?
- **Alternative Domains:** What other domains might help?

### 3. Domain Signals Detected
**Signals Detected:** [LIST with frequency counts]

### 4. Recommended Follow-up
What would you explore next?

### 5. Source Tier Distribution
**Sources by Tier:**
- **Tier 1:** [count] - [key sources]
- **Tier 2:** [count] - [key sources]
- **Tier 3:** [count] - [key sources]
- **Tier 4:** [count] - [should be 0 on INDEPENDENT track]

---

## Your Research Findings

[Detailed research - minimum 500 characters]

**CRITICAL OUTPUT REQUIREMENTS:**
1. Write your findings to the session directory above
2. Use a descriptive filename (not timestamp/random)
3. Include the structured header at the TOP
4. Minimum 500 characters of actual findings
5. Include all source URLs

**DO NOT** return stubs like "Research complete" without actual content.
`
})

// Continue for each perspective in the analysis
// Total: perspectiveCount agents
```

**Track-Specific Instructions to Inject:**

**FOR STANDARD TRACK (50%):**
```
## Your Research Track: STANDARD

**Track Purpose:** Balanced research using all source tiers for comprehensive coverage.

**Source Strategy:**
- Use any source tier that provides quality information
- Prioritize depth and accuracy over source purity
- Balance breadth with authoritative sources
- Vendor content is acceptable when it provides unique insights
```

**FOR INDEPENDENT TRACK (25%):**
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
```

**FOR CONTRARIAN TRACK (25%):**
```
## Your Research Track: CONTRARIAN

**Track Purpose:** Find opposing viewpoints to ensure final synthesis includes dissenting perspectives.

**Source Strategy:**
- Seek sources that DISAGREE with mainstream narrative
- Find critics, skeptics, and alternative perspectives
- Look for "what could go wrong" analyses
- Identify voices marginalized in vendor-dominated discourse

**Search Strategies:**
- Add "criticism", "problems", "fails", "overhyped" to searches
- Search for: "[topic] skeptics", "[topic] risks overstated"
- Look for academic rebuttals and critique papers
- Find industry veterans who've seen similar hype cycles
```

---

## WAVE 1 LAUNCH RULES

1. **Launch ALL agents in ONE message** (parallel execution)
2. **Use perspectiveCount from query analysis** (dynamic, not hardcoded)
3. **Each agent gets ONE specific perspective** (focused research)
4. **ALL agents use model: "sonnet"** (never Haiku for researchers)
5. **Each agent does 1 query + 1 follow-up max** (quick cycles)
6. **All agents write to wave-1 directory** (organized by wave)
7. **DO NOT wait for agents here** - that's the next phase

---

## Phase Gate: Exit Marker

After launching all agents, create the launch marker:

```bash
set +H  # Disable history expansion
# Create launch tracking file (NOT .wave1-complete - that comes after collection)
cat > "$SESSION_DIR/analysis/.wave1-launched" << EOF
{
  "phase": "wave1-launched",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agentCount": $WAVE1_COUNT,
  "perspectives": $PERSPECTIVE_COUNT
}
EOF

echo "Wave 1 agents launched: $WAVE1_COUNT agents for $PERSPECTIVE_COUNT perspectives"
```

---

## WAVE 1 LAUNCH COMPLETE

**Return to orchestrator:**
```
WAVE 1 LAUNCH COMPLETE
Agents Launched: [count]
Perspectives Covered: [count]
Agent Types: [breakdown by type]
```

The orchestrator will then call `/_research-collect-wait` to wait for all agents.
