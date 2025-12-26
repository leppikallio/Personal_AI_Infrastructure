---
description: Adaptive multi-wave research - {{DA}} orchestrates research phases through sub-commands
globs: ""
alwaysApply: false
---

# 🔬 ADAPTIVE MULTI-WAVE RESEARCH ORCHESTRATOR

**YOU ({{DA}}) are reading this because a research request was detected by the load-context hook.**

This is the **SLIM ORCHESTRATOR** (M13). Detailed instructions for each phase are in sub-commands:
- `/_research-init` - Query analysis and session setup
- `/_research-collect` - Launch agents and collect results
- `/_research-synthesize` - Citation pooling and synthesis
- `/_research-validate` - Quality validation

**Note:** Sub-commands are prefixed with `_` to indicate they are internal and not meant to be called directly by users. Always use `/conduct-research-adaptive` for research workflows.

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

---

## 📋 ORCHESTRATION WORKFLOW

### Phase 1: Initialize (SlashCommand: /_research-init)

```
SlashCommand: /_research-init "$USER_QUERY"
```

**Quality Gate (after /_research-init completes):**
- [ ] `$SESSION_DIR` directory exists
- [ ] `$SESSION_DIR/analysis/query-analysis.json` created
- [ ] `$SESSION_DIR/analysis/track-allocation.json` created
- [ ] `WAVE1_COUNT` determined (4-6 agents)

**If gate fails:** Re-run /_research-init with same query

**Extract from output:**
- `SESSION_DIR` path
- `WAVE1_COUNT` for next phase
- `PERSPECTIVES` array

---

### Phase 2: Collect (SlashCommand: /_research-collect)

```
SlashCommand: /_research-collect $SESSION_DIR
```

**Sub-Phases (all visible in progress tracking):**

| Sub-Phase | Marker | Description |
|-----------|--------|-------------|
| 2.1 Launch Wave 1 | `.wave1-launched` | Launch N agents with perspectives |
| 2.2 Wait for Agents | `.wave1-complete` | Wait for ALL agents (no bailout) |
| 2.3 Pivot Analysis | `.pivot-complete` | Quality scoring + domain signals + gap detection |
| 2.4 Wave 2 Specialists | `.wave2-complete` or `.wave2-skipped` | Launch specialists if pivot triggered |
| 2.5 Citation Validation | `.citations-validated` | **BLOCKING** - Validate all URLs, track hallucinations |

**TodoWrite structure for Phase 2:**
```typescript
TodoWrite({ todos: [
  { content: "Phase 2: Collect research", status: "in_progress", activeForm: "Collecting research" },
  { content: "  2.1: Launch Wave 1 agents", status: "pending", activeForm: "Launching Wave 1 agents" },
  { content: "  2.2: Wait for all agents", status: "pending", activeForm: "Waiting for agents" },
  { content: "  2.3: Pivot analysis", status: "pending", activeForm: "Running pivot analysis" },
  { content: "  2.4: Wave 2 specialists", status: "pending", activeForm: "Launching Wave 2 specialists" },
  { content: "  2.5: Validate citations", status: "pending", activeForm: "Validating citations" },
]})
```

**Quality Gate (after /_research-collect completes):**
- [ ] All 5 sub-phase markers exist
- [ ] Wave 1 files exist in `$SESSION_DIR/wave-1/`
- [ ] Citation validation report exists
- [ ] Total validated citations >= 50
- [ ] Invalid citation rate < 20%

**If gate fails:**
- If citation count < 50: Note as "limited sources" but continue
- If invalid rate > 20%: Re-validate or proceed with warnings

**Extract from output:**
- Total citations count
- Valid/invalid citation counts
- Wave 2 status (launched or skipped)

---

### Phase 3: Synthesize (SlashCommand: /_research-synthesize)

```
SlashCommand: /_research-synthesize $SESSION_DIR
```

**Sub-Phases (all visible in progress tracking):**

| Sub-Phase | Marker | Description |
|-----------|--------|-------------|
| 3.0 Citation Pooling | `.citations-pooled` | Unify all citations from all agents |
| 3.1 Perspective Summarizers | `.summaries-complete` | Launch N parallel summarizer agents |
| 3.2 Cross-Perspective Synthesis | `.synthesis-complete` | Single synthesizer produces final output |
| 3.3 Task Graph | (inline) | Generate decision trail |
| 3.4 Platform Coverage | (inline) | Validate all platforms covered |

**TodoWrite structure for Phase 3:**
```typescript
TodoWrite({ todos: [
  { content: "Phase 3: Synthesize findings", status: "in_progress", activeForm: "Synthesizing findings" },
  { content: "  3.0: Pool all citations", status: "pending", activeForm: "Pooling citations" },
  { content: "  3.1: Launch N summarizers", status: "pending", activeForm: "Launching summarizers" },
  { content: "  3.2: Cross-perspective synthesis", status: "pending", activeForm: "Running cross-synthesis" },
  { content: "  3.3: Generate task graph", status: "pending", activeForm: "Generating task graph" },
  { content: "  3.4: Platform coverage check", status: "pending", activeForm: "Checking platform coverage" },
]})
```

**Quality Gate (after /_research-synthesize completes):**
- [ ] `$SESSION_DIR/summaries/summary-*.md` files exist
- [ ] `$SESSION_DIR/final-synthesis.md` exists
- [ ] File size 15-40KB
- [ ] Citation utilization reported

**If gate fails:**
- If no summaries: Re-run /_research-synthesize-parallel
- If no synthesis: Re-run cross-perspective-synthesizer
- If too small (<15KB): Note as "condensed synthesis"
- If too large (>40KB): Acceptable, may need trimming

**Extract from output:**
- Synthesis file location
- Citation utilization %
- Summaries created count

---

### Phase 4: Validate (SlashCommand: /_research-validate)

```
SlashCommand: /_research-validate $SESSION_DIR
```

**Quality Gate (after /_research-validate completes):**
- [ ] Citation utilization ≥ 60%
- [ ] All 6 parts present in synthesis
- [ ] Citation density ratio ≥ 1.0

**If gate fails:**
- If utilization < 60%: Log warning, proceed with notes
- If structure incomplete: Log warning, proceed
- If density < 1.0: Re-run validation or flag uncited claims

**Extract from output:**
- Pass/fail status
- Metrics (utilization %, density ratio)

---

### Phase 5: Report Results

After all phases complete successfully, use the mandatory format below.

---

## Step 4: Return Results Using MANDATORY Format (Enhanced)

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

---

## 🚨 CRITICAL RULES FOR ORCHESTRATOR

### Phase Execution
1. **ALWAYS run phases in order:** init → collect → synthesize → validate
2. **CHECK quality gates** after each phase
3. **PASS SESSION_DIR** to each subsequent phase
4. **DON'T skip phases** - each builds on the previous

### Sub-Phase Visibility (MANDATORY)
5. **UPDATE TodoWrite** with sub-phases at start of each major phase
6. **MARK sub-phases in_progress/completed** as you execute them
7. **USER MUST SEE** every sub-phase status (2.1, 2.2, 2.3, etc.)
8. **VERIFY markers exist** before proceeding to next sub-phase

### Quality Gate Enforcement
9. **LOG failures** with specific reason
10. **RETRY once** on transient failures
11. **PROCEED with warnings** on non-critical failures
12. **ABORT only** if multiple critical failures

### Citation Validation (BLOCKING OPERATION)
13. **DO NOT SKIP** citation validation in /_research-collect
14. **MUST BE BLOCKING** - Do NOT run in background, do NOT proceed to synthesis while running
15. **60% utilization** is minimum acceptable
16. **Flag invalid citations** - do not use in synthesis
17. **Entry gate exists** - /_research-synthesize will HALT if .citations-validated marker missing

### Sub-Agent Coordination
16. **Sub-agents get FRESH context** - pass all needed info explicitly
17. **Don't assume** sub-agents know session state
18. **Verify outputs** exist after each sub-command

---

## 🚧 HANDLING BLOCKED OR FAILED CRAWLS

If research commands report being blocked, encountering CAPTCHAs, or facing bot detection, note this in your synthesis and recommend using:
- `mcp__Brightdata__scrape_as_markdown` - Scrape single URLs that bypass bot detection
- `mcp__Brightdata__scrape_batch` - Scrape multiple URLs (up to 10)
- `mcp__Brightdata__search_engine` - Search Google, Bing, or Yandex with CAPTCHA bypass
- `mcp__Brightdata__search_engine_batch` - Multiple search queries simultaneously

---

## 💡 EXAMPLE EXECUTION (Orchestrated)

**User asks:** "Research OSINT tools for threat intelligence"

**Your orchestrated workflow:**

1. ✅ **Phase 1: Initialize**
   ```
   SlashCommand: /_research-init "Research OSINT tools for threat intelligence"
   ```
   - Output: SESSION_DIR=${PAI_DIR}/scratchpad/research/20251128-143022-12345
   - Output: WAVE1_COUNT=5
   - Gate: ✅ All files created

2. ✅ **Phase 2: Collect** (with visible sub-phases)
   ```
   SlashCommand: /_research-collect ${PAI_DIR}/scratchpad/research/20251128-143022-12345
   ```
   - ✅ 2.1: Launch Wave 1 agents (5 agents launched)
   - ✅ 2.2: Wait for all agents (5/5 complete)
   - ✅ 2.3: Pivot analysis (quality 87/100, 2 domain signals)
   - ✅ 2.4: Wave 2 specialists (3 specialists launched)
   - ✅ 2.5: Validate citations (142 total, 128 valid)
   - Gate: ✅ All sub-phase markers exist

3. ✅ **Phase 3: Synthesize** (with visible sub-phases)
   ```
   SlashCommand: /_research-synthesize ${PAI_DIR}/scratchpad/research/20251128-143022-12345
   ```
   - ✅ 3.0: Pool citations (unified-citations.md created)
   - ✅ 3.1: Launch 8 summarizers (8 summaries created)
   - ✅ 3.2: Cross-perspective synthesis (final-synthesis.md 28KB)
   - ✅ 3.3: Task graph generated
   - ✅ 3.4: Platform coverage verified
   - Gate: ✅ Synthesis complete, utilization 72%

4. ✅ **Phase 4: Validate**
   ```
   SlashCommand: /_research-validate ${PAI_DIR}/scratchpad/research/20251128-143022-12345
   ```
   - Output: Citation utilization 72% (>=60% ✅)
   - Output: 6/6 parts present ✅
   - Output: Density ratio 1.2 ✅
   - Gate: ✅ All validations passed

5. ✅ **Phase 5: Report**
   - Read final-synthesis.md
   - Format with mandatory response format
   - Include metrics and agent performance

**Result:** User gets comprehensive research with full quality validation.

---

## 🎤 VOICE NOTIFICATIONS

Voice notifications are AUTOMATIC when you use the mandatory response format. The stop-hook will:
- Extract your 🎯 COMPLETED line
- Send it to the voice server with voiceId onwK4e9ZLuTAKqWW03F9
- Announce "Completed adaptive multi-wave [topic] research"

**YOU DO NOT NEED TO MANUALLY SEND VOICE NOTIFICATIONS** - just use the format.

---

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

---

## Step 5.1: Update Research Index (M12)

**⚠️ MANDATORY: Update the research index after every completed session.**

After synthesis is complete, regenerate `${PAI_DIR}/scratchpad/research/README.md` from session directories:

```bash
README_PATH="$HOME/.claude/scratchpad/research/README.md"
RESEARCH_DIR="$HOME/.claude/scratchpad/research"

# Always regenerate the entire README from session directories
cat > "$README_PATH" << 'HEADER'
# Research Sessions Index

Auto-updated after each research session.

## Sessions

| Session | Date | Topic | Agents | Status |
|---------|------|-------|--------|--------|
HEADER

# Scan all session directories and add rows (newest first)
for dir in $(ls -d "$RESEARCH_DIR"/[0-9]* 2>/dev/null | sort -r); do
  SESSION_ID=$(basename "$dir")

  # Parse date from session ID (format: YYYYMMDD-HHMMSS-PID)
  DATE_PART=$(echo "$SESSION_ID" | cut -c1-8)
  DATE=$(echo "$DATE_PART" | awk '{print substr($0,1,4) "-" substr($0,5,2) "-" substr($0,7,2)}')

  if [ -f "$dir/final-synthesis.md" ]; then
    # Extract topic from first header in synthesis
    TOPIC=$(head -20 "$dir/final-synthesis.md" | grep -E "^#[^#]" | head -1 | sed 's/^#* *//' | sed 's/ *$//')
    [ -z "$TOPIC" ] && TOPIC="(No title found)"

    # Count agents (Wave 1 + Wave 2)
    WAVE1_COUNT=$(ls "$dir/wave-1"/*.md 2>/dev/null | wc -l | tr -d ' ')
    WAVE2_COUNT=$(ls "$dir/wave-2"/*.md 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$((WAVE1_COUNT + WAVE2_COUNT))

    # Create row with clickable link
    echo "| [$SESSION_ID](./$SESSION_ID/final-synthesis.md) | $DATE | $TOPIC | $TOTAL | ✅ Complete |" >> "$README_PATH"
  else
    # Incomplete session - no link
    echo "| $SESSION_ID | $DATE | (Incomplete - no synthesis) | - | ⚠️ Partial |" >> "$README_PATH"
  fi
done

# Add footer
echo "" >> "$README_PATH"
echo "---" >> "$README_PATH"
echo "" >> "$README_PATH"
echo "*Last Updated: $(date +%Y-%m-%d)*" >> "$README_PATH"

echo "📋 Research index regenerated: $README_PATH"
```

**Index Format (M12):**
- Session ID: Directory name (e.g., `20251127-230707-6559`)
- Date: YYYY-MM-DD format
- Query/Topic: Short description extracted from synthesis header
- Agents: Count of agents used (Wave 1 + Wave 2)
- Status: ✅ Complete, ⚠️ Partial, or 📋 Legacy

**Index Location:** `${PAI_DIR}/scratchpad/research/README.md`

---

## 🔄 BENEFITS OF M13 ARCHITECTURE

**Why sub-command chaining is superior:**

### Context Efficiency
- ❌ **Old way:** 116KB command loaded into context before any work
- ✅ **New way:** Only ~3KB orchestrator + focused sub-commands (~10-20KB each)
- **Result:** ~75% reduction in context overhead per phase

### Fresh Context for Phases
- Each sub-command runs with focused instructions
- Sub-agents spawned get completely fresh context
- No context pollution between phases

### Modularity
- Individual phases can be re-run independently
- Easier to debug specific phase failures
- Can test phases in isolation

### Maintainability
- Changes to one phase don't require editing 3000+ line file
- Clear separation of concerns
- Each sub-command is self-documenting

---

## 📝 IMPLEMENTATION NOTES

**M13 Architecture (Command Splitting):**
- Orchestrator: This file (~500 lines)
- /_research-init: Query analysis, session setup (~450 lines)
- /_research-collect: Agent coordination, validation (~130 lines orchestrator)
  - /_research-collect-execute: Agent launching, pivot analysis (~1,270 lines)
  - /_research-collect-validate: Citation validation (~370 lines)
- /_research-synthesize: Citation pooling, synthesis (~600 lines)
- /_research-validate: Quality gates (~230 lines)

**Total: ~3,400 lines across 5 files vs. 3,104 in monolith**
(Slight increase due to headers/footers, but context load per phase is dramatically reduced)

**Key Insight:** My context doesn't clear between SlashCommand invocations, BUT sub-agents spawned via Task tool DO get fresh context. This is why /_research-collect and /_research-synthesize spawn sub-agents for heavy lifting.

---

**END OF ADAPTIVE RESEARCH ORCHESTRATOR (M13)**

**Status:** SPLIT ARCHITECTURE - Phases delegated to sub-commands
**Version:** M13 - Command Splitting (2025-11-28)
