# EditScene Workflow

Edit or revise an existing narrative scene to improve style consistency.

## When to Use

- Scene has been drafted but needs polish
- Style drifted from Wodehouse homage
- Reviewer feedback requires changes
- Consolidating multiple scene drafts

## Process

### 1. AI Pattern Elimination (DO FIRST)

**This is the most important check.** Eliminate AI tells before anything else.

| AI Pattern | Sign | Fix |
|------------|------|-----|
| Em-dash overuse | More than 2 per 500 words | Replace with commas, periods, or restructure |
| List structures | "First... second... third..." | Convert to flowing prose |
| Hedging language | "perhaps," "it's worth noting" | State opinions flatly, delete hedges |
| Parallel construction | "Not just X but Y. Not only A but B." | Vary sentence structures |
| Summary paragraphs | "In summary..." "To conclude..." | Delete entirely |
| Even pacing | All paragraphs similar length | Vary dramatically |

**Read aloud.** If it sounds like AI wrote it, keep revising.

### 2. Review Against Style Rules

Check for violations:

| Issue | Sign | Fix |
|-------|------|-----|
| Tutorial voice | "First, we need to..." | Rewrite as journey/discovery |
| Code blocks | ``` fenced code ``` | Describe in prose, use `inline` only |
| Smug Marvin | Lectures, explains at length | Make him prompt/question instead |
| Passive Petteri | Just receives information | Give him agency, let him realize |
| No wit | Scene feels flat | Add at least one good line |
| Missing closer | Ends abruptly | Add Marvin's dry observation |

### 3. Check Technical Accuracy

- Are the technical details correct?
- Is the concept explained accessibly?
- Would a non-expert understand the stakes?

### 4. Verify Word Count

| Scene Type | Target | Too Long? | Too Short? |
|------------|--------|-----------|------------|
| Mistake/fumble | 500-700 | Cut redundancy | Add beat/detail |
| Success/insight | 500-700 | Cut redundancy | Add beat/detail |
| Problem-solving | 650-850 | Tighten dialogue | Expand discovery |

### 5. Final Validation

**AI Pattern Check (confirm these are fixed):**
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
- [ ] Word count in range

## Output

Return:
1. The revised scene
2. Brief changelog (what was fixed)
