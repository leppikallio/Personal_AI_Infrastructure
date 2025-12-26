---
description: "Research Collection Wave 2: Launch specialist agents based on pivot decision (called by /_research-collect)"
globs: ""
alwaysApply: false
---

# Research Collection - Wave 2 Specialists

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Gate: Entry Verification

```bash
set +H  # Disable history expansion
# CONSTITUTIONAL: Verify gate before proceeding
PAI_DIR="${HOME}/.claude"
GATE_CLI="${PAI_DIR}/utilities/research-orchestrator/cli.ts"

# Verify pivot-complete marker exists
GATE=$(bun "$GATE_CLI" verify "$SESSION_DIR" wave2-complete 2>&1)
if [ $? -ne 0 ]; then
  echo "GATE FAILED: $GATE"
  echo "Required: .pivot-complete marker"
  exit 1
fi

# Verify pivot decision says to launch Wave 2
PIVOT_DECISION=$(cat "$SESSION_DIR/analysis/wave-1-pivot-decision.json")
SHOULD_LAUNCH=$(echo "$PIVOT_DECISION" | jq -r '.shouldLaunchWave2')

if [ "$SHOULD_LAUNCH" != "true" ]; then
  echo "Pivot decision: SKIP Wave 2"
  # Mark as skipped and exit
  bun "$GATE_CLI" skip-wave2 "$SESSION_DIR" "Pivot decision: Wave 1 sufficient"
  exit 0
fi

echo "Gate passed: Launching Wave 2 specialists"
```

## Phase Purpose

Launch Wave 2 specialist agents to address gaps, signals, and quality issues identified in the pivot analysis.

## Phase Input

Expects from previous phase:
- `$SESSION_DIR/analysis/wave-1-pivot-decision.json` - Pivot decision with specialists
- `$SESSION_DIR/analysis/.pivot-complete` - Pivot marker

---

## Step 1: Create Wave 2 Directory

```bash
set +H  # Disable history expansion
mkdir -p "$SESSION_DIR/wave-2"
echo "Wave 2 directory created: $SESSION_DIR/wave-2"
```

---

## Step 2: Extract Specialist Specifications

```bash
set +H  # Disable history expansion
# Extract specialists from pivot decision
SPECIALISTS=$(echo "$PIVOT_DECISION" | jq -c '.specialists[]')
SPECIALIST_COUNT=$(echo "$PIVOT_DECISION" | jq '.specialists | length')
ALLOCATION=$(echo "$PIVOT_DECISION" | jq -r '.specialistAllocation')

echo "Wave 2 Specialists: $SPECIALIST_COUNT"
echo "Allocation: $ALLOCATION"
```

---

## Step 3: Merge Quality Rebalancing Agents (If Needed)

If quality rebalancing was triggered, merge those agents:

```bash
set +H  # Disable history expansion
if [ -f "$SESSION_DIR/analysis/quality-rebalancing-specs.json" ]; then
  echo "Merging quality rebalancing agents with pivot specialists"
  # Read both specifications and combine
  # Deduplicate overlapping independent/contrarian agents
  # Max total: 6-8 Wave 2 agents
fi
```

---

## Step 4: Launch Wave 2 Specialists in Parallel

**CRITICAL: Use a SINGLE message with multiple Task tool calls for parallel execution.**
**Model Selection: ALL researcher agents MUST use model: "sonnet"**

```typescript
// Launch Wave 2 specialists in PARALLEL
// Use a SINGLE message with multiple Task tool calls
// CRITICAL: Specify model: "sonnet" for all researcher agents

// For each specialist in pivot_decision.specialists:
Task({
  subagent_type: "[specialist.agentType]",  // From pivot decision
  model: "sonnet",                           // EXPLICIT - never Haiku
  description: "Wave 2: [specialist.focus truncated]",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: [agentType]
**WAVE CONTEXT:** You are a Wave 2 specialist agent launched to address specific gaps identified in Wave 1.

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR SPECIALIST TASK**
You were launched because Wave 1 agents detected:
- [Signal/Gap that triggered this specialist]
- Priority: [HIGH/MEDIUM/LOW]
- Source: [domain_signal/coverage_gap/quality_failure/missed_coverage]

**Focus on:** [specialist.focus]

**Rationale:** [specialist.rationale]

Do ONE focused search query and ONE follow-up if needed.

**YOUR RESEARCH TOOL (MANDATORY)**

${AGENT_TOOL_BLOCK}

**CRITICAL TOOL RULES:**
1. Use ONLY the tool specified above
2. If your primary tool fails, follow the fallback instructions (or STOP if no fallback)
3. Do NOT improvise with other tools
4. If you encounter a forbidden tool, STOP and report the conflict

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/wave-2/[agent]-[descriptive-topic].md

**YOUR RESEARCH TRACK: [specialist.track]**

[TRACK_SPECIFIC_INSTRUCTIONS - inject based on track assignment]

**Source Tier Reference:**
- **Tier 1 (Independent):** Academic papers, standards bodies, researchers
- **Tier 2 (Quasi-Independent):** Industry associations, news outlets, non-profits
- **Tier 3 (Vendor):** Product vendors, cloud providers, consulting firms
- **Tier 4 (Suspect):** SEO farms, affiliate sites - USE WITH CAUTION

**STRUCTURED OUTPUT REQUIREMENTS**

At the TOP of your research file, include this structured header:

---
agent_type: [your-agent-type]
wave: 2
specialist_focus: [gap/signal you're addressing]
execution_time: [timestamp]
track: [standard|independent|contrarian]
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

### 4. Source Tier Distribution
**Sources by Tier:**
- **Tier 1:** [count] - [key sources]
- **Tier 2:** [count] - [key sources]
- **Tier 3:** [count] - [JUSTIFY if on INDEPENDENT track]
- **Tier 4:** [count] - [should be 0 on INDEPENDENT track]

---

## Your Specialist Research Findings

[Detailed research focused on filling the identified gap - minimum 500 characters]

**CRITICAL OUTPUT REQUIREMENTS:**
1. Write to wave-2 directory (not wave-1)
2. Focus on filling the specific gap you were assigned
3. Include structured header
4. Minimum 500 characters
5. Include all source URLs

**DO NOT** duplicate Wave 1 findings - focus on NEW information.
`
})

// Continue for each specialist in pivot_decision.specialists
```

---

## Step 5: Wait for Wave 2 Completion

**Wait for all Wave 2 specialists to complete:**

```typescript
// For each specialist launched, wait for completion
AgentOutputTool({
  agentId: "[specialist-agent-id]",
  block: true,
  wait_up_to: 300  // 5 minutes max
})
```

---

## Step 6: Validate Wave 2 Results

Same validation as Wave 1:
- Length check (500+ characters)
- Content check (actual findings)
- Structure check (metadata present)
- Error detection

**Note:** If Wave 2 agents fail validation, log the failure but DO NOT retry. Wave 2 is already a refinement step. Proceed with partial Wave 2 coverage.

---

## Step 7: Post-Wave 2 Quality Re-evaluation (If Quality Rebalancing)

If quality rebalancing was triggered, re-evaluate:

```bash
set +H  # Disable history expansion
if [ -f "$SESSION_DIR/analysis/quality-rebalancing-specs.json" ]; then
  echo "Re-evaluating source quality after Wave 2 rebalancing..."

  # Extract URLs from BOTH Wave 1 and Wave 2
  grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md "$SESSION_DIR"/wave-2/*.md 2>/dev/null | \
    sort -u > "$SESSION_DIR/analysis/wave1+2-urls.txt"

  cd ${PAI_DIR}/utilities/query-analyzer
  bun -e "
  const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
  const { evaluateQualityGate } = require('./source-tiers/quality-gate');
  const fs = require('fs');

  const sessionDir = '$SESSION_DIR';
  const urls = fs.readFileSync(sessionDir + '/analysis/wave1+2-urls.txt', 'utf-8')
    .split('\n')
    .filter(u => u.trim());

  const report = analyzeSourceBalance(urls);
  const gate = evaluateQualityGate(report);

  console.log('Post-rebalancing Quality Gate: ' + (gate.passed ? 'PASSED' : 'FAILED'));

  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.json', JSON.stringify({ report, gate }, null, 2));
  fs.writeFileSync(sessionDir + '/analysis/source-quality-final.md', generateMarkdownReport(report));
  "
fi
```

---

## Phase Gate: Exit Marker

After Wave 2 completes:

```bash
set +H  # Disable history expansion
# Count Wave 2 outputs
WAVE2_COUNT=$(ls -1 "$SESSION_DIR/wave-2"/*.md 2>/dev/null | wc -l | tr -d ' ')

# Mark wave2 as complete
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" mark "$SESSION_DIR" wave2-complete '{
  "agentCount": '$WAVE2_COUNT',
  "specialists": '$(echo "$PIVOT_DECISION" | jq '.specialists | length')'
}'

echo "Wave 2 complete - .wave2-complete marker created"
```

---

## WAVE 2 LAUNCH RULES

1. **Launch ALL specialists in ONE message** (parallel execution)
2. **Use specialist specs from pivot decision** (dynamic)
3. **ALL agents use model: "sonnet"** (never Haiku)
4. **Each specialist focuses on ONE gap/signal** (focused research)
5. **Write to wave-2 directory** (organized by wave)
6. **Validate all outputs** before proceeding
7. **DO NOT retry Wave 2 failures** - log and continue

---

## WAVE 2 COMPLETE

**Report back to orchestrator:**
```
WAVE 2 COMPLETE
Specialists Launched: [count]
Specialists Completed: [count]
Wave 2 Files: [count]
Quality Re-evaluation: [passed/failed/skipped]
Ready for: Citation Validation
```

The orchestrator will then call `/_research-collect-validate` for citation validation.
