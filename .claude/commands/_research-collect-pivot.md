---
description: "Research Collection Pivot: Quality analysis and Wave 2 pivot decision (called by /_research-collect)"
globs: ""
alwaysApply: false
---

# Research Collection - Pivot Analysis

**This command is called by /_research-collect orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Gate: Entry Verification

```bash
set +H  # Disable history expansion
# CONSTITUTIONAL: Verify gate before proceeding
PAI_DIR="${HOME}/.claude"
GATE_CLI="${PAI_DIR}/utilities/research-orchestrator/cli.ts"

# Verify wave1-complete marker exists
GATE=$(bun "$GATE_CLI" verify "$SESSION_DIR" wave1-validated 2>&1)
if [ $? -ne 0 ]; then
  echo "GATE FAILED: $GATE"
  echo "Required: .wave1-complete marker"
  exit 1
fi

echo "Gate passed: Ready for pivot analysis"
```

## Phase Purpose

Analyze Wave 1 results to determine if Wave 2 specialists are needed. This phase runs:
1. Agent quality scoring
2. Domain signal detection
3. Coverage gap analysis
4. Source quality evaluation (M10)
5. Missed perspective detection (NEW)
6. Final pivot decision

---

## Step 1: Run Quality Analyzer (Automated)

**ALL COMPONENTS NOW AUTOMATED - Use the quality-analyzer TypeScript CLI:**

```bash
set +H  # Disable history expansion
cd ${PAI_DIR}/utilities/quality-analyzer
bun ./cli.ts analyze "${SESSION_DIR}" --wave 1 --output both

echo "Quality analysis complete - generated JSON and Markdown reports"
```

This single command executes all 5 analysis components:

### Component 1: Agent Quality Scoring

**IMPORTANT: Quality scores are INFORMATIONAL ONLY - they do NOT affect pivot decisions.**

Scores each agent output (0-100) based on three metrics:

| Component | Max Points | Thresholds |
|-----------|-----------|------------|
| Length Score | 40 pts | ≥2000 bytes: 40, ≥1000: 25, ≥500: 15, <500: 5 |
| Source Score | 30 pts | ≥5 sources: 30, ≥3: 20, ≥1: 10, 0: 0 |
| Confidence Score | 30 pts | (agent_confidence / 100) × 30 |

**Quality Bands:**
- EXCELLENT: 80-100
- GOOD: 60-79
- MODERATE: 40-59
- POOR: 0-39

**Purpose of Quality Scores:**
- Track research output health over time
- Identify underperforming agents for debugging
- Quality triggers Wave 2 specialists for POOR (<40) agents only
- **NOT for skipping Wave 2 when scores are high**

Output: `${SESSION_DIR}/analysis/wave-1-quality-analysis.json` & `.md`

### Component 2: Domain Signal Detection
- Scans all Wave 1 outputs for cross-domain keywords
- Keyword dictionaries: social_media, academic, technical, multimodal, security, news
- Weights signals by agent quality: `signal_strength = matches * (quality_score / 100)`
- Recommends specialists for strong signals

### Component 3: Coverage Gap Analysis
- Extracts self-reported gaps from agent metadata
- Identifies gaps reported by 2+ agents (HIGH priority)
- Maps gaps to specialist agent types

### Component 4: Platform Coverage Validation (AD-008)
- Validates expected platforms were searched
- Identifies uncovered perspectives
- Triggers Wave 2 for missing platform coverage

### Component 5: Pivot Decision Engine
- Aggregates all components into final Wave 2 decision
- Generates specialist allocation map
- Output: `${SESSION_DIR}/analysis/wave-1-pivot-decision.json`

---

## Step 2: Missed Perspective Detection (NEW)

**Check if Wave 1 executed fewer agents than the analyzer recommended:**

```bash
set +H  # Disable history expansion
# Load the original query analysis
RECOMMENDED_AGENTS=$(cat "$SESSION_DIR/analysis/query-analysis.json" | jq '[.agentAllocation | to_entries[] | .value] | add')
EXECUTED_AGENTS=$(ls -1 "$SESSION_DIR/wave-1"/*.md 2>/dev/null | wc -l | tr -d ' ')

MISSED_COUNT=$((RECOMMENDED_AGENTS - EXECUTED_AGENTS))

if [ "$MISSED_COUNT" -gt 0 ]; then
  echo "MISSED PERSPECTIVE TRIGGER: $MISSED_COUNT agent slots not executed"

  # Add to pivot decision as missedCoverage component
  jq --arg missed "$MISSED_COUNT" '.components.missedCoverage = {
    "triggered": true,
    "reason": "\($missed) recommended agent slots not executed in Wave 1",
    "missedCount": ($missed | tonumber),
    "recommendations": []
  }' "$SESSION_DIR/analysis/wave-1-pivot-decision.json" > /tmp/pivot-updated.json
  mv /tmp/pivot-updated.json "$SESSION_DIR/analysis/wave-1-pivot-decision.json"
fi
```

---

## Step 3: Source Quality Evaluation (M10)

**Analyze source distribution for vendor-heavy research:**

```bash
set +H  # Disable history expansion
# Extract URLs from all Wave 1 agent outputs
grep -ohE 'https?://[^[:space:])\]>]+' "$SESSION_DIR"/wave-1/*.md 2>/dev/null | sort -u > "$SESSION_DIR/analysis/wave1-urls.txt"
URL_COUNT=$(wc -l < "$SESSION_DIR/analysis/wave1-urls.txt" | tr -d ' ')
echo "Extracted $URL_COUNT unique URLs from Wave 1"

# Run source quality analysis
cd ${PAI_DIR}/utilities/query-analyzer
bun -e "
const { analyzeSourceBalance, generateMarkdownReport } = require('./source-tiers/balance-analyzer');
const fs = require('fs');

const sessionDir = '$SESSION_DIR';
const urls = fs.readFileSync(sessionDir + '/analysis/wave1-urls.txt', 'utf-8')
  .split('\n')
  .filter(u => u.trim());

const report = analyzeSourceBalance(urls);
fs.writeFileSync(sessionDir + '/analysis/source-quality-report.json', JSON.stringify(report, null, 2));
fs.writeFileSync(sessionDir + '/analysis/source-quality-report.md', generateMarkdownReport(report));
"

echo "Source quality report generated"
```

---

## Step 4: Read Pivot Decision

```bash
set +H  # Disable history expansion
PIVOT_DECISION=$(cat "${SESSION_DIR}/analysis/wave-1-pivot-decision.json")
SHOULD_LAUNCH_WAVE2=$(echo "$PIVOT_DECISION" | jq -r '.shouldLaunchWave2')
SPECIALIST_COUNT=$(echo "$PIVOT_DECISION" | jq '[.specialistAllocation | to_entries[] | .value] | add')
CONFIDENCE=$(echo "$PIVOT_DECISION" | jq -r '.confidence')

echo ""
echo "PIVOT DECISION:"
echo "   Launch Wave 2: $SHOULD_LAUNCH_WAVE2"
echo "   Confidence: $CONFIDENCE%"
echo "   Specialists Needed: $SPECIALIST_COUNT"
echo ""

if [ "$SHOULD_LAUNCH_WAVE2" = "true" ]; then
  echo "WAVE 2 TRIGGERED - Reasons:"
  echo "$PIVOT_DECISION" | jq -r '.rationale[]' | while read reason; do
    echo "   - $reason"
  done
  echo ""
  echo "Specialist Allocation:"
  echo "$PIVOT_DECISION" | jq -r '.specialistAllocation | to_entries[] | "   \(.key): \(.value)"'
else
  echo "WAVE 1 SUFFICIENT - Proceeding to validation"
fi
```

---

## CONSTITUTIONAL: Wave 2 Execution Rule (MANDATORY READ)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WAVE 2 EXECUTION LAW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  IF pivot_decision.shouldLaunchWave2 == true                            │
│  THEN                                                                    │
│      YOU MUST LAUNCH WAVE 2 SPECIALISTS                                  │
│                                                                          │
│  NO EXCEPTIONS. NO AUTONOMOUS OVERRIDES. NO "GOOD JUDGMENT".            │
│                                                                          │
│  FORBIDDEN JUSTIFICATIONS (will be treated as violations):               │
│      ❌ "Wave 1 quality is excellent (93/100)"                          │
│      ❌ "Already have comprehensive research"                            │
│      ❌ "Diminishing returns from additional research"                   │
│      ❌ "User's goal is practical workflow, so..."                       │
│      ❌ "The missed coverage is a technicality"                          │
│      ❌ "Additional research would add marginal value"                   │
│      ❌ ANY reasoning that leads to skipping Wave 2                      │
│                                                                          │
│  THE PIVOT DECISION ENGINE IS THE AUTHORITY, NOT THE AGENT.             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why this rule exists:**
- Quality scores are INFORMATIONAL, not decision-making inputs
- The pivot decision engine considers 6 components holistically
- Agent "optimization" attempts have caused research quality issues
- If Wave 2 were truly unnecessary, the engine wouldn't trigger it

**If you believe Wave 2 is unnecessary:**
1. **STOP** - Do not proceed with any synthesis
2. **ASK** the user explicitly:
   > "Pivot decision recommends Wave 2 with X specialists due to: [reasons].
   > Wave 1 quality is Y/100. Should I proceed with Wave 2, or skip with your authorization?"
3. **WAIT** for explicit user response
4. **DOCUMENT** user's decision in `$SESSION_DIR/analysis/wave2-skip-authorization.md`:
   ```
   Wave 2 Skip Authorization
   Date: [timestamp]
   User Decision: Skip Wave 2
   Reason Given: [user's stated reason]
   Pivot Recommendation: shouldLaunchWave2=true
   Components Triggered: [list]
   ```
5. **ONLY THEN** may you skip Wave 2

**Default behavior:** If uncertain, LAUNCH WAVE 2.

---

## Phase Gate: Exit Marker

After pivot analysis completes:

```bash
set +H  # Disable history expansion
# Mark wave1 as validated (quality analysis complete)
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" mark "$SESSION_DIR" wave1-validated '{
  "averageQuality": '$(jq -r '.agentQuality.averageScore' "$SESSION_DIR/analysis/wave-1-quality-analysis.json")',
  "shouldLaunchWave2": '$SHOULD_LAUNCH_WAVE2',
  "specialistCount": '$SPECIALIST_COUNT'
}'

# Mark pivot decision complete
bun "${PAI_DIR}/utilities/research-orchestrator/cli.ts" mark "$SESSION_DIR" pivot-complete '{
  "decision": "'$SHOULD_LAUNCH_WAVE2'",
  "specialists": '$SPECIALIST_COUNT',
  "confidence": '$CONFIDENCE'
}'

echo "Pivot analysis complete - markers created"
```

---

## PIVOT ANALYSIS COMPLETE

**Return to orchestrator:**
```
PIVOT ANALYSIS COMPLETE
Wave 1 Quality: [average score]/100
Domain Signals: [count of strong signals]
Coverage Gaps: [count of high priority gaps]
Missed Perspectives: [count if any]
Source Quality: [passed/failed]
DECISION: [LAUNCH WAVE 2 / SKIP WAVE 2]
Specialists Needed: [count by type]
```

The orchestrator will:
- If LAUNCH WAVE 2: Call `/_research-collect-wave2`
- If SKIP WAVE 2: Call `/_research-collect-validate` directly

---

## Generated Analysis Files

After this phase completes:
- `${SESSION_DIR}/analysis/wave-1-quality-analysis.json` - Full quality analysis
- `${SESSION_DIR}/analysis/wave-1-quality-analysis.md` - Human-readable report
- `${SESSION_DIR}/analysis/wave-1-pivot-decision.json` - Pivot decision with specialists
- `${SESSION_DIR}/analysis/source-quality-report.json` - Source tier analysis
- `${SESSION_DIR}/analysis/source-quality-report.md` - Human-readable source report
- `${SESSION_DIR}/analysis/.wave1-validated` - Phase marker
- `${SESSION_DIR}/analysis/.pivot-complete` - Phase marker
