# DraftScene Workflow

Draft a narrative scene in the Wodehouse-inspired style for the tuonela blog.

## Input Requirements

Before drafting, you need:

1. **Source material** - What actually happened (session log, decision doc, or description)
2. **Scene type** - Mistake/fumble, success/insight, or problem-solving dialogue
3. **Key technical content** - The concept being illustrated

## Process

### 1. Identify Scene Type

| Type | Opens With | Petteri's Arc | Marvin's Role |
|------|------------|---------------|---------------|
| **Mistake/fumble** | Overconfidence | Pride → realization → acceptance | Diplomatic revealer |
| **Success/insight** | Uncertainty or temptation | Weighing options → correct choice | Validator, explains why |
| **Problem-solving** | Discovery or confusion | Collaborative thinking | Thinking partner |

### 2. Extract Key Moments

From the source material, identify:

- The **setup** - What was the situation?
- The **pivot** - What changed understanding?
- The **resolution** - What was learned/decided?
- The **closer** - What's the wry observation?

### 3. Draft Scene Structure

```
[Opening - establish situation and Petteri's initial stance]
[Marvin's initial observation or agreement]
[The pivot - new information or insight]
[Working through implications - dialogue]
[Resolution - what was done/decided]
[Closer - usually Marvin's dry wit]
```

### 4. Apply Style Rules

**DO:**
- First person from Petteri's perspective
- Dialogue formatted with quotes
- Inline `backticks` for technical terms
- Self-deprecating but capable Petteri
- Diplomatic, witty Marvin

**DON'T:**
- No code blocks
- No tutorial voice
- No excessive jargon
- No making either character the "winner"

### 5. AI Pattern Elimination (CRITICAL)

**Before finalizing, eliminate these AI tells:**

| Pattern | Action |
|---------|--------|
| Em-dashes | Replace with commas, periods, or restructure. Max 2 per 500 words. |
| List structures | Convert to flowing prose. No "first... second... third..." |
| Hedging | Delete "perhaps," "it's worth noting," "one might argue" |
| Parallel construction | Vary sentence structures. Break the rhythm. |
| Summary paragraphs | Delete entirely. No "In summary..." or "To conclude..." |
| Even pacing | Vary paragraph lengths dramatically |

**Replace with human patterns:**
- Messy transitions that jump between thoughts
- Fragments. Like this. Sometimes.
- Run-ons when the moment demands momentum
- Flat opinions stated directly
- Varied paragraph lengths (one sentence, then three, then two)

**Read the draft aloud.** If it sounds like AI wrote it, revise until it doesn't.

### 6. Final Validation

**AI Pattern Check (DO FIRST):**
- [ ] Em-dash count ≤2 per 500 words
- [ ] No list structures
- [ ] No hedging language
- [ ] No summary paragraphs
- [ ] Paragraph lengths vary noticeably

**Style & Tone:**
- [ ] Opens with appropriate tone
- [ ] Marvin is diplomatic, not smug
- [ ] Petteri owns mistakes cheerfully
- [ ] No code blocks
- [ ] Technical content explained in dialogue
- [ ] At least one genuinely witty line
- [ ] Proper closer
- [ ] Word count in range (500-850 depending on type)

## Target Word Counts

| Scene Type | Target | Range |
|------------|--------|-------|
| Mistake/fumble | 600 words | 500-700 |
| Success/insight | 600 words | 500-700 |
| Problem-solving | 750 words | 650-850 |

## Output

Return the complete scene with:

1. **Scene header** (title, type, source reference, word count, reading time)
2. **Horizontal rule**
3. **The narrative**
4. **Horizontal rule**
5. **Calibration notes** (what the scene demonstrates stylistically)

See the three calibration scenes in SKILL.md for exact format.
