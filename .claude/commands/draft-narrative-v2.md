---
description: Single-pass Wodehouse narrative drafting. Produces publication-ready output including headers, attribution fixes, and all polish in ONE pass. Uses narrative-author-v2/style-reviewer-v2 producer/approver loop.
globs: ""
alwaysApply: false
---

# Draft Narrative v2 - Single-Pass Producer/Approver Loop

**Purpose:** Produce publication-ready Wodehouse-style narratives in ONE pass. No separate headers mode. No separate polish mode. Rewrite means "make this ready to publish."

**Agents Used:**
- `narrative-author-v2` - Produces prose with baked-in style constraints, includes headers and attribution fixes
- `style-reviewer-v2` - Validates against Wodehouse style, AI patterns, AND header voice

---

## ORCHESTRATOR CONSTRAINTS (CRITICAL)

**YOU (the orchestrator) are FORBIDDEN from writing narrative content directly.**

If agents fail to write files:
1. Report the failure
2. Retry the agent with explicit "You MUST use the Write tool" instruction
3. If still failing after 2 retries, STOP and report to user

**YOU MUST NEVER:**
- Write draft content yourself to "help" when agents fail
- Fix agent output by editing it directly
- Bypass the producer/approver loop

**WHY:** The style constraints are baked into agent system prompts. When you bypass agents, those constraints don't apply. You will introduce dramatic fragments, tutorial headers, and every other pattern we're trying to prevent.

**The rule:** Agents write content. You orchestrate. Never cross that line.

---

## HANDLING AGENT STUCK STATE

If a draft file starts with `AUTHOR_STUCK:`, the agent is paralyzed by constraint conflicts.

**DO NOT:**
- Try to resolve it yourself
- Write the content yourself
- Dismiss it and retry

**DO:**
1. Read the AUTHOR_STUCK explanation
2. Report to the user immediately with the agent's specific questions
3. Wait for user guidance before continuing

---

## Modes and Scope

**Modes:**
- `draft` - Create new narrative from source materials
- `rewrite` - Transform existing story to publication-ready (includes headers, attribution, everything)

**Scope:**
- `scene` - Individual scene (~600 words, content-dependent)
- `story` - Full story with multiple scenes (includes headers)

**NOTE:** No `headers` or `polish` scopes in v2. Rewrite mode produces publication-ready output with headers, attribution fixes, and all polish in ONE pass.

**Examples:**
- `/draft-narrative-v2 source:/path/to/notes.md output:/path/to/scene.md`
- `/draft-narrative-v2 rewrite:/path/to/bad-story.mdx output:/path/to/fixed.mdx`
- `/draft-narrative-v2 source:/path/to/outline.md output:/path/to/story.mdx scope:story max:5`

---

## Input Arguments

Parse `$ARGUMENTS` for:

| Parameter | Format | Default | Description |
|-----------|--------|---------|-------------|
| `source:` | path | required | Source materials (notes, logs, outline) |
| `output:` | path | required | Where to write the narrative |
| `rewrite:` | path | - | Existing story to rewrite (replaces source:) |
| `scope:` | scene/story | scene | Scene or full story |
| `max:` | number | 3 | Maximum iterations before human escalation |
| `instructions:` | path | - | File with story-specific instructions for the author |
| `no-coffee:` | true/false | false | Nuclear option: ZERO coffee mentions allowed |

The `instructions:` parameter points to a file containing story-specific guidance that goes beyond style constraints. Use this for:
- Content to remove or refresh ("Remove all specific model names")
- Timeline updates ("Events now take place in November 2025")
- Section changes ("Drop the vendor comparison section")
- Technical updates ("Update API examples to v2 syntax")

---

## Execution Workflow

### Step 0: Initialize Session

```bash
SESSION_ID=$(date +%Y%m%d-%H%M%S)-$RANDOM
SESSION_DIR=${PAI_DIR}/scratchpad/narrative-sessions/$SESSION_ID
mkdir -p "$SESSION_DIR"
echo "Narrative session initialized: $SESSION_DIR"
```

This session directory holds:
- Draft iterations
- Review feedback files
- Final output

### Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- `SOURCE_PATH` - From `source:` or `rewrite:` parameter
- `OUTPUT_PATH` - From `output:` parameter
- `MODE` - "draft" if `source:`, "rewrite" if `rewrite:`
- `SCOPE` - From `scope:` (default: "scene")
- `MAX_ITERATIONS` - From `max:` (default: 3)
- `INSTRUCTIONS_PATH` - From `instructions:` (optional)
- `NO_COFFEE` - From `no-coffee:` (default: false)

Validate:
- Source/rewrite file exists
- Output directory exists
- Max iterations is 1-10
- If instructions: provided, file exists

### Step 2: Launch Narrative Author v2 (Iteration 1)

```typescript
Task({
  subagent_type: "narrative-author-v2",
  model: "opus",
  description: "Narrative v2: Iteration 1",
  prompt: `
**NARRATIVE AUTHOR v2 TASK**

You are the narrative-author-v2 agent. Your system prompt is in:
${PAI_DIR}/agents/narrative-author-v2.md

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- ITERATION: 1

**INPUT:**
- Mode: ${MODE}
- Scope: ${SCOPE}
- Source: ${SOURCE_PATH}
- Story-specific instructions: ${INSTRUCTIONS_PATH || "None"}
- No-coffee mode: ${NO_COFFEE}

**OUTPUT:**
Write your draft to: ${SESSION_DIR}/draft-iteration-1.md

**INSTRUCTIONS:**
1. Load PAI.md first (mandatory)
2. Read the source materials at ${SOURCE_PATH}
3. If story-specific instructions provided, read and apply them
4. If MODE is "rewrite":
   - Read and map the story (understand perspective, note facts)
   - Plan headers at phase transitions (chapter-title voice)
   - Rewrite with ALL fixes applied (fragmentation, em-dashes, vocabulary, attribution, headers)
   - Update title/excerpt if generic or mismatched
5. If MODE is "draft", create new narrative from source (include headers for story scope)
6. Apply ALL constraints from your system prompt
7. If NO_COFFEE is true, use ZERO coffee references - choose alternative motifs
8. Write output to the specified path
9. Confirm completion

**v2 CRITICAL:**
- ONE pass produces publication-ready output
- Headers are chapter titles (evocative, wry) NOT section labels (tutorial)
- Attribution uses action beats, not "I said"/"Marvin said"
- All polish happens NOW, not in a separate pass

Remember: ZERO dramatic fragments, ZERO em-dashes, ALL Marvin dialogue in tags, CHAPTER-TITLE headers.

**PRIORITY:** Story-specific instructions control CONTENT changes (what to include/exclude,
what to update). Style constraints (fragmentation, em-dashes, vocabulary, header voice) are ABSOLUTE
and cannot be overridden by any instructions.
  `
})
```

### Step 3: Launch Style Reviewer v2

After narrative-author-v2 completes:

```typescript
Task({
  subagent_type: "style-reviewer-v2",
  model: "sonnet",
  description: "Review v2: Iteration 1",
  prompt: `
**STYLE REVIEWER v2 TASK**

You are the style-reviewer-v2 agent. Your system prompt is in:
${PAI_DIR}/agents/style-reviewer-v2.md

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SESSION_ID: ${SESSION_ID}
- ITERATION: 1
- MAX_ITERATIONS: ${MAX_ITERATIONS}
- No-coffee mode: ${NO_COFFEE}

**INPUT:**
- Draft to review: ${SESSION_DIR}/draft-iteration-1.md

**OUTPUT:**
Write your review to: ${SESSION_DIR}/review-iteration-1.md

**INSTRUCTIONS:**
1. Load PAI.md first (mandatory)
2. Read the draft
3. Check ALL constraints:
   - Dramatic fragmentation (single-sentence paragraphs)
   - Em-dashes (any instance)
   - AI vocabulary and phrases
   - Marvin tag compliance
   - Coffee motif (default: max 1; if NO_COFFEE: ANY = CRITICAL FAILURE)
   - Wodehouse flow
   - **Header voice** (chapter titles, not tutorial sections)
   - **Header density** (~1 per 1000 words)
   - **Dialogue attribution** (action beats, not "said")
4. Write structured review with VERDICT
5. If REVISIONS REQUIRED, provide specific fixes

Return VERDICT: APPROVED or REVISIONS REQUIRED
  `
})
```

### Step 4: Check Verdict and Iterate

Read the review file and parse the VERDICT.

**If APPROVED:**
- Copy final draft to OUTPUT_PATH
- Report success with iteration count
- Clean up session directory

**If REVISIONS REQUIRED:**
- Check if iteration < MAX_ITERATIONS
- If yes, launch narrative-author-v2 again with feedback
- If no, escalate to human

### Step 5: Revision Loop (if needed)

For iterations 2+:

```typescript
Task({
  subagent_type: "narrative-author-v2",
  model: "opus",
  description: "Narrative v2: Iteration ${N}",
  prompt: `
**NARRATIVE AUTHOR v2 REVISION TASK**

You are the narrative-author-v2 agent.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- ITERATION: ${N}

**INPUT:**
- Previous draft: ${SESSION_DIR}/draft-iteration-${N-1}.md
- Reviewer feedback: ${SESSION_DIR}/review-iteration-${N-1}.md
- Story-specific instructions: ${INSTRUCTIONS_PATH || "None"}
- No-coffee mode: ${NO_COFFEE}

**OUTPUT:**
Write revised draft to: ${SESSION_DIR}/draft-iteration-${N}.md

**INSTRUCTIONS:**
1. Load PAI.md first (mandatory)
2. Read the reviewer feedback
3. Address EVERY issue listed
4. If story-specific instructions exist, ensure they're still applied
5. If NO_COFFEE is true, use ZERO coffee references
6. Apply fixes WITHOUT introducing new issues
7. Preserve header voice (chapter titles) and density
8. Maintain action beat attribution
9. Write revised draft
10. Confirm completion

**PRIORITY:** Reviewer feedback addresses STYLE issues. Story-specific instructions
address CONTENT. Both must be satisfied. Style constraints are ABSOLUTE.
  `
})
```

Then launch style-reviewer-v2 for iteration N.

Repeat until APPROVED or max iterations reached.

### Step 6: Completion

**On APPROVED:**
```bash
# Copy final draft to output
cp "${SESSION_DIR}/draft-iteration-${FINAL}.md" "${OUTPUT_PATH}"

# Update word count in frontmatter (tuonela-specific)
if [[ "${OUTPUT_PATH}" == *"tuonela-private"* ]]; then
  bun ~/Projects/tuonela-private/scripts/update-word-counts.ts "${OUTPUT_PATH}"
fi

echo "Narrative complete: ${OUTPUT_PATH}"
echo "Iterations: ${FINAL}"
echo "Session: ${SESSION_DIR}"
```

**On MAX ITERATIONS REACHED:**
```
ESCALATION REQUIRED

The narrative did not pass style review after ${MAX_ITERATIONS} iterations.

Remaining issues (from final review):
[List issues from final review file]

The best draft is at: ${SESSION_DIR}/draft-iteration-${MAX}.md
The final review is at: ${SESSION_DIR}/review-iteration-${MAX}.md

Recommendation: Manual review and revision needed.
```

---

## Output Summary

After completion, report:

```markdown
## Narrative Draft Complete (v2)

**Mode:** ${MODE}
**Scope:** ${SCOPE}
**Iterations:** ${FINAL_ITERATION}
**Status:** ${APPROVED or ESCALATED}

**Output:** ${OUTPUT_PATH}
**Session:** ${SESSION_DIR}

### Quality Metrics (Final)
- Dramatic Fragments: 0
- Em-Dashes: 0
- AI Vocabulary: 0
- Marvin Tags: Complete
- Header Voice: Chapter-title style
- Header Density: Appropriate
- Dialogue Attribution: Action beats
- Word Count: [updated via script]

[Link to output file]
```

---

## Cleanup

After successful completion:
```bash
# Keep session for audit trail, or clean up:
# rm -rf "${SESSION_DIR}"
```

Session directories are kept by default for debugging.

---

**Version:** 2.0 - Draft Narrative Command (2026-01-05) - Single-pass rewrite (no separate headers/polish modes)
