# Phase 1: Initialize

Phase 1 prepares the research session by analyzing the query, generating perspectives, and allocating agents.

## Command

```bash
/_research-init "$USER_QUERY"
```

## Steps

### 1.1 Input Sanitization

Every query passes through the input sanitizer before processing. This blocks prompt injection attempts and validates input structure.

```bash
bun ~/.claude/utilities/input-sanitizer/sanitizer.ts --schema=analysis
```

The sanitizer checks for 25+ injection patterns:
- System prompt overrides
- Role confusion attempts
- Instruction hijacking
- Encoded payloads

See [Security](../security/README.md) for details.

### 1.2 Query Analysis

The query analyzer generates research perspectives using Claude:

```bash
bun ~/.claude/utilities/query-analyzer/query-analyzer.ts --perspectives "$USER_QUERY"
```

Output structure:
```typescript
{
  query: string;
  complexity: 'simple' | 'moderate' | 'complex';
  perspectives: EnhancedPerspective[];
  agentAllocation: {
    'perplexity-researcher': number;
    'claude-researcher': number;
    'gemini-researcher': number;
    'grok-researcher': number;
  };
  perspectiveCount: number;
  overallConfidence: number;
}
```

### 1.3 Perspective Generation

Each perspective defines a research angle:

```typescript
interface EnhancedPerspective {
  text: string;           // Research question/angle
  domain: string;         // 'academic' | 'technical' | 'social_media'
  confidence: number;     // 0-100
  recommendedAgent: string;
  rationale: string;
  platforms?: Platform[];
}
```

Example perspectives for "AI agent frameworks 2025":
1. Technical implementation patterns (technical)
2. Academic research directions (academic)
3. Community adoption trends (social_media)
4. Enterprise deployment challenges (technical)

### 1.4 Track Allocation

Perspectives are assigned to research tracks for source diversity:

| Track | Allocation | Purpose |
|-------|------------|---------|
| Standard | 50% | Mainstream sources, vendor documentation |
| Independent | 25% | Academic papers, non-vendor analysis |
| Contrarian | 25% | Critical perspectives, limitations |

Track assignment ensures the final synthesis includes balanced viewpoints rather than one-sided coverage.

### 1.5 Session Setup

Creates the session directory structure:

```
~/.claude/scratchpad/research/YYYYMMDD-HHMMSS-XXXX/
├── analysis/
│   ├── query-analysis.json
│   ├── perspectives.json
│   └── platform-requirements.json
├── wave-1/
├── wave-2/
├── summaries/
└── synthesis/
```

## Outputs

| File | Content |
|------|---------|
| `analysis/query-analysis.json` | Full analysis with perspectives |
| `analysis/perspectives.json` | Perspective array for agent dispatch |
| `analysis/platform-requirements.json` | Expected platforms per perspective |

## Quality Gates

Phase 1 fails if:
- Input sanitization rejects the query
- Analyzer returns invalid JSON
- Perspective count outside 1-20 range
- Required fields missing from analysis

## Environment Variables

After Phase 1, these variables are set:

```bash
SESSION_DIR="~/.claude/scratchpad/research/..."
SESSION_ID="YYYYMMDD-HHMMSS-XXXX"
PERSPECTIVE_COUNT=N
WAVE1_COUNT=N
PERPLEXITY_COUNT=N
CLAUDE_COUNT=N
GEMINI_COUNT=N
GROK_COUNT=N
```

---

Next: [Phase 2: Collect](./02-collect.md)
