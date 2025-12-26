---
description: "Research Collection Wait: Wait for ALL Wave 1 agents with NO bailout (called by /_research-collect)"
globs: ""
alwaysApply: false
---

# Research Collection - Wait for Wave 1 Agents

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Gate: Entry Verification

```bash
set +H  # Disable history expansion
# CONSTITUTIONAL: Verify gate before proceeding
PAI_DIR="${HOME}/.claude"
GATE_CLI="${PAI_DIR}/utilities/research-orchestrator/cli.ts"

# Verify wave1-launched marker exists
if [ ! -f "$SESSION_DIR/analysis/.wave1-launched" ]; then
  echo "GATE FAILED: Wave 1 not launched"
  echo "Required marker: .wave1-launched"
  exit 1
fi

# Extract expected agent count
EXPECTED_AGENTS=$(jq -r '.agentCount' "$SESSION_DIR/analysis/.wave1-launched")
echo "Gate passed: Waiting for $EXPECTED_AGENTS Wave 1 agents"
```

## Phase Purpose

Wait for ALL Wave 1 agents to complete. This phase enforces NO BAILOUT - we wait until every launched agent has returned results.

## CONSTITUTIONAL REQUIREMENT: NO BAILOUT

```
NEVER skip waiting for agents based on:
- "Most agents complete" reasoning
- "Sufficient coverage" logic
- "Diminishing returns" optimization
- Time pressure or latency concerns
- Any autonomous judgment

ALL agents MUST complete or explicitly fail before proceeding.
```

---

## Step 1: Wait for All Agents

**Use AgentOutputTool to wait for each launched agent:**

```typescript
// For each agent launched in Wave 1, wait for completion
// Use blocking mode to ensure we don't proceed until ready

AgentOutputTool({
  agentId: "[agent-id-from-launch]",
  block: true,
  wait_up_to: 300  // 5 minutes max per agent
})

// Repeat for ALL agents - no exceptions
```

**Wait Strategy:**

1. Collect all agent IDs from the wave1-launch phase
2. Wait for each agent using `AgentOutputTool` with `block: true`
3. Track completion status for each agent
4. Only proceed when ALL agents have returned or timed out

---

## Step 2: Validate Agent Results

For EACH completed agent, validate output quality:

### 2a: Length Check
- Minimum 500 characters of actual content (not just headers/boilerplate)

### 2b: Content Check
- Must contain actual findings (look for data, facts, sources)
- Check for error indicators (API failures, empty results)

### 2c: Structure Check
- Verify structured metadata section exists (confidence, coverage, signals)

### 2d: CLI Configuration Failure Detection (CRITICAL - HALTS WORKFLOW)

**Check for CLI misconfiguration that requires human intervention:**

```bash
set +H  # Disable history expansion
# These patterns indicate the CLI is not installed/configured - CANNOT be fixed by retry
CLI_FAILURE_PATTERNS="PRIMARY TOOL UNAVAILABLE|CLI NOT FOUND|CLI NOT CONFIGURED|TROUT SLAP|PAI_DIR MISCONFIGURED"

CRITICAL_FAILURES=0
for output_file in "$SESSION_DIR/wave-1"/*.md; do
  if grep -qiE "$CLI_FAILURE_PATTERNS" "$output_file" 2>/dev/null; then
    AGENT_FILE=$(basename "$output_file" .md)
    echo "🛑 CRITICAL CLI FAILURE: $AGENT_FILE"
    echo "   → This agent's CLI is not properly installed/configured"
    echo "   → This CANNOT be fixed by retry - requires human intervention"
    echo "$AGENT_FILE:CLI_FAILURE" >> "$SESSION_DIR/analysis/critical-failures.txt"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
  fi
done

# HALT WORKFLOW if any CLI failures detected
if [ "$CRITICAL_FAILURES" -gt 0 ]; then
  echo ""
  echo "🛑🛑🛑 WORKFLOW HALTED: CLI CONFIGURATION FAILURES 🛑🛑🛑"
  echo ""
  echo "$CRITICAL_FAILURES agent(s) failed due to missing or misconfigured CLI tools."
  echo "This is NOT a transient error - the actual issue must be fixed before continuing."
  echo ""
  echo "Failed agents:"
  cat "$SESSION_DIR/analysis/critical-failures.txt"
  echo ""
  echo "ACTION REQUIRED:"
  echo "1. Read the failed agent output files in $SESSION_DIR/wave-1/"
  echo "2. Follow the 'Actionable Fixes' section in each failure report"
  echo "3. Verify CLI tools are properly installed and PATH is correct"
  echo "4. Re-run the research workflow from the beginning"
  echo ""
  echo "DO NOT PROCEED WITH PARTIAL RESULTS."
  exit 1
fi
```

### 2e: Tool Conflict Detection (Retryable)

**Check for tool conflict patterns in agent output:**

```bash
set +H  # Disable history expansion
CONFLICT_PATTERNS="CONSTITUTIONAL VIOLATION|FORBIDDEN|constitutional requirements|tool conflict|cannot use WebSearch"

for output_file in "$SESSION_DIR/wave-1"/*.md; do
  if grep -qiE "$CONFLICT_PATTERNS" "$output_file" 2>/dev/null; then
    AGENT_FILE=$(basename "$output_file" .md)
    echo "TOOL CONFLICT: $AGENT_FILE"
    echo "$AGENT_FILE" >> "$SESSION_DIR/analysis/retry-queue.txt"
  fi
done
```

---

## Step 3: Retry Failed Agents (If Needed)

**If validation fails for an agent:**

1. Log which agent failed and why (empty, too short, error, tool conflict)
2. Retry the agent with the SAME query (launch new Task with same subagent_type and prompt)
3. Maximum 2 retry attempts per agent
4. Wait for retry to complete before proceeding

**For tool conflicts specifically:**

```typescript
// Get correct tool block from agent-tool-mapping.json
Task({
  subagent_type: "[correct-agent-type]",
  model: "sonnet",
  description: "RETRY: [original perspective]",
  prompt: `
**RETRY NOTICE:** Your previous attempt failed due to a tool conflict.
This retry includes the CORRECT tool instructions for your agent type.

**YOUR RESEARCH TOOL (MANDATORY)**

${correctToolBlock}  // The ACTUAL correct block for this agent

**CRITICAL:** You MUST use ONLY the tool specified above.
Your previous failure was because you were given incorrect tool instructions.

[Original research perspective and instructions...]
`
})
```

**Retry limits:**
- Maximum 1 retry per agent for tool conflicts
- Maximum 2 retries per agent for other failures
- If retry also fails → log as "partial coverage" and continue

---

## Step 4: Count and Verify Results

```bash
set +H  # Disable history expansion
# Count successful Wave 1 outputs
WAVE1_COUNT=$(ls -1 "$SESSION_DIR/wave-1"/*.md 2>/dev/null | wc -l | tr -d ' ')
EXPECTED_COUNT=$(jq -r '.agentCount' "$SESSION_DIR/analysis/.wave1-launched")

echo "Wave 1 Results:"
echo "   Expected: $EXPECTED_COUNT agents"
echo "   Received: $WAVE1_COUNT outputs"

if [ "$WAVE1_COUNT" -lt "$EXPECTED_COUNT" ]; then
  MISSING=$((EXPECTED_COUNT - WAVE1_COUNT))
  echo "   WARNING: $MISSING agent(s) did not produce output"
  echo "   Logging gap for pivot analysis consideration"
fi
```

---

## Phase Gate: Exit Marker

After ALL agents complete (or explicitly fail after retries):

```bash
set +H  # Disable history expansion
# Mark wave1 as complete
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" mark "$SESSION_DIR" wave1-complete '{
  "agentCount": '$WAVE1_COUNT',
  "expectedCount": '$EXPECTED_COUNT',
  "retriedAgents": '$(cat "$SESSION_DIR/analysis/retry-queue.txt" 2>/dev/null | wc -l | tr -d ' ')'
}'

echo "Wave 1 collection complete - .wave1-complete marker created"
```

---

## WAVE 1 WAIT RULES

1. **WAIT FOR ALL AGENTS** - No bailout, no early exit
2. **Validate each agent output** - Length, content, structure
3. **HALT ON CLI FAILURES** - If any agent reports CLI not found/configured, STOP IMMEDIATELY
4. **Retry failed agents** - Tool conflicts, empty results (but NOT CLI failures)
5. **Log partial coverage** - For agents that still fail after retries
6. **Only proceed after ALL complete** - Gate enforces this

## CRITICAL FAILURE TYPES (HALT WORKFLOW)

These failures indicate infrastructure issues that CANNOT be fixed by retry:
- `PRIMARY TOOL UNAVAILABLE` - CLI tool is not installed
- `CLI NOT FOUND` - CLI file does not exist at expected path
- `CLI NOT CONFIGURED` - CLI configuration is missing/invalid
- `TROUT SLAP` - PAI_DIR path is misconfigured (missing .claude segment)
- `PAI_DIR MISCONFIGURED` - Environment variable has wrong value

**When these are detected, the workflow MUST halt and report the issue to the user.
Continuing with partial results is forbidden - the CLI must be fixed first.**

---

## WAVE 1 WAIT COMPLETE

**Report back to orchestrator:**
```
WAVE 1 WAIT COMPLETE
Expected Agents: [count]
Completed Agents: [count]
Retried Agents: [count]
Partial Coverage: [count if any failed after retries]
Ready for: Pivot Analysis
```

The orchestrator will then call `/_research-collect-pivot` for quality analysis.
