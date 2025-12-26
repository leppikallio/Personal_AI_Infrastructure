---
description: "Research Synthesis: Parallel perspective summarization and cross-perspective synthesis (called by /_research-synthesize)"
globs: ""
alwaysApply: false
---

# Parallel Synthesis Orchestrator

**This command is called by /_research-synthesize.**
**DO NOT run this command directly - use /conduct-research-adaptive for full workflow.**

## Phase Purpose

Execute parallel synthesis using the M13.2 architecture with Producer/Approver Loop:
1. Create summaries directory
2. Dynamically count perspective files (wave-1/*.md + wave-2/*.md)
3. Launch perspective-summarizer agents IN PARALLEL (one per file)
4. Wait for ALL summarizers to complete
5. Verify all summaries created
6. **PRODUCER/APPROVER LOOP:**
   - Launch synthesis-writer agent (produces synthesis)
   - Launch research-reviewer agent (validates M11 compliance)
   - If REVISIONS REQUIRED → loop back to synthesis-writer
   - Max 5 iterations, then escalate to human review
7. Verify final-synthesis.md meets quality gates and is APPROVED

## Phase Input

Expects from parent phase:
- `SESSION_DIR` - Research session directory path
- `$SESSION_DIR/wave-1/*.md` - Wave 1 agent outputs
- `$SESSION_DIR/wave-2/*.md` - Wave 2 outputs (if applicable)
- `$SESSION_DIR/analysis/unified-citations.md` - Unified citation pool

## Phase Output

After completing this phase:
- `$SESSION_DIR/summaries/summary-*.md` - All perspective summaries
- `$SESSION_DIR/final-synthesis.md` - Final synthesis document
- Phase marker: `.parallel-synthesis-complete`

---

## STEP 1: Create Summaries Directory

```bash
set +H  # Disable history expansion
mkdir -p "${SESSION_DIR}/summaries"
echo "Created summaries directory: ${SESSION_DIR}/summaries"
```

---

## STEP 2: Count Perspective Files (DYNAMIC - NEVER HARDCODE)

**CRITICAL: File count MUST be determined at runtime**

```bash
set +H  # Disable history expansion
# Count Wave 1 files
WAVE1_FILES=$(ls -1 "${SESSION_DIR}/wave-1"/*.md 2>/dev/null | wc -l | tr -d ' ')

# Count Wave 2 files (may be 0)
WAVE2_FILES=$(ls -1 "${SESSION_DIR}/wave-2"/*.md 2>/dev/null | wc -l | tr -d ' ')

TOTAL_PERSPECTIVES=$((WAVE1_FILES + WAVE2_FILES))

echo "Perspective files to summarize:"
echo "  Wave 1: $WAVE1_FILES files"
echo "  Wave 2: $WAVE2_FILES files"
echo "  Total:  $TOTAL_PERSPECTIVES files"

if [ "$TOTAL_PERSPECTIVES" -eq 0 ]; then
  echo "ERROR: No perspective files found to synthesize"
  exit 1
fi
```

---

## STEP 3: Generate File List

```bash
set +H  # Disable history expansion
# Create ordered file list for agent assignment
FILE_LIST="${SESSION_DIR}/analysis/perspective-files.txt"

# Wave 1 files
ls -1 "${SESSION_DIR}/wave-1"/*.md 2>/dev/null > "$FILE_LIST"

# Wave 2 files (append if exist)
ls -1 "${SESSION_DIR}/wave-2"/*.md 2>/dev/null >> "$FILE_LIST" || true

echo "Perspective file list saved to: $FILE_LIST"
cat "$FILE_LIST"
```

---

## STEP 4: Launch Perspective Summarizers IN PARALLEL

**CRITICAL: Use a SINGLE message with MULTIPLE Task tool calls**

For each perspective file in the file list, launch a perspective-summarizer agent.

```typescript
// PARALLEL LAUNCH - ALL agents in ONE message
// Read the file list and launch one agent per file

// For EACH file in perspective-files.txt:
Task({
  subagent_type: "perspective-summarizer",
  model: "sonnet",  // Explicit - citation accuracy critical
  description: "Summarize: [filename]",
  prompt: `
You are a perspective-summarizer agent.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- USER_QUERY: "${USER_QUERY}"

**YOUR ASSIGNED FILE:**
${PERSPECTIVE_FILE_PATH}

**YOUR OUTPUT FILE:**
${SESSION_DIR}/summaries/summary-[filename].md

**INSTRUCTIONS:**
1. Read your assigned perspective file
2. Extract key findings with citation references preserved
3. Create citation mapping table
4. Write structured summary (3-5KB, max 150 lines)
5. Flag unique insights for this perspective

Follow the full perspective-summarizer agent instructions.
Complete the task by writing the summary file.
`
})

// Example with 8 files - ALL launched in ONE message:
// Task 1: wave-1/perplexity-researcher-api-workflows.md
// Task 2: wave-1/claude-researcher-photorealistic.md
// Task 3: wave-1/gemini-researcher-composition.md
// Task 4: wave-1/grok-researcher-multimodal.md
// Task 5: wave-1/perplexity-researcher-scenery.md
// Task 6: wave-1/claude-researcher-practical.md
// Task 7: wave-2/claude-researcher-specialist-1.md
// Task 8: wave-2/gemini-researcher-specialist-2.md
```

**CRITICAL RULES:**
1. Launch ALL summarizers in a SINGLE message (parallel execution)
2. Each agent gets exactly ONE file
3. Model MUST be "sonnet" (citation accuracy)
4. Output files MUST match pattern: `summary-[original-filename].md`

---

## STEP 5: Wait for ALL Summarizers to Complete

**NO BAILOUT - Wait for every agent**

```typescript
// For each launched agent, wait for completion
// Use AgentOutputTool with block=true

AgentOutputTool({
  agentId: "[agent-id-1]",
  block: true,
  wait_up_to: 180  // 3 minutes per agent
})

// Repeat for ALL agents
// Do NOT proceed until every agent completes or times out
```

---

## STEP 6: Verify All Summaries Created

```bash
set +H  # Disable history expansion
EXPECTED_SUMMARIES=$TOTAL_PERSPECTIVES
ACTUAL_SUMMARIES=$(ls -1 "${SESSION_DIR}/summaries"/summary-*.md 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Summary Verification:"
echo "  Expected: $EXPECTED_SUMMARIES"
echo "  Actual:   $ACTUAL_SUMMARIES"

if [ "$ACTUAL_SUMMARIES" -lt "$EXPECTED_SUMMARIES" ]; then
  echo "WARNING: Missing summaries"

  # List which files are missing
  for file in $(cat "${SESSION_DIR}/analysis/perspective-files.txt"); do
    BASENAME=$(basename "$file" .md)
    if [ ! -f "${SESSION_DIR}/summaries/summary-${BASENAME}.md" ]; then
      echo "  MISSING: summary-${BASENAME}.md"
    fi
  done

  echo ""
  echo "Proceeding with available summaries..."
fi

# Count summary sizes
TOTAL_SUMMARY_SIZE=$(wc -c "${SESSION_DIR}/summaries"/summary-*.md 2>/dev/null | tail -1 | awk '{print $1}')
echo "Total summary content: $TOTAL_SUMMARY_SIZE bytes (~$((TOTAL_SUMMARY_SIZE / 1024))KB)"
```

---

## STEP 7: Verify Unified Citations Exist

```bash
set +H  # Disable history expansion
if [ ! -f "${SESSION_DIR}/analysis/unified-citations.md" ]; then
  echo "ERROR: unified-citations.md not found"
  echo "Citation pooling must run before parallel synthesis"
  exit 1
fi

CITATION_COUNT=$(grep -c '^\[' "${SESSION_DIR}/analysis/unified-citations.md" 2>/dev/null || echo 0)
echo "Unified citation pool: $CITATION_COUNT citations"
```

---

## STEP 8: Producer/Approver Loop - Initialize

**M13.2 Quality Control: synthesis-writer produces, research-reviewer validates**

```bash
set +H  # Disable history expansion
# Initialize iteration counter
ITERATION=1
MAX_ITERATIONS=5
APPROVED=0

# Create synthesis directory
mkdir -p "${SESSION_DIR}/synthesis"

echo ""
echo "Starting Producer/Approver Loop (max $MAX_ITERATIONS iterations)"
echo ""
```

---

## STEP 8a: Launch Synthesis Writer (Iteration 1)

**First synthesis attempt - synthesis-writer receives summaries + unified citations**

```typescript
Task({
  subagent_type: "synthesis-writer",
  model: "opus",  // Highest quality for synthesis
  description: "Synthesis: Iteration 1",
  prompt: `
You are the synthesis-writer agent.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- USER_QUERY: "${USER_QUERY}"
- CURRENT_DATE: ${CURRENT_DATE}
- ITERATION: 1 of 5 (initial synthesis)

**YOUR INPUT FILES:**
1. All summaries in: ${SESSION_DIR}/summaries/
2. Unified citations: ${SESSION_DIR}/analysis/unified-citations.md

**YOUR OUTPUT FILE:**
${SESSION_DIR}/synthesis/final-synthesis.md

**SUMMARY COUNT:**
${ACTUAL_SUMMARIES} perspective summaries (~${TOTAL_SUMMARY_SIZE} bytes total)

**CITATION COUNT:**
${CITATION_COUNT} unified citations available

**CRITICAL STRUCTURE REQUIREMENT (M11 COMPLIANCE):**
Your output MUST follow the SIX-PART ACADEMIC FORMAT:
- Part I: Executive Summary (Abstract + Key Findings)
- Part II: Research Methodology (Agent Attribution + Quality Metrics)
- Part III: Research Findings by Perspective (one section per perspective)
- Part IV: Integrated Analysis (Cross-Perspective Synthesis + Consensus/Divergence)
- Part V: Emergent Research Directions (Gaps + Follow-up Queries)
- Part VI: References and Appendices (IEEE format references + Metadata)

**CRITICAL CITATION REQUIREMENT:**
EVERY factual claim MUST have an inline [N] citation.
Example: "FLUX.1 achieved state-of-the-art results [4], with 95% human preference [7]."
NOT: "FLUX.1 achieved state-of-the-art results with high human preference."

**INSTRUCTIONS:**
1. Read ALL summary files from summaries/ directory
2. Read unified-citations.md for the citation pool
3. Produce comprehensive synthesis following six-part structure
4. Ensure EVERY paragraph has inline [N] citations
5. Include ALL citations used in Part VI: References in IEEE format
6. Target citation utilization >= 60%
7. Preserve all track viewpoints (standard, independent, contrarian)

Follow the full synthesis-writer agent instructions.
Complete the task by writing ${SESSION_DIR}/synthesis/final-synthesis.md.
`
})
```

---

## STEP 9: Wait for Synthesis Writer

```typescript
// Wait for synthesis-writer
AgentOutputTool({
  agentId: "[synthesis-writer-agent-id]",
  block: true,
  wait_up_to: 300  // 5 minutes for full synthesis
})
```

**Validate synthesis output exists:**

```bash
set +H  # Disable history expansion
SYNTHESIS_FILE="${SESSION_DIR}/synthesis/final-synthesis.md"

# Check if synthesis exists (try both old and new paths)
if [ ! -f "$SYNTHESIS_FILE" ]; then
  SYNTHESIS_FILE="${SESSION_DIR}/final-synthesis.md"
  if [ ! -f "$SYNTHESIS_FILE" ]; then
    echo "ERROR: final-synthesis.md not created"
    exit 1
  fi
fi

SYNTHESIS_SIZE=$(wc -c < "$SYNTHESIS_FILE" | tr -d ' ')
SYNTHESIS_LINES=$(wc -l < "$SYNTHESIS_FILE" | tr -d ' ')

echo ""
echo "Synthesis Output (Iteration $ITERATION):"
echo "  Size: $SYNTHESIS_SIZE bytes (~$((SYNTHESIS_SIZE / 1024))KB)"
echo "  Lines: $SYNTHESIS_LINES"

# Check for citation utilization (count [N] references)
CITATIONS_USED=$(grep -oE '\[[0-9]+\]' "$SYNTHESIS_FILE" | sort -u | wc -l | tr -d ' ')
if [ "$CITATION_COUNT" -gt 0 ]; then
  UTILIZATION=$((CITATIONS_USED * 100 / CITATION_COUNT))
else
  UTILIZATION=0
fi

echo "  Citations Used: $CITATIONS_USED / $CITATION_COUNT"
echo "  Utilization: ${UTILIZATION}%"
```

---

## STEP 9b: Validate Academic Structure (M11 COMPLIANCE)

**CRITICAL: Verify synthesis follows six-part academic format**

```bash
set +H  # Disable history expansion
echo ""
echo "Academic Structure Validation (M11):"

STRUCTURE_VALID=1

# Check for Part I (Executive Summary)
if ! grep -q "## Part I:" "$SYNTHESIS_FILE" && ! grep -q "## Part I :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part I: Executive Summary"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part I: Executive Summary"
fi

# Check for Part II (Methodology)
if ! grep -q "## Part II:" "$SYNTHESIS_FILE" && ! grep -q "## Part II :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part II: Research Methodology"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part II: Research Methodology"
fi

# Check for Part III (Findings)
if ! grep -q "## Part III:" "$SYNTHESIS_FILE" && ! grep -q "## Part III :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part III: Research Findings"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part III: Research Findings"
fi

# Check for Part IV (Analysis)
if ! grep -q "## Part IV:" "$SYNTHESIS_FILE" && ! grep -q "## Part IV :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part IV: Integrated Analysis"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part IV: Integrated Analysis"
fi

# Check for Part V (Directions)
if ! grep -q "## Part V:" "$SYNTHESIS_FILE" && ! grep -q "## Part V :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part V: Emergent Research Directions"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part V: Emergent Research Directions"
fi

# Check for Part VI (References)
if ! grep -q "## Part VI:" "$SYNTHESIS_FILE" && ! grep -q "## Part VI :" "$SYNTHESIS_FILE"; then
  echo "  ❌ MISSING: Part VI: References and Appendices"
  STRUCTURE_VALID=0
else
  echo "  ✅ Part VI: References and Appendices"
fi

# Check for IEEE format references (looking for [1] Author, "Title" patterns)
IEEE_REFS=$(grep -c '^\[[0-9]\+\]' "$SYNTHESIS_FILE" 2>/dev/null || echo 0)
echo ""
echo "  IEEE References Found: $IEEE_REFS"

if [ "$IEEE_REFS" -lt 5 ]; then
  echo "  ⚠️ WARNING: Very few IEEE-format references (expected 20+)"
fi

# Check inline citation density
PARAGRAPHS=$(grep -c '^[A-Z]' "$SYNTHESIS_FILE" 2>/dev/null || echo 0)
CITATION_INSTANCES=$(grep -oE '\[[0-9]+\]' "$SYNTHESIS_FILE" | wc -l | tr -d ' ')

echo ""
echo "  Citation Density:"
echo "    Total citation instances: $CITATION_INSTANCES"
echo "    Unique citations: $CITATIONS_USED"
if [ "$PARAGRAPHS" -gt 0 ]; then
  echo "    Avg citations per ~paragraph: $((CITATION_INSTANCES / PARAGRAPHS))"
fi

if [ "$STRUCTURE_VALID" -eq 0 ]; then
  echo ""
  echo "  🛑 STRUCTURE VALIDATION FAILED"
  echo "  Synthesis does NOT follow six-part academic format (Part I-VI)"
  echo "  This is a M11 compliance violation"
fi
```

---

## STEP 9c: Launch Research Reviewer

**research-reviewer validates synthesis against M11 standards**

```typescript
Task({
  subagent_type: "research-reviewer",
  model: "sonnet",  // Fast + accurate for validation
  description: "Review: Iteration ${ITERATION}",
  prompt: `
You are the research-reviewer agent.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- ITERATION: ${ITERATION} of 5

**YOUR INPUT FILES:**
1. Synthesis to review: ${SESSION_DIR}/synthesis/final-synthesis.md
2. Unified citations: ${SESSION_DIR}/analysis/unified-citations.md

**YOUR OUTPUT FILE:**
${SESSION_DIR}/analysis/synthesis-review-${ITERATION}.md

**TASK:**
Review the synthesis output against M11 quality standards:

1. **Structure Validation:** Check for Part I through Part VI headings
2. **Inline Citations:** Verify every paragraph has [N] citations
3. **IEEE References:** Confirm Part VI has IEEE-format references
4. **Citation Utilization:** Calculate percentage used (target >= 60%)
5. **Content Quality:** All perspectives represented, contrarian views included

**OUTPUT FORMAT:**
If synthesis meets standards:
- Write VERDICT: APPROVED at the end

If revisions needed:
- List each issue with specific location, current text, and required fix
- Provide actionable feedback the synthesis-writer can implement
- Write VERDICT: REVISIONS REQUIRED at the end

Follow the full research-reviewer agent instructions.
`
})
```

---

## STEP 9d: Wait for Reviewer and Check Verdict

```typescript
// Wait for research-reviewer
AgentOutputTool({
  agentId: "[research-reviewer-agent-id]",
  block: true,
  wait_up_to: 180  // 3 minutes for review
})
```

**Check reviewer verdict:**

```bash
set +H  # Disable history expansion
REVIEW_FILE="${SESSION_DIR}/analysis/synthesis-review-${ITERATION}.md"

if [ ! -f "$REVIEW_FILE" ]; then
  echo "WARNING: Review file not created, assuming approval needed"
  VERDICT="REVISIONS REQUIRED"
else
  # Check for APPROVED or REVISIONS REQUIRED
  if grep -q "VERDICT: APPROVED" "$REVIEW_FILE"; then
    APPROVED=1
    VERDICT="APPROVED"
    echo ""
    echo "✅ SYNTHESIS APPROVED (Iteration $ITERATION)"
  else
    VERDICT="REVISIONS REQUIRED"
    echo ""
    echo "❌ REVISIONS REQUIRED (Iteration $ITERATION)"
    echo "   See: $REVIEW_FILE"
  fi
fi
```

---

## STEP 9e: Revision Loop (If Not Approved)

**If REVISIONS REQUIRED and iterations remaining, re-launch synthesis-writer**

```bash
set +H  # Disable history expansion
# Loop logic: If not approved and iterations remaining
while [ "$APPROVED" -eq 0 ] && [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "🔄 Starting Revision (Iteration $ITERATION of $MAX_ITERATIONS)"

  # Launch synthesis-writer with previous review feedback
  # (This is handled by the Task tool below)
  break  # Exit bash loop - orchestrator handles iteration via Task
done

if [ "$APPROVED" -eq 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
  echo ""
  echo "⚠️ MAX ITERATIONS REACHED ($MAX_ITERATIONS)"
  echo "   Escalating to human review"
  echo "   Review files: ${SESSION_DIR}/analysis/synthesis-review-*.md"
fi
```

**Launch revision (if needed):**

```typescript
// ONLY if VERDICT was "REVISIONS REQUIRED" and ITERATION < MAX_ITERATIONS
Task({
  subagent_type: "synthesis-writer",
  model: "opus",
  description: "Synthesis: Revision ${ITERATION}",
  prompt: `
You are the synthesis-writer agent performing a REVISION.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- USER_QUERY: "${USER_QUERY}"
- CURRENT_DATE: ${CURRENT_DATE}
- ITERATION: ${ITERATION} of 5 (REVISION - not initial synthesis)

**CRITICAL: This is a REVISION, not a fresh synthesis.**

**YOUR INPUT FILES:**
1. Current synthesis: ${SESSION_DIR}/synthesis/final-synthesis.md
2. Reviewer feedback: ${SESSION_DIR}/analysis/synthesis-review-${PREVIOUS_ITERATION}.md
3. Unified citations: ${SESSION_DIR}/analysis/unified-citations.md

**YOUR OUTPUT FILE:**
${SESSION_DIR}/synthesis/final-synthesis.md (overwrite with revised version)

**REVISION INSTRUCTIONS:**
1. READ the reviewer feedback file FIRST
2. Parse each issue identified by the reviewer
3. For each issue:
   - Find the problematic text in current synthesis
   - Apply the required fix as specified by reviewer
   - Use citations from unified-citations.md
4. Increment iteration count in synthesis header
5. Write updated synthesis to final-synthesis.md

**DO NOT start from scratch. FIX the identified issues.**

Follow the full synthesis-writer agent instructions for revision workflow.
`
})

// After revision, go back to STEP 9 (wait for synthesis writer)
// Continue the loop: synthesis-writer → reviewer → check verdict
// Until APPROVED or MAX_ITERATIONS reached
```

**CRITICAL: The orchestrator must implement this loop:**
1. Launch synthesis-writer (initial or revision)
2. Wait for synthesis-writer to complete
3. Launch research-reviewer
4. Wait for research-reviewer to complete
5. Check VERDICT in review file
6. If APPROVED → proceed to STEP 10
7. If REVISIONS REQUIRED and ITERATION < 5 → go to step 1 (revision)
8. If MAX_ITERATIONS reached → log warning, proceed to STEP 10

---

## STEP 10: Create Phase Marker

```bash
set +H  # Disable history expansion
PAI_DIR="${HOME}/.claude"
GATE_CLI="${PAI_DIR}/utilities/research-orchestrator/cli.ts"

# Determine quality gate status
if [ "$APPROVED" -eq 1 ]; then
  QUALITY_GATE="PASSED"
else
  QUALITY_GATE="ESCALATED"
fi

bun "$GATE_CLI" mark "$SESSION_DIR" parallel-synthesis-complete '{
  "summariesCreated": '$ACTUAL_SUMMARIES',
  "synthesisSize": '$SYNTHESIS_SIZE',
  "citationsUsed": '$CITATIONS_USED',
  "citationUtilization": '$UTILIZATION',
  "iterationsUsed": '$ITERATION',
  "approved": '$APPROVED',
  "qualityGate": "'$QUALITY_GATE'"
}'

echo ""
echo "Parallel synthesis complete - marker created"
echo "  Iterations: $ITERATION"
echo "  Quality Gate: $QUALITY_GATE"
```

---

## PHASE COMPLETE

**Report back to parent orchestrator:**

```
PARALLEL SYNTHESIS COMPLETE
Perspectives Summarized: [count]
Summaries Created: [count]
Synthesis Size: [KB]
Citations Used: [count] / [total]
Utilization Rate: [percentage]%
Iterations Used: [N] of 5
Quality Gate: [PASSED/ESCALATED]
Reviewer Approved: [YES/NO]
```

---

## CRITICAL RULES

1. **DYNAMIC FILE COUNT** - Never hardcode perspective count
2. **PARALLEL LAUNCH** - ALL summarizers in ONE message
3. **NO BAILOUT** - Wait for every summarizer
4. **MODEL ENFORCEMENT** - Summarizers use sonnet, synthesis-writer uses opus, reviewer uses sonnet
5. **CITATION ACCURACY** - Verify utilization >= 60%
6. **COMPLETE THE TASK** - Don't return until final-synthesis.md exists
7. **M11 STRUCTURE COMPLIANCE** - Output MUST have Part I through Part VI headings
8. **IEEE CITATIONS** - Every factual claim needs inline [N] citation
9. **REFERENCES SECTION** - Part VI must include all [N] citations in IEEE format
10. **PRODUCER/APPROVER LOOP** - synthesis-writer produces, research-reviewer validates
11. **ITERATION LIMIT** - Maximum 5 iterations, then escalate to human review
12. **REVISION NOT REWRITE** - Revisions fix specific issues, don't start from scratch

---

## ARCHITECTURE NOTE

This is the M13.2 Parallel Synthesis Architecture with Producer/Approver Loop:

```
wave-1/*.md + wave-2/*.md (200-450KB total)
       │
       ▼
┌──────────────────────────────────────┐
│  N × perspective-summarizer (PARALLEL)│
│  Each: 25-30KB → 3-5KB summary       │
│  Model: sonnet                       │
└──────────────────────────────────────┘
       │
       ▼
summaries/summary-*.md (40-55KB total)
       │
       ▼
┌──────────────────────────────────────┐
│     PRODUCER/APPROVER LOOP           │
│  ┌────────────────────────────────┐  │
│  │  synthesis-writer (opus)       │  │
│  │  Produces: final-synthesis.md  │  │
│  └────────────────────────────────┘  │
│             │                        │
│             ▼                        │
│  ┌────────────────────────────────┐  │
│  │  research-reviewer (sonnet)    │  │
│  │  Validates: M11 compliance     │  │
│  │  Returns: APPROVED or REVISE   │  │
│  └────────────────────────────────┘  │
│             │                        │
│      ┌──────┴──────┐                 │
│      │             │                 │
│   APPROVED    REVISIONS              │
│      │        REQUIRED               │
│      │             │                 │
│      ▼             ▼                 │
│    EXIT      Loop back to            │
│              synthesis-writer        │
│              (max 5 iterations)      │
└──────────────────────────────────────┘
       │
       ▼
final-synthesis.md (15-25KB) [APPROVED]
```

**Why parallel summarization?**
- N summarizers run concurrently = faster completion
- Each summarizer has fresh context (no overflow)
- Synthesizer receives condensed input = better synthesis
- Citation utilization improves with organized summaries

**Why producer/approver loop?**
- Getting synthesis right on first try is unreliable
- Iteration through feedback produces higher quality
- Reviewer provides specific, actionable corrections
- Max 5 iterations prevents infinite loops
- Human escalation if quality gates not met

---

**Version:** M13.2 - Parallel Synthesis with Producer/Approver Loop (2025-12-26)
