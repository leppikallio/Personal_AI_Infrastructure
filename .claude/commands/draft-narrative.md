---
description: Draft Wodehouse-style narratives using the narrative-author/style-reviewer producer/approver loop. Handles scenes, full stories, and rewrites.
globs: ""
alwaysApply: false
---

# Draft Narrative - Producer/Approver Loop

**Purpose:** Produce high-quality Wodehouse-style narratives through iterative refinement.

**Agents Used:**
- `narrative-author` - Produces prose with baked-in style constraints
- `style-reviewer` - Validates against Wodehouse style and AI patterns

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

**WHY:** The style constraints are baked into agent system prompts. When you bypass agents, those constraints don't apply. You will introduce "unanimous", coffee references, victory laps, and every other pattern we're trying to prevent.

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

**Example response to user:**
```
The narrative-author agent is stuck and needs guidance:

[Paste the AUTHOR_STUCK content]

How should I proceed?
```

This is the escape valve for impossible situations. Use it.

**Modes:**
- `draft` - Create new narrative from source materials
- `rewrite` - Fix an existing story (e.g., eliminate AI patterns)

**Scope:**
- `scene` - Individual scene (~600 words, content-dependent)
- `story` - Full story with multiple scenes
- `headers` - Analyze and add sub-headers (##) and pacing breaks (---) to existing story
- `polish` - Light pass: minimal targeted fixes without rewriting (preserves structure, headers, breaks)

**Examples:**
- `/draft-narrative source:/path/to/notes.md output:/path/to/scene.md`
- `/draft-narrative rewrite:/path/to/bad-story.mdx output:/path/to/fixed.mdx`
- `/draft-narrative source:/path/to/outline.md output:/path/to/story.mdx scope:story max:5`
- `/draft-narrative source:/path/to/story.mdx scope:headers` (adds headers to existing story)
- `/draft-narrative rewrite:/path/to/story.mdx scope:polish` (light fixes, preserves structure)

---

## Input Arguments

Parse `$ARGUMENTS` for:

| Parameter | Format | Default | Description |
|-----------|--------|---------|-------------|
| `source:` | path | required | Source materials (notes, logs, outline) |
| `output:` | path | required | Where to write the narrative |
| `rewrite:` | path | - | Existing story to rewrite (replaces source:) |
| `scope:` | scene/story/headers/polish | scene | Scene, full story, headers-only, or light polish pass |
| `max:` | number | 3 | Maximum iterations before human escalation |
| `instructions:` | path | - | File with story-specific instructions for the author |
| `no-coffee:` | true/false | false | Nuclear option: ZERO coffee mentions allowed (for problematic stories) |

The `instructions:` parameter points to a file containing story-specific guidance that goes beyond style constraints. Use this for:
- Content to remove or refresh ("Remove all specific model names")
- Timeline updates ("Events now take place in November 2025")
- Section changes ("Drop the vendor comparison section")
- Technical updates ("Update API examples to v2 syntax")
- Any story-specific requirements not covered by style rules

**Examples:**
```
# Basic rewrite (style fixes only)
source:/path/to/notes.md output:/path/to/scene.mdx

# Rewrite with story-specific instructions
rewrite:/path/to/story.mdx output:/path/to/fixed.mdx instructions:/path/to/instructions.md

# Full story with custom instructions
source:/path/to/outline.md output:/path/to/story.mdx scope:story instructions:/path/to/instructions.md
```

**Example instructions file:**
```markdown
# Story-Specific Instructions

## Content Changes
- Remove all specific model names (GPT-4, Claude 3, etc.) - use generic "the model"
- Update dollar amounts to be vague ("significant cost" instead of "$47.50")
- Drop the section comparing vendor pricing

## Timeline
- Events now take place in "late autumn" instead of specific dates

## Technical Updates
- API v1 references should become v2
- The retry logic now uses jitter (reflect this if mentioned)
```

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

### Step 2: Launch Narrative Author (Iteration 1)

```typescript
Task({
  subagent_type: "narrative-author",
  model: "opus",
  description: "Narrative: Iteration 1",
  prompt: `
**NARRATIVE AUTHOR TASK**

You are the narrative-author agent. Your system prompt is in:
${PAI_DIR}/agents/narrative-author.md

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
4. If MODE is "rewrite", identify and fix all style issues
5. If MODE is "draft", create new narrative from source
6. Apply ALL constraints from your system prompt
7. If NO_COFFEE is true, use ZERO coffee references - choose alternative motifs
8. Write output to the specified path
9. Confirm completion

Remember: ZERO dramatic fragments, ZERO em-dashes, ALL Marvin dialogue in tags.

**PRIORITY:** Story-specific instructions control CONTENT changes (what to include/exclude,
what to update). Style constraints (fragmentation, em-dashes, vocabulary) are ABSOLUTE
and cannot be overridden by any instructions.
  `
})
```

### Step 3: Launch Style Reviewer

After narrative-author completes:

```typescript
Task({
  subagent_type: "style-reviewer",
  model: "sonnet",
  description: "Review: Iteration 1",
  prompt: `
**STYLE REVIEWER TASK**

You are the style-reviewer agent. Your system prompt is in:
${PAI_DIR}/agents/style-reviewer.md

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
- If yes, launch narrative-author again with feedback
- If no, escalate to human

### Step 5: Revision Loop (if needed)

For iterations 2+:

```typescript
Task({
  subagent_type: "narrative-author",
  model: "opus",
  description: "Narrative: Iteration ${N}",
  prompt: `
**NARRATIVE AUTHOR REVISION TASK**

You are the narrative-author agent.

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
5. If NO_COFFEE is true, use ZERO coffee references - choose alternative motifs
6. Apply fixes WITHOUT introducing new issues
7. Write revised draft
8. Confirm completion

**PRIORITY:** Reviewer feedback addresses STYLE issues. Story-specific instructions
address CONTENT. Both must be satisfied. Style constraints are ABSOLUTE.
  `
})
```

Then launch style-reviewer for iteration N.

Repeat until APPROVED or max iterations reached.

### Step 6: Completion

**On APPROVED:**
```bash
# Copy final draft to output
cp "${SESSION_DIR}/draft-iteration-${FINAL}.md" "${OUTPUT_PATH}"

# Update word count in frontmatter (tuonela-specific)
# This script counts only reader-visible words, stripping MDX components and formatting
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

## Headers Mode Workflow (scope:headers)

When `scope:headers` is specified, the workflow changes:

**Purpose:** Add sub-headers (##) and pacing breaks (---) to an existing story without modifying prose content.

**Key Constraints:**
- Story prose is 99% ready - headers must fit WITHOUT content edits
- Max 4 sub-headers for ~4000 word story (proportionally fewer for shorter)
- Headers must match Wodehouse narrative voice (evocative, wry, not tutorial-style)
- MDX frontmatter YAML (between opening ---) must be preserved untouched

### Headers Step 1: Launch Narrative Author (Analysis Mode)

```typescript
Task({
  subagent_type: "narrative-author",
  model: "opus",
  description: "Headers: Analysis",
  prompt: `
**NARRATIVE AUTHOR - HEADERS MODE**

You are the narrative-author agent in HEADERS ANALYSIS mode.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SCOPE: headers
- ITERATION: 1

**INPUT:**
- Story to analyze: ${SOURCE_PATH}

**OUTPUT:**
Write your analysis and edited story to: ${SESSION_DIR}/headers-iteration-1.md

**HEADERS MODE INSTRUCTIONS:**

1. Read the complete story
2. Identify the frontmatter (YAML between opening ---) and PRESERVE IT EXACTLY
3. Analyze narrative flow for natural break points
4. For each break point, decide:
   - Does this deserve a sub-header (##) or just a pacing break (---)?
   - Sub-headers: Major phase transitions, topic pivots, emotional shifts
   - Pacing breaks (---): Breathing room, minor shifts, keeping flow
5. Draft sub-header text that matches Wodehouse voice:
   - GOOD: Evocative, wry, self-deprecating ("Productive Capitulation", "The Six-Angle Test")
   - BAD: Tutorial voice ("Building the Validator"), textbook ("The Hallucination Problem")
   - BAD: Too flat/generic ("The Fix", "The Test")
6. Insert headers/breaks at identified locations
7. Write the COMPLETE edited story with headers inserted

**CRITICAL CONSTRAINTS:**
- Do NOT modify any prose content - only INSERT headers and --- breaks
- Do NOT add headers inside dialogue exchanges
- Do NOT exceed 4 sub-headers for ~4000 words (proportionally less for shorter stories)
- Do NOT count frontmatter --- as content breaks
- PRESERVE all MDX components exactly

**OUTPUT FORMAT:**
Write the complete story with headers inserted, preceded by a brief analysis section:

\`\`\`
## Headers Analysis

### Break Points Identified:
1. Line ~X: [Reason] → ## [Header Text] or ---
2. Line ~Y: [Reason] → ## [Header Text] or ---
...

### Rationale:
[Brief explanation of header choices and voice matching]

---

[COMPLETE STORY WITH HEADERS INSERTED]
\`\`\`
  `
})
```

### Headers Step 2: Launch Style Reviewer (Headers Mode)

```typescript
Task({
  subagent_type: "style-reviewer",
  model: "sonnet",
  description: "Headers Review: Iteration 1",
  prompt: `
**STYLE REVIEWER - HEADERS MODE**

You are the style-reviewer agent reviewing HEADERS specifically.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- ITERATION: 1
- MAX_ITERATIONS: ${MAX_ITERATIONS}

**INPUT:**
- Headers analysis: ${SESSION_DIR}/headers-iteration-1.md

**OUTPUT:**
Write your review to: ${SESSION_DIR}/headers-review-1.md

**HEADERS MODE REVIEW CRITERIA:**

1. **Header Voice Check** (CRITICAL)
   - Do headers match Wodehouse narrative voice?
   - Are they evocative and wry, not tutorial-style?
   - FAIL examples: "Building X", "The Y Problem", "How to Z"
   - PASS examples: "Productive Capitulation", "The Six-Angle Test", "Three Seconds to Think"

2. **Density Check**
   - Is header count proportional to word count? (~1 per 1000 words max)
   - Are headers spaced adequately (not clustered)?

3. **Placement Check**
   - Are headers at natural phase transitions?
   - Do they avoid breaking dialogue flow?
   - Is frontmatter preserved?

4. **Break Type Check**
   - Are major transitions marked with headers, minor with ---?
   - Are there too many --- breaks (over-segmented)?

**OUTPUT FORMAT:**

If headers pass voice and placement checks:
\`\`\`
VERDICT: APPROVED

[Quality metrics table]
[Summary]
\`\`\`

If headers need revision:
\`\`\`
VERDICT: REVISIONS REQUIRED

## Header Issues:

### 1. [Header Text] at Line X
**Problem:** [Why it fails - tutorial voice, too generic, etc.]
**Suggested Fix:** [Better header text that matches voice]

...

## Summary
[Number] of [total] headers need voice revision.
\`\`\`
  `
})
```

### Headers Step 3: Iterate Until Approved

Same iteration logic as main workflow. If APPROVED, extract the story portion (after the analysis section) and write to OUTPUT_PATH.

---

## Polish Mode Workflow (scope:polish)

When `scope:polish` is specified, the workflow is designed for **minimal targeted fixes** on stories that have already been edited (headers added, structure finalized, etc.).

**Purpose:** Apply style constraint fixes (dialogue attribution, specific vocabulary, etc.) without rewriting prose or changing structure.

**Key Constraints:**
- Preserve ALL structural elements: headers (##), pacing breaks (---), MDX components
- Preserve paragraph structure - don't combine or split paragraphs
- Only modify specific phrases/sentences that violate style constraints
- Think "find and replace with context awareness" not "rewrite"

### Polish Step 1: Launch Narrative Author (Polish Mode)

```typescript
Task({
  subagent_type: "narrative-author",
  model: "opus",
  description: "Polish: Targeted fixes",
  prompt: `
**NARRATIVE AUTHOR - POLISH MODE**

You are the narrative-author agent in POLISH MODE.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- SCOPE: polish
- ITERATION: 1

**INPUT:**
- Story to polish: ${SOURCE_PATH}

**OUTPUT:**
Write your polished story to: ${SESSION_DIR}/polish-iteration-1.md

**POLISH MODE INSTRUCTIONS - MINIMAL VIABLE FIXES:**

This is a LIGHT PASS. The story has already been edited (headers, breaks, structure).
Your job is surgical fixes, NOT rewriting.

**WHAT TO FIX (targeted changes only):**
1. **Dialogue attribution** - Replace "I said"/"Marvin said" with action beats
2. **Specific banned vocabulary** - Swap individual words (delve → explore, etc.)
3. **Specific banned phrases** - Reword individual sentences
4. **Em-dashes** - Replace with commas/parentheses
5. **Missing Marvin tags** - Add where needed

**WHAT TO PRESERVE (do not touch):**
- All ## headers (text and placement)
- All --- pacing breaks
- All MDX components (<Marvin>, <FloatImage>, <EditorNote>, etc.)
- Frontmatter (YAML between opening ---)
- Paragraph structure (don't combine or split)
- Overall flow and voice (don't rewrite for "better" phrasing)
- Motifs (don't replace coffee with dawn unless fixing overuse)

**THE PHILOSOPHY:**
Imagine you're doing a "find with context" pass, not a rewrite.
If a sentence says '"That makes sense," I said.' you change it to
'"That makes sense." I pulled up the dashboard.' - but you don't
touch the sentences before or after it.

**OUTPUT FORMAT:**

First, provide a brief summary of fixes made:

\`\`\`
## Polish Summary

### Fixes Applied:
1. Line ~X: Replaced "I said" with action beat
2. Line ~Y: Removed em-dash, used comma
3. Line ~Z: Added missing <Marvin> tag
...

### Unchanged (no issues found):
- Headers: preserved
- Structure: preserved
- [Any areas that needed no changes]

---

[COMPLETE POLISHED STORY]
\`\`\`
  `
})
```

### Polish Step 2: Launch Style Reviewer (Polish Mode)

```typescript
Task({
  subagent_type: "style-reviewer",
  model: "sonnet",
  description: "Polish Review: Iteration 1",
  prompt: `
**STYLE REVIEWER - POLISH MODE**

You are the style-reviewer agent reviewing a POLISH pass.

**SESSION CONTEXT:**
- SESSION_DIR: ${SESSION_DIR}
- ITERATION: 1
- MAX_ITERATIONS: ${MAX_ITERATIONS}

**INPUT:**
- Polish output: ${SESSION_DIR}/polish-iteration-1.md

**OUTPUT:**
Write your review to: ${SESSION_DIR}/polish-review-1.md

**POLISH MODE REVIEW - DUAL CHECK:**

You're checking TWO things:

**1. Style Fixes Applied (standard checks):**
- Were dialogue attribution issues fixed?
- Were em-dashes removed?
- Were banned vocabulary/phrases addressed?
- Are Marvin tags correct?

**2. Structure Preserved (critical for polish mode):**
- Are ALL ## headers intact and unchanged?
- Are ALL --- breaks in same locations?
- Are paragraphs the same structure (not combined/split)?
- Is frontmatter preserved exactly?
- Are MDX components preserved?

**FAIL CONDITIONS:**
- Any remaining style violations (standard)
- Any structural changes that weren't necessary for fixes

**OUTPUT FORMAT:**

\`\`\`
# Polish Review - Iteration [N]

## Status: [APPROVED / REVISIONS REQUIRED]

### Style Fixes Check
| Issue Type | Fixed | Remaining |
|------------|-------|-----------|
| Dialogue Attribution | X fixed | Y remaining |
| Em-Dashes | X fixed | Y remaining |
| Vocabulary | X fixed | Y remaining |
...

### Structure Preservation Check
| Element | Status |
|---------|--------|
| Headers | PRESERVED / MODIFIED (FAIL) |
| Breaks | PRESERVED / MODIFIED (FAIL) |
| Paragraphs | PRESERVED / MODIFIED (FAIL) |
| Frontmatter | PRESERVED / MODIFIED (FAIL) |
| MDX Components | PRESERVED / MODIFIED (FAIL) |

### Issues Found (if any)
...

VERDICT: [APPROVED / REVISIONS REQUIRED]
\`\`\`
  `
})
```

### Polish Step 3: Iterate or Complete

Same iteration logic as main workflow. On APPROVED, write polished story to OUTPUT_PATH.

---

## Output Summary

After completion, report:

```markdown
## Narrative Draft Complete

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

**Version:** 1.5 - Draft Narrative Command (2026-01-04) - Added scope:polish mode for minimal targeted fixes
