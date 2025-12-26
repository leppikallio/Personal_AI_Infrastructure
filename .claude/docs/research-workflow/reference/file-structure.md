# File Structure

Each research session creates a directory with standardized structure.

## Session Directory

Sessions are created in:
```
~/.claude/scratchpad/research/YYYYMMDD-HHMMSS-XXXX/
```

Where `XXXX` is a random 4-digit suffix for uniqueness.

## Directory Layout

```
session/
├── analysis/                    # Metadata and analysis files
│   ├── query-analysis.json      # Full query analysis
│   ├── perspectives.json        # Generated perspectives
│   ├── platform-requirements.json
│   ├── quality-analysis.json    # Wave 1 quality metrics
│   ├── pivot-decision.json      # Wave 2 decision
│   ├── unified-citations.md     # Validated citation pool
│   ├── synthesis-review-1.md    # Review iteration 1
│   ├── synthesis-review-2.md    # Review iteration 2 (if needed)
│   └── validation-report.md     # Final validation
│
├── wave-1/                      # Wave 1 agent outputs
│   ├── perplexity-1.md
│   ├── perplexity-2.md
│   ├── claude-1.md
│   ├── gemini-1.md
│   └── grok-1.md
│
├── wave-2/                      # Wave 2 specialist outputs
│   ├── academic-specialist.md
│   └── domain-expert.md
│
├── summaries/                   # Condensed perspective summaries
│   ├── summary-perplexity-1.md
│   ├── summary-perplexity-2.md
│   ├── summary-claude-1.md
│   └── ...
│
└── synthesis/                   # Final output
    └── final-synthesis.md
```

## File Descriptions

### analysis/

| File | Created By | Content |
|------|------------|---------|
| `query-analysis.json` | Phase 1 | Perspectives, agent allocation, complexity |
| `perspectives.json` | Phase 1 | Perspective array for agent dispatch |
| `platform-requirements.json` | Phase 1 | Expected platforms per perspective |
| `quality-analysis.json` | Phase 2 | Coverage, depth, source quality metrics |
| `pivot-decision.json` | Phase 2 | Wave 2 decision with triggers |
| `unified-citations.md` | Phase 2 | Validated, deduplicated citations |
| `synthesis-review-N.md` | Phase 3 | Reviewer feedback per iteration |
| `validation-report.md` | Phase 4 | Final quality metrics |

### wave-1/

Agent output files from exploratory research.

Naming: `{agent-type}-{instance}.md`

Examples:
- `perplexity-1.md` - First Perplexity agent
- `claude-1.md` - First Claude agent
- `gemini-1.md` - Gemini agent

### wave-2/

Specialist agent outputs (if Wave 2 executed).

Naming varies by specialist type:
- `academic-specialist.md`
- `domain-expert.md`
- `contrarian-researcher.md`

### summaries/

Condensed versions of wave files.

Naming: `summary-{original-name}.md`

Each summary is ~3-5KB from a ~25KB original.

### synthesis/

Final output file.

`final-synthesis.md` contains:
- Six-part academic structure
- All inline citations
- IEEE references
- Synthesis metadata

## File Size Guidelines

| File Type | Typical Size |
|-----------|-------------|
| Wave 1 agent output | 20-30KB |
| Wave 2 specialist output | 15-25KB |
| Summary file | 3-5KB |
| Final synthesis | 15-25KB |
| Citation pool | 5-10KB |

## Cleanup

Sessions remain in scratchpad until manually cleaned.

To clean old sessions:
```bash
# Remove sessions older than 7 days
find ~/.claude/scratchpad/research -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

To preserve a session:
```bash
# Move to history
mv ~/.claude/scratchpad/research/SESSION_ID ~/.claude/history/research/
```

---

Back to: [README](../README.md)
