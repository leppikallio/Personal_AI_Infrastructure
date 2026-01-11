# Narrative Writing System

A producer/approver loop for generating Wodehouse-style blog narratives with enforced style constraints.

## Overview

The narrative writing system solves a persistent problem: AI agents ignore style guidelines and fall back to AI writing patterns (dramatic fragmentation, em-dashes, hedging vocabulary). This system enforces constraints through:

1. **Baked-in constraints** - Style rules in agent system prompts, not referenced skills
2. **Producer/approver loop** - Iterative refinement until style compliance
3. **Explicit failure conditions** - Violations trigger revision, not warnings

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     /draft-narrative                             │
│                      (Orchestrator)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │                  │         │                  │              │
│  │ narrative-author │ ──────▶ │  style-reviewer  │              │
│  │    (Producer)    │         │   (Approver)     │              │
│  │                  │         │                  │              │
│  └──────────────────┘         └──────────────────┘              │
│          ▲                            │                          │
│          │                            │                          │
│          │    REVISIONS REQUIRED      │                          │
│          └────────────────────────────┘                          │
│                                                                  │
│                       ▼ APPROVED                                 │
│                                                                  │
│               ┌──────────────────┐                               │
│               │   Final Output   │                               │
│               └──────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. narrative-author Agent

**Location:** `/Users/zuul/Projects/PAI/.claude/agents/narrative-author.md`

**Persona:** Best-selling author with extensive experience in narrative writing. Specialty is modern Wodehouse homage: witty, elaborate, self-deprecating humor with momentum.

**Purpose:** Produces Wodehouse-style prose with baked-in style constraints.

**Model:** Opus (for nuanced prose generation)

**Allowed Tools:** Read, Write, Edit, Glob, Grep

**Additional Responsibilities:**
- Update title if it doesn't fit the content
- Rewrite excerpt to hook readers and reflect actual story content
- Excerpts must be specific and engaging, never generic

**Key Constraints (ABSOLUTE - violations cause revision):**

| Constraint | Rule | Example |
|------------|------|---------|
| Dramatic Fragmentation | ZERO single-sentence emphasis paragraphs | "The seams were there. / But they were livable." → FAIL |
| Em-Dashes | ZERO instances of —, –, or spaced hyphens | "The code—surprisingly—worked" → FAIL |
| AI Vocabulary | ZERO banned words | delve, tapestry, intricacies, multifaceted, holistic, paradigm, synergy, leverage, pivotal, foster, crucial, enhance, robust, nuanced, noteworthy, remarkable, notably, particularly |
| AI Phrases | ZERO banned phrases | "It's worth noting", "One might argue", "not only X but also Y", "In conclusion" |
| Light Prose | Avoid heavy, formal vocabulary | "unanimous" → "all agreed", "subsequently" → "then" |
| Marvin Tags | ALL Marvin dialogue in `<Marvin></Marvin>` tags | `<Marvin>"The implementation looks solid,"</Marvin> Marvin observed.` |
| Marvin Voice | Marvin NEVER says "Sir" or servant language | `<Marvin>"Indeed, sir."</Marvin>` → FAIL |

**Wodehouse Style (what TO do):**
- Every content paragraph has 3+ flowing sentences
- Use nested clauses and digressions that circle back
- Build momentum through coordinating conjunctions (and, but, which, though)
- Self-deprecation flows into next thought, not isolated
- Humor comes from the journey, not dramatic pauses

### 2. style-reviewer Agent

**Location:** `/Users/zuul/Projects/PAI/.claude/agents/style-reviewer.md`

**Persona:** Experienced Editor-in-Chief with decades of success in publishing. Knows exactly how good content reads and what pleases a reading audience. Has an unfailing eye for prose that sings versus prose that stumbles.

**Purpose:** Validates prose against Wodehouse style and AI pattern detection.

**Model:** Sonnet (sufficient for pattern detection)

**Allowed Tools:** Read, Write, Glob, Grep (no Edit - review only)

**Critical Requirement:** MUST write complete review to markdown file. Orchestrator reads this file to determine next steps. Summary-only responses break the loop.

**Review Criteria:**

| Check | Method | Failure Condition |
|-------|--------|-------------------|
| Dramatic Fragments | Manual scan + grep | Any single-sentence emphasis paragraph |
| Em-Dashes | Grep for `—\|–\| - ` | Any instance |
| AI Vocabulary | Grep for banned words | Any instance of dead giveaways; 2+ per 1000 words of high-frequency |
| AI Phrases | Grep for banned phrases | Any instance |
| Marvin Tags | Grep for untagged dialogue | Any Marvin dialogue without tags |
| Phrase Repetition | Grep + count | "which is to say" 2+, "apparently" 3+, distinctive phrase 3+ (WARNING) |
| **Coffee/Motif Overuse** | Grep for "coffee" | **2+ coffee mentions = CRITICAL FAILURE** (max 1 per story; 0 if no-coffee mode) |
| **Setting Anachronisms** | Grep for "butler", "valet", "manor", "wine" (service) | **Any instance = CRITICAL FAILURE** (modern tech, not Edwardian England) |
| **Marvin saying "Sir"** | Grep for "Sir" in `<Marvin>` tags | **Any instance = CRITICAL FAILURE** (Marvin is an equal, not a servant) |
| **Heavy Vocabulary** | Grep for "unanimous", "subsequently", etc. | **WARNING** - use lighter alternatives |
| **Victory/DevOps Heroics** | Grep for "small victories", "twenty hours", exhaustion tropes | **Any instance = CRITICAL FAILURE** |
| **Motif Obsession** | Count any motif appearing 3+ times | **3+ = WARNING, climax usage = CRITICAL FAILURE** |
| Wodehouse Flow | Manual assessment | Paragraphs don't rollick, lack momentum |

**Output Format:**
- `VERDICT: APPROVED` - Draft passes all checks
- `VERDICT: REVISIONS REQUIRED` - Structured feedback with specific fixes

### 3. /draft-narrative Command

**Location:** `/Users/zuul/Projects/PAI/.claude/commands/draft-narrative.md`

**Purpose:** Orchestrates the producer/approver loop.

**Parameters:**

| Parameter | Format | Default | Description |
|-----------|--------|---------|-------------|
| `source:` | path | required | Source materials (notes, logs, outline) |
| `output:` | path | required | Where to write the narrative |
| `rewrite:` | path | - | Existing story to rewrite (replaces source:) |
| `scope:` | scene/story/headers | scene | Scene, full story, or headers-only pass |
| `max:` | number | 3 | Maximum iterations before human escalation |
| `instructions:` | path | - | File with story-specific instructions |
| `no-coffee:` | true/false | false | Nuclear option: ZERO coffee mentions allowed |

**Usage Examples:**

```bash
# Create new scene from source materials
/draft-narrative source:/path/to/notes.md output:/path/to/scene.mdx

# Rewrite existing story (style fixes only)
/draft-narrative rewrite:/path/to/story.mdx output:/path/to/fixed.mdx

# Rewrite with story-specific instructions
/draft-narrative rewrite:/path/to/story.mdx output:/path/to/fixed.mdx instructions:/path/to/instructions.md

# Full story with custom scope and iterations
/draft-narrative source:/path/to/outline.md output:/path/to/story.mdx scope:story max:5

# Nuclear no-coffee mode (for problematic stories)
/draft-narrative rewrite:/path/to/story.mdx output:/path/to/fixed.mdx no-coffee:true

# Add sub-headers to existing story (headers mode)
/draft-narrative source:/path/to/story.mdx scope:headers output:/path/to/with-headers.mdx
```

### 4. Transformation Samples

**Location:** `/Users/zuul/Projects/PAI/.claude/skills/NarrativeWriting/samples/`

**Purpose:** Show how to transform technical materials into Wodehouse prose.

**Sample Structure:**
1. **Raw Material** - Actual source (session log, technical notes)
2. **Transformation Notes** - What to extract, emotional arc, Wodehouse elements
3. **Final Scene** - Complete Wodehouse output
4. **Checklist** - Verification that all constraints are met

## Story-Specific Instructions

When rewriting stories, you can pass content-specific guidance via an instructions file:

**Example instructions file:**
```markdown
# Story-Specific Instructions

## Content Changes
- Remove all specific model names (GPT-4, Claude 3) - use "the model"
- Update dollar amounts to be vague ("significant cost" instead of "$47.50")
- Drop the section comparing vendor pricing

## Timeline
- Events now take place in "late autumn" instead of specific dates

## Technical Updates
- API v1 references should become v2
- The retry logic now uses jitter (reflect this if mentioned)
```

**Priority Hierarchy:**
1. **Style constraints** - ABSOLUTE, cannot be overridden by any instructions
2. **Story-specific instructions** - Control CONTENT changes
3. **Reviewer feedback** - Addresses style issues found in each iteration

## Characters

### Petteri (Narrator/Developer)
- First-person voice, NO tags
- Enthusiastic, occasionally overconfident
- Owns mistakes cheerfully, not miserably
- Self-deprecating but not incompetent
- Inspired by Bertie Wooster

### Marvin (AI Assistant)
- ALL dialogue in `<Marvin></Marvin>` tags
- Quietly competent, diplomatic
- Delivers bad news with tact: "There is one small matter..."
- Dry wit, never smug
- Often gets the last word
- Inspired by Jeeves

## Scene Types

### Mistake/Fumble
1. Open with overconfidence: "I was rather pleased with myself..."
2. Marvin delivers bad news diplomatically
3. Petteri realizes the error
4. Self-deprecating acceptance, not despair
5. End with dry wit (often Marvin's)

### Success/Insight
1. Show the temptation of the wrong choice
2. Marvin guides without overriding
3. Petteri makes the right call
4. Light self-deprecation: "It wouldn't last, of course"

### Problem-Solving
1. Collaborative back-and-forth
2. Neither character "wins" alone
3. Build on each other's ideas
4. End with broader insight or principle

## Common Anti-Patterns

### The Magazine Essay (WRONG)
```
In software terms, that's not a transient failure.

That's a problem with your assumptions.
```

**Fixed (Wodehouse flow):**
```
In software terms, that's not a transient failure but a problem
with your assumptions, the kind that makes you wonder what else
you've been confidently wrong about.
```

### The Echo Fragment (WRONG)
```
"Quality does not equal coverage."

"Quality does not equal coverage."
```

**Fixed:**
```
"Quality does not equal coverage," I said, and we sat with that
for a moment, the implications settling like sediment.
```

### The Rhetorical Break (WRONG)
```
What could possibly go wrong?

Everything, as it turned out.
```

**Fixed:**
```
What could possibly go wrong? Everything, as it turned out,
though not in the order I might have predicted.
```

### The Untagged Marvin (WRONG)
```
"The implementation appears stable," Marvin noted.
```

**Fixed:**
```
<Marvin>"The implementation appears stable,"</Marvin> Marvin noted.
```

## Workflow

### New Story Creation
1. Prepare source materials (session logs, notes, outline)
2. Run `/draft-narrative source:/path/to/materials.md output:/path/to/story.mdx`
3. System iterates until APPROVED or max iterations
4. Review final output

### Story Rewrite

**CRITICAL: Rewrite mode changes HOW the story is told, not WHAT it's about.**

Stories have three layers with different preservation rules:

**LAYER 1: PERSPECTIVE (ABSOLUTELY FIXED)**
- What moment this captures in the development journey
- What the narrative arc is (fumble → recovery, etc.)
- What insight emerges
- Whose viewpoint dominates

The story's perspective comes from the existing story, not from sources. Many stories have minimal `sources:` frontmatter - that doesn't mean you can reimagine them.

**LAYER 2: FACTS (PRESERVE)**
- Technical details: Error messages, what broke/fixed
- Events: What happened in what order
- Discoveries: What characters learned
- Dialogue substance: What was communicated
- MDX components: FloatImage, frontmatter, etc.

**LAYER 3: PROSE (FREELY REWRITE)**
- Motifs and metaphors → CUT or replace (once only)
- Transitional prose → rewrite for flow
- Padding/decoration → CUT freely
- Word count → NO TARGET

**The agent fixes:**
- Dramatic fragmentation → flowing paragraphs
- Em-dashes → commas, parentheses, restructure
- AI vocabulary → natural alternatives
- Missing `<Marvin>` tags → add them
- Motif obsession → CUT (don't replace with new obsession)

**The agent CANNOT change:**
- The story's subject matter
- The story's narrative arc
- The insight or lesson
- Which events are central vs. peripheral

**Workflow:**
1. Identify story with style issues
2. Optionally create instructions file for content changes
3. Run `/draft-narrative rewrite:/path/to/story.mdx output:/path/to/fixed.mdx instructions:/path/to/instructions.md`
4. System fixes style while preserving perspective and facts
5. Review final output

**Rule: Perspective is fixed. Facts are preserved. Prose is free.**

### Headers Mode (Adding Sub-Headers)

**Purpose:** Add sub-headers (##) and pacing breaks (---) to an existing story without modifying prose content.

**When to Use:**
- Story prose is 99% ready
- Need to improve navigation and readability
- Want to mark major phase transitions

**Key Constraints:**
- **Content Preservation (ABSOLUTE):** Do NOT modify any prose content
- **Frontmatter Preservation:** MDX YAML frontmatter must be preserved exactly
- **Header Density:** Max 4 sub-headers for ~4000 words (~1 per 1000 words)
- **Header Voice:** Must match Wodehouse narrative voice

**Header Voice Guidelines:**

| Type | Examples | Status |
|------|----------|--------|
| **GOOD (evocative, wry)** | "Productive Capitulation", "The Six-Angle Test", "Three Seconds to Think" | PASS |
| **BAD (tutorial voice)** | "Building the Validator", "The Hallucination Problem", "How to Fix X" | FAIL |
| **BAD (too generic)** | "The Fix", "The Test", "The Solution", "Moving Forward" | FAIL |

**The Test:** Would a Wodehouse narrator use this as a chapter title? If it sounds like a technical manual, it fails.

**Placement Rules:**
- Use `##` for major phase transitions (problem → solution, discovery → implementation)
- Use `---` for minor shifts within same phase (breathing room only)
- Never break dialogue exchanges with headers
- Never place headers in last ~10% of story

**Workflow:**
1. Run `/draft-narrative source:/path/to/story.mdx scope:headers output:/path/to/with-headers.mdx`
2. narrative-author analyzes story and proposes headers with evocative text
3. style-reviewer validates header voice matches Wodehouse (not tutorial/textbook)
4. Iteration continues until headers pass voice check
5. Final output contains story with headers inserted

**Style Reviewer - Headers Mode Checks:**

| Check | Failure Condition |
|-------|-------------------|
| Header Voice | Tutorial voice, too generic, or academic |
| Density | More headers than proportional limit, or clustered |
| Placement | Mid-dialogue, breaking flow, or in last 10% |
| Content Preservation | Any prose modified (not just headers inserted) |

**Note:** In headers mode, the style-reviewer does NOT check prose style issues (fragmentation, em-dashes, etc.) - only the headers themselves.

### Manual Intervention
If max iterations reached without approval:
1. System reports remaining issues
2. Best draft available in session directory
3. Final review available for reference
4. Manual editing required for unresolved issues

## Session Management

Each run creates a session directory:
```
${PAI_DIR}/scratchpad/narrative-sessions/{SESSION_ID}/
├── draft-iteration-1.md
├── review-iteration-1.md
├── draft-iteration-2.md  (if needed)
├── review-iteration-2.md (if needed)
└── ...
```

Sessions are kept for debugging and audit trails.

## Quality Metrics

Quality is measured by **style compliance**, NOT word count:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dramatic Fragments | 0 | Count of single-sentence emphasis paragraphs |
| Em-Dashes | 0 | Count of —, –, spaced hyphens |
| AI Vocabulary | 0 | Count of banned words |
| AI Phrases | 0 | Count of banned phrases |
| Marvin Tags | Complete | All Marvin dialogue tagged |
| Marvin Voice | 0 | No "Sir" or servant language in Marvin dialogue |
| Coffee Motif | ≤1 (or 0) | Max 1 mention; 0 if no-coffee mode |
| Setting Anachronisms | 0 | No butler/valet/manor/wine references |
| Heavy Vocabulary | 0 | No "unanimous", "subsequently", etc. |
| Victory/DevOps Heroics | 0 | No "small victories", exhaustion tropes, victory laps |
| Motif Obsession | 0 | Replacement motifs used once, not as emotional core |
| Phrase Repetition | Minimal | No distinctive phrase 3+ times |
| Wodehouse Flow | Yes | Prose rollicks with momentum |

Word count and paragraph count are NOT quality metrics. Content dictates length.

## Word Count Updates

After approval, the orchestrator automatically updates the `word_count` frontmatter field using:

```bash
bun ~/Projects/tuonela-private/scripts/update-word-counts.ts "${OUTPUT_PATH}"
```

This script counts only **reader-visible words** by stripping:
- Frontmatter (between `---`)
- MDX components (`<FloatImage>`, `<CrossRef>`, etc.)
- Code blocks and inline code
- Markdown formatting (keeping text content)
- Component tags (but preserving text inside `<Marvin>`)

This ensures word counts are accurate and consistent across all stories.

## Technical Notes

### Agent Registration

The narrative-author and style-reviewer agents are defined as markdown files but are not yet registered in the Task tool's agent registry. Current workaround uses `general-purpose` agent with explicit system prompt loading.

### MDX Components vs XML

`<Marvin>` tags are **MDX components** for the blog platform, NOT "XML to avoid in prompts". They are REQUIRED in narrative output.

### PAI Context Loading

Both agents require loading `${PAI_DIR}/PAI.md` as their first action. This is enforced in their system prompts.

## File Locations

| Component | Path |
|-----------|------|
| narrative-author agent | `/Users/zuul/Projects/PAI/.claude/agents/narrative-author.md` |
| style-reviewer agent | `/Users/zuul/Projects/PAI/.claude/agents/style-reviewer.md` |
| /draft-narrative command | `/Users/zuul/Projects/PAI/.claude/commands/draft-narrative.md` |
| Transformation samples | `/Users/zuul/Projects/PAI/.claude/skills/NarrativeWriting/samples/` |
| **Calibration case** | `samples/transformation-analysis-story-09.md` |
| NarrativeWriting skill | `/Users/zuul/Projects/PAI/.claude/skills/NarrativeWriting/SKILL.md` |
| ReviewAIPatterns skill | `/Users/zuul/Projects/PAI/.claude/skills/ReviewAIPatterns/SKILL.md` |

### Calibration Case: Story-09

The `transformation-analysis-story-09.md` file documents the before/after that drove v1.0→v1.4 development. It shows:
- What was cut (coffee obsession, victory lap, DevOps heroics)
- What was preserved (perspective, facts, MDX components)
- What each failed rewrite (v1-v5) exposed
- How to evaluate future rewrites

**Use this case when:** Reviewing system behavior, training new constraints, or debugging why a rewrite went wrong.

## Version History

- **1.5** (2026-01-03) - Headers mode for sub-header insertion
  - Added `scope:headers` option to /draft-narrative command
  - Headers mode adds sub-headers (##) and pacing breaks (---) without modifying prose
  - Header voice validation: evocative Wodehouse titles, not tutorial/textbook style
  - Style-reviewer has headers-specific review criteria (voice, density, placement)
  - Fixes issue where batch header operations produced wrong voice headers

- **1.4** (2026-01-02) - Three-layer preservation model
  - Stories have THREE layers: perspective (fixed), facts (preserved), prose (free)
  - PERSPECTIVE comes from the existing story, not sources - cannot be changed
  - Agent cannot switch to "easier" topic or reimagine the story's angle
  - NO target word count - length follows content
  - Motifs are decoration - CUT them, don't replace with new obsession
  - Fixes agent switching perspectives or padding with repeated motifs

- **1.3** (2026-01-02) - Orchestrator constraints and Write tool enforcement
  - Added ORCHESTRATOR CONSTRAINTS section to command (orchestrator NEVER writes content)
  - Added "YOU MUST USE THE WRITE TOOL" section to narrative-author
  - Fixes issue where agent "completed" without actually writing files

- **1.2** (2026-01-02) - Victory lap and motif obsession prevention
  - Added CONSTRAINT 6: No Victory Celebrations or Heroic Exhaustion
  - Added CONSTRAINT 7: Motif Discipline (replacement motifs used once only)
  - Added Victory/DevOps Heroics check to style-reviewer
  - Added Motif Obsession check to style-reviewer
  - Banned: "small victories", exhaustion tropes, sunrise-as-climax, recap sections

- **1.1** (2026-01-02) - Enhanced constraints and no-coffee option
  - Added `no-coffee:` parameter for nuclear zero-coffee mode
  - Added CONSTRAINT 5: Light Prose (avoid heavy vocabulary like "unanimous")
  - Added Marvin "Sir" detection (Marvin is an equal, not a servant)
  - Added heavy vocabulary check to style-reviewer
  - Updated quality metrics tables with new checks

- **1.0** (2026-01-01) - Initial implementation
  - Created narrative-author and style-reviewer agents
  - Created /draft-narrative command with producer/approver loop
  - Added transformation sample showing raw material → Wodehouse prose
  - Added instructions: parameter for story-specific content changes
  - Tested successfully on adaptive-research-story-06
