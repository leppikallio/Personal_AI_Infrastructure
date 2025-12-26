# Agent Reference

The research workflow uses specialized agents for different tasks. Each agent runs with specific model settings and tool restrictions.

## Research Agents

These agents gather information during the collection phase.

### perplexity-researcher

**Model:** Sonnet
**Role:** Web search specialist

Perplexity excels at:
- Real-time web search
- News and current events
- Quick fact-finding
- Source aggregation

**Output:** Structured findings with inline citations, source URLs, confidence ratings.

### claude-researcher

**Model:** Sonnet
**Role:** Analytical research

Claude provides:
- Deep analysis of complex topics
- Nuanced understanding
- Multi-perspective consideration
- Academic-style synthesis

**Output:** Comprehensive analysis with citations, contrarian viewpoints, research gaps.

### gemini-researcher

**Model:** Sonnet
**Role:** Multi-source research

Gemini handles:
- Broad information gathering
- Technical documentation
- Cross-platform research
- Structured data extraction

**Output:** Organized findings by category, source attribution, platform coverage.

### grok-researcher

**Model:** Sonnet
**Role:** Real-time data

Grok specializes in:
- Social media trends
- Real-time discussions
- Community sentiment
- Breaking developments

**Output:** Current state analysis, trending topics, community perspectives.

## Synthesis Agents

These agents produce the final research output.

### perspective-summarizer

**Model:** Sonnet
**Role:** Condense individual perspective files

Reduces ~25KB raw research to ~4KB summary while preserving:
- Key findings with citation references
- Unique insights not in other perspectives
- Citation mapping to unified pool

**Tools:** Read, Write

### cross-perspective-synthesizer

**Model:** Opus
**Role:** Final synthesis production

Receives all perspective summaries and produces comprehensive synthesis:
- Six-part academic structure
- Cross-perspective analysis
- Inline citations throughout
- IEEE references section

**Tools:** Read, Write, Glob, Grep (NO internet access)

### synthesis-writer

**Model:** Opus
**Role:** Synthesis production and revision

Works in producer/approver loop with research-reviewer:
- Produces initial synthesis
- Processes revision feedback
- Iterates until approved

**Tools:** Read, Write, Glob, Grep (NO internet access)

### research-reviewer

**Model:** Sonnet
**Role:** Quality gatekeeper

Validates synthesis against M11 standards:
- Six-part structure verification
- Citation density analysis
- Utilization rate calculation
- IEEE reference completeness

Returns APPROVED or detailed revision instructions.

**Tools:** Read, Write, Glob, Grep

## Model Selection Rationale

| Model | Use Case | Why |
|-------|----------|-----|
| Opus | Final synthesis | Maximum quality for user-facing output |
| Sonnet | Research, summarization | Balance of capability and speed |
| Haiku | Not used | Research requires Sonnet-level accuracy |

Research agents use Sonnet because:
- Citation accuracy is critical
- Haiku may hallucinate sources
- Speed savings not worth quality risk

Synthesis uses Opus because:
- Final output quality matters most
- Complex cross-perspective integration
- Academic structure adherence

## Tool Restrictions

### Research Phase (Full Access)

| Agent | WebSearch | WebFetch | Bash | Read/Write |
|-------|-----------|----------|------|------------|
| perplexity-researcher | Yes | Yes | Limited | Yes |
| claude-researcher | Yes | Yes | Limited | Yes |
| gemini-researcher | Yes | Yes | Limited | Yes |
| grok-researcher | Yes | Yes | Limited | Yes |

### Synthesis Phase (Restricted)

| Agent | WebSearch | WebFetch | Bash | Read/Write |
|-------|-----------|----------|------|------------|
| perspective-summarizer | No | No | No | Yes |
| cross-perspective-synthesizer | No | No | No | Yes |
| synthesis-writer | No | No | No | Yes |
| research-reviewer | No | No | No | Yes |

Synthesis agents cannot access the internet. This prevents:
- Hallucination of new sources
- Prompt injection via web content
- Unvalidated information in output

## Agent Output Format

All research agents produce structured markdown:

```markdown
# Research: [Perspective Title]

## Key Findings
- Finding with [Source](URL)

## Detailed Analysis
[Paragraphs with inline citations...]

## Sources
1. [Title](URL) - Description

## Metadata
- Agent: [name]
- Track: [standard|independent|contrarian]
- Confidence: [0-100]%
- Sources: [count]
```

## Adding New Agents

To add a research agent:

1. Create agent definition in `~/.claude/agents/`
2. Define model, tools, output format
3. Register in query analyzer allocation logic
4. Update pivot decision engine if needed

Agent definitions use YAML frontmatter:

```yaml
---
name: new-researcher
description: What this agent does
model: sonnet
allowedTools:
  - WebSearch
  - WebFetch
  - Read
  - Write
---

# Agent Instructions
...
```

---

Back to: [README](../README.md)
