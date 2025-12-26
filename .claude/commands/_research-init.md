---
description: "Research Phase 1: Initialize session, analyze query, allocate tracks (called by /conduct-research-adaptive)"
globs: ""
alwaysApply: false
---

# Research Initialization Phase

**This command is called by /conduct-research-adaptive orchestrator.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Initialize a research session by:
1. Creating session directory structure
2. Running intelligent query analysis (perspective-first routing)
3. Allocating perspectives to research tracks (50/25/25 distribution)

## Phase Output

After completing this phase, the following will exist:
- `$SESSION_DIR/wave-1/` - Directory for Wave 1 agent outputs
- `$SESSION_DIR/analysis/query-analysis.json` - Full analysis JSON
- `$SESSION_DIR/analysis/query-analysis.md` - Human-readable analysis
- `$SESSION_DIR/analysis/platform-requirements.json` - Platform requirements per perspective
- `$SESSION_DIR/analysis/track-allocation.json` - Track assignments
- `$SESSION_DIR/analysis/track-allocation.md` - Human-readable track report

**Return to orchestrator:** SESSION_DIR path and WAVE1_COUNT for next phase.

---

## STEP-BY-STEP WORKFLOW

### Step 0: Initialize Full Phase Tracking (MANDATORY FIRST ACTION)

**BEFORE ANYTHING ELSE: Set up TodoWrite with ALL phases AND sub-phases visible to user.**

```typescript
TodoWrite({ todos: [
  { content: "Phase 1: Initialize research session", status: "in_progress", activeForm: "Initializing research session" },
  { content: "  1.1: Create session directory", status: "pending", activeForm: "Creating session directory" },
  { content: "  1.2: Analyze query (perspectives)", status: "pending", activeForm: "Analyzing query" },
  { content: "  1.3: Allocate research tracks", status: "pending", activeForm: "Allocating tracks" },
  { content: "Phase 2: Collect research", status: "pending", activeForm: "Collecting research" },
  { content: "  2.1: Launch Wave 1 agents", status: "pending", activeForm: "Launching Wave 1 agents" },
  { content: "  2.2: Wait for all agents", status: "pending", activeForm: "Waiting for agents" },
  { content: "  2.3: Pivot analysis", status: "pending", activeForm: "Running pivot analysis" },
  { content: "  2.4: Wave 2 specialists", status: "pending", activeForm: "Launching Wave 2 specialists" },
  { content: "  2.5: Validate citations", status: "pending", activeForm: "Validating citations" },
  { content: "Phase 3: Synthesize findings", status: "pending", activeForm: "Synthesizing findings" },
  { content: "  3.0: Pool all citations", status: "pending", activeForm: "Pooling citations" },
  { content: "  3.1: Launch N summarizers", status: "pending", activeForm: "Launching summarizers" },
  { content: "  3.2: Cross-perspective synthesis", status: "pending", activeForm: "Running cross-synthesis" },
  { content: "  3.3: Generate task graph", status: "pending", activeForm: "Generating task graph" },
  { content: "  3.4: Platform coverage check", status: "pending", activeForm: "Checking platform coverage" },
  { content: "Phase 4: Validate quality", status: "pending", activeForm: "Validating quality" },
  { content: "  4.1: Citation utilization check", status: "pending", activeForm: "Checking citation utilization" },
  { content: "  4.2: Structure validation", status: "pending", activeForm: "Validating structure" },
  { content: "  4.3: Density ratio check", status: "pending", activeForm: "Checking density ratio" },
  { content: "Phase 5: Report results", status: "pending", activeForm: "Reporting results" },
]})
```

**WHY ALL SUB-PHASES MUST BE VISIBLE FROM START:**
- User can see the FULL workflow before it begins
- Provides assurance that critical steps (citation validation!) won't be skipped
- Makes progress visible at granular level
- Creates accountability - if a sub-phase is missing from tracking, it's a bug

**UPDATE RULES:**
- Mark each sub-phase `in_progress` when starting it
- Mark each sub-phase `completed` immediately when done
- NEVER remove sub-phases from the list
- If a sub-phase is skipped (e.g., Wave 2), mark it `completed` with note in status

---

### Step 0.1: Create Session Directory (For File Output)

**Get current date and create a session-specific directory for research file output.**

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
# ============================================================================
# TEMP FILE APPROACH (avoids shell history expansion issues with '!')
# ============================================================================
# JSON containing '!' characters causes bash history expansion errors when
# stored in shell variables and echoed. Solution: write directly to temp
# files and use jq/cat to read them, never passing JSON through echo.
# ============================================================================

SANITIZER="${PAI_DIR}/utilities/input-sanitizer/sanitizer.ts"
RAW_JSON_FILE=$(mktemp)
SANITIZED_JSON_FILE=$(mktemp)

# Cleanup function
cleanup_temp_files() {
  rm -f "$RAW_JSON_FILE" "$SANITIZED_JSON_FILE" 2>/dev/null
}
trap cleanup_temp_files EXIT

# ============================================================================
# Step 1: Run analyzer, write directly to temp file (never to shell variable)
# ============================================================================
bun ${PAI_DIR}/utilities/query-analyzer/query-analyzer.ts --perspectives "$USER_QUERY" 2>/dev/null > "$RAW_JSON_FILE"

# Check if file has content
if [ ! -s "$RAW_JSON_FILE" ]; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "❌ FATAL ERROR: Analyzer returned empty output"
  echo "══════════════════════════════════════════════════════════════════════"
  exit 1
fi

# Validate JSON structure using file directly (no shell variable)
if ! jq empty "$RAW_JSON_FILE" 2>/dev/null; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "❌ FATAL ERROR: Analyzer returned invalid JSON"
  echo "══════════════════════════════════════════════════════════════════════"
  echo "First 500 characters:"
  head -c 500 "$RAW_JSON_FILE"
  echo ""
  exit 1
fi

# ============================================================================
# Step 2: Run sanitizer (pipe from file, not echo)
# ============================================================================
cat "$RAW_JSON_FILE" | bun "$SANITIZER" --schema=analysis --for-shell 2>/dev/null > "$SANITIZED_JSON_FILE"

# Check sanitization result
SANITIZE_VALID=$(jq -r '.valid // false' "$SANITIZED_JSON_FILE" 2>/dev/null)
if [ "$SANITIZE_VALID" != "true" ]; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "❌ SECURITY VALIDATION FAILED"
  echo "══════════════════════════════════════════════════════════════════════"
  echo "Errors:"
  jq -r '.errors[]? // "Unknown error"' "$SANITIZED_JSON_FILE"
  echo ""
  echo "The query analyzer returned invalid or malformed JSON."
  exit 1
fi

# Check for security warnings
SANITIZE_WARNINGS=$(jq -r '.warnings | length' "$SANITIZED_JSON_FILE")
if [ "$SANITIZE_WARNINGS" -gt 0 ]; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "⚠️  SECURITY WARNINGS DETECTED"
  echo "══════════════════════════════════════════════════════════════════════"
  jq -r '.warnings[]' "$SANITIZED_JSON_FILE"
  echo ""
  echo "Proceeding with sanitized output, but flagging for review."
  jq '.warnings' "$SANITIZED_JSON_FILE" > "$SESSION_DIR/analysis/security-warnings.json" 2>/dev/null || true
fi

# Extract sanitized data to the analysis file (final destination)
jq -r '.data' "$SANITIZED_JSON_FILE" > "$SESSION_DIR/analysis/query-analysis.json"

echo "🔒 Security validation passed (sanitizer applied)"

# ============================================================================
# Step 3: Validate and extract from the sanitized JSON file
# ============================================================================
ANALYSIS_FILE="$SESSION_DIR/analysis/query-analysis.json"

# Validate minimum length
JSON_LENGTH=$(wc -c < "$ANALYSIS_FILE" | tr -d ' ')
if [ "$JSON_LENGTH" -lt 500 ]; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "❌ FATAL ERROR: JSON suspiciously short ($JSON_LENGTH chars)"
  echo "══════════════════════════════════════════════════════════════════════"
  cat "$ANALYSIS_FILE"
  exit 1
fi

# Validate required fields (read from file, not variable)
validate_json_field() {
  local file="$1" field="$2" expected_type="$3"
  local value=$(jq -r "$field // empty" "$file" 2>/dev/null)
  if [ -z "$value" ] || [ "$value" = "null" ]; then
    echo "❌ VALIDATION FAILED: Missing required field: $field"
    return 1
  fi
  case "$expected_type" in
    array)
      if ! jq -e "$field | type == \"array\"" "$file" >/dev/null 2>&1; then
        echo "❌ VALIDATION FAILED: $field must be an array"
        return 1
      fi
      ;;
    number)
      if ! jq -e "$field | type == \"number\"" "$file" >/dev/null 2>&1; then
        echo "❌ VALIDATION FAILED: $field must be a number"
        return 1
      fi
      ;;
    object)
      if ! jq -e "$field | type == \"object\"" "$file" >/dev/null 2>&1; then
        echo "❌ VALIDATION FAILED: $field must be an object"
        return 1
      fi
      ;;
  esac
  return 0
}

VALIDATION_FAILED=0
validate_json_field "$ANALYSIS_FILE" ".perspectives" "array" || VALIDATION_FAILED=1
validate_json_field "$ANALYSIS_FILE" ".agentAllocation" "object" || VALIDATION_FAILED=1
validate_json_field "$ANALYSIS_FILE" ".perspectiveCount" "number" || VALIDATION_FAILED=1
validate_json_field "$ANALYSIS_FILE" ".overallConfidence" "number" || VALIDATION_FAILED=1

if [ "$VALIDATION_FAILED" -eq 1 ]; then
  echo "══════════════════════════════════════════════════════════════════════"
  echo "❌ FATAL ERROR: JSON missing required fields"
  echo "══════════════════════════════════════════════════════════════════════"
  jq '.' "$ANALYSIS_FILE" 2>/dev/null || cat "$ANALYSIS_FILE"
  exit 1
fi

# Sanity check perspective count
PERSP_COUNT=$(jq -r '.perspectiveCount' "$ANALYSIS_FILE")
if [ "$PERSP_COUNT" -lt 1 ] || [ "$PERSP_COUNT" -gt 20 ]; then
  echo "❌ FATAL ERROR: perspectiveCount out of range: $PERSP_COUNT (expected 1-20)"
  exit 1
fi

echo "✅ JSON validation passed ($JSON_LENGTH chars, $PERSP_COUNT perspectives)"

# ============================================================================
# Step 4: Extract values from file (all jq reads from file, not variable)
# ============================================================================
COMPLEXITY=$(jq -r '.overallComplexity' "$ANALYSIS_FILE")
PERSPECTIVE_COUNT=$(jq -r '.perspectiveCount' "$ANALYSIS_FILE")
OVERALL_CONFIDENCE=$(jq -r '.overallConfidence' "$ANALYSIS_FILE")
TIME_SENSITIVE=$(jq -r '.timeSensitive' "$ANALYSIS_FILE")
REASONING=$(jq -r '.reasoning' "$ANALYSIS_FILE")

PERPLEXITY_COUNT=$(jq -r '.agentAllocation["perplexity-researcher"]' "$ANALYSIS_FILE")
CLAUDE_COUNT=$(jq -r '.agentAllocation["claude-researcher"]' "$ANALYSIS_FILE")
GEMINI_COUNT=$(jq -r '.agentAllocation["gemini-researcher"]' "$ANALYSIS_FILE")
GROK_COUNT=$(jq -r '.agentAllocation["grok-researcher"]' "$ANALYSIS_FILE")

WAVE1_COUNT=$((PERPLEXITY_COUNT + CLAUDE_COUNT + GEMINI_COUNT + GROK_COUNT))

# Extract perspectives as array (write to file, not variable)
jq -c '.perspectives' "$ANALYSIS_FILE" > "$SESSION_DIR/analysis/perspectives.json"

# Check ensemble fallbacks
ENSEMBLE_TRIGGERED=$(jq -r '.ensembleTriggered | length // 0' "$ANALYSIS_FILE")

# Extract platform requirements per perspective (AD-006)
jq -c '[.perspectives[] | {text: .text, platforms: [.platforms[]?.name // empty]}]' "$ANALYSIS_FILE" > "$SESSION_DIR/analysis/platform-requirements.json"

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
jq -r '.perspectives[] | "   → [\(.domain)] \(.text | .[0:60])..."' "$ANALYSIS_FILE"
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
# ============================================================================
# Use ANALYSIS_FILE (set in Step 0.5a) - never echo JSON through shell
# ============================================================================
ANALYSIS_FILE="$SESSION_DIR/analysis/query-analysis.json"

# Extract values using jq from file (not variable)
PIVOTS_JSON=$(jq '.expected_pivots // {}' "$ANALYSIS_FILE")
SECONDARY_DOMAINS=$(jq -r '.secondary_domains // [] | join(", ")' "$ANALYSIS_FILE")
DOMAIN_SCORES=$(jq -r '
  .domain_scores // {} |
  to_entries |
  map("| \(.key | gsub("_"; " ")) | \(.value) |") |
  join("\n")
' "$ANALYSIS_FILE")
PIVOT_PREDICTIONS=$(jq -r '
  .expected_pivots // {} |
  to_entries |
  map("### Prediction \(.key + 1): \(.value.scenario // "N/A")\n- **Likely Pivot:** \(.value.likely_pivot // "N/A")\n- **Trigger:** \(.value.trigger // "N/A")\n- **Wave 2 Response:** \(.value.wave2_specialists // "N/A")\n- **Confidence:** \(.value.confidence // "MODERATE")\n") |
  join("\n")
' "$ANALYSIS_FILE")

# Create human-readable markdown report
cat > "$SESSION_DIR/analysis/query-analysis.md" <<EOF
# Query Analysis Results

**Query:** $USER_QUERY
**Date:** $CURRENT_DATE
**Session:** $SESSION_ID

---

## Domain Scoring

$DOMAIN_SCORES

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

$PIVOT_PREDICTIONS

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
# ============================================================================
# Use ANALYSIS_FILE (set in Step 0.5a) - never echo JSON through shell
# ============================================================================
ANALYSIS_FILE="$SESSION_DIR/analysis/query-analysis.json"

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

# Add track assignments to JSON (using jq from file, not variable)
TRACKS_ARRAY=$(jq -c --argjson std "$STANDARD_COUNT" --argjson ind "$INDEPENDENT_COUNT" '
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
' "$ANALYSIS_FILE")

# Merge tracks array into allocation JSON (write to temp, then move)
TEMP_TRACK=$(mktemp)
jq --argjson tracks "$TRACKS_ARRAY" '.tracks = $tracks' "$TRACK_ALLOCATION" > "$TEMP_TRACK"
mv "$TEMP_TRACK" "$TRACK_ALLOCATION"

echo "🎯 Track Allocation Complete (M10)"
echo "   Standard Track: $STANDARD_COUNT perspectives (50%)"
echo "   Independent Track: $INDEPENDENT_COUNT perspectives (25%)"
echo "   Contrarian Track: $CONTRARIAN_COUNT perspectives (25%)"
echo ""
echo "📊 Track Distribution:"
jq -r '.tracks[] | "   [\(.track | ascii_upcase)] \(.perspective | .[0:50])... → \(.recommended_agent)"' "$TRACK_ALLOCATION"
echo ""
echo "💾 Track allocation saved: $TRACK_ALLOCATION"
```

**Track Distribution Examples:**
- **8 perspectives:** 4 standard, 2 independent, 2 contrarian
- **6 perspectives:** 3 standard, 1-2 independent, 1-2 contrarian
- **4 perspectives:** 2 standard, 1 independent, 1 contrarian

**Step 0.6b: Human-Readable Track Report**

```bash
# ============================================================================
# Use TRACK_ALLOCATION file (set in Step 0.6a) - never echo JSON through shell
# ============================================================================
TRACK_ALLOCATION="$SESSION_DIR/analysis/track-allocation.json"

# Extract track assignments using jq from file
TRACK_ASSIGNMENTS=$(jq -r '.tracks[] |
"### Perspective \(.perspective_index + 1): \(.track | ascii_upcase) Track

**Domain:** \(.domain)
**Agent:** \(.recommended_agent)
**Track:** \(.track)
**Source Guidance:** \(.source_guidance)

**Perspective:**
\(.perspective)

---
"' "$TRACK_ALLOCATION")

# Create markdown report for track allocation
cat > "$SESSION_DIR/analysis/track-allocation.md" <<EOF
# Track Allocation Report (M10 - Source Quality Framework)

**Session:** $SESSION_ID
**Date:** $CURRENT_DATE
**Total Perspectives:** $PERSPECTIVE_COUNT
**Distribution:** 50% standard / 25% independent / 25% contrarian

---

## Track Assignments

$TRACK_ASSIGNMENTS

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

---

## PHASE COMPLETE

After executing Steps 0, 0.5, and 0.6:

**Report back to orchestrator:**
```
INIT PHASE COMPLETE
SESSION_DIR: [path]
WAVE1_COUNT: [number]
PERSPECTIVES: [count] perspectives generated
TRACKS: [standard/independent/contrarian] distribution complete
```

The orchestrator will then call `/research-collect` with the SESSION_DIR.
