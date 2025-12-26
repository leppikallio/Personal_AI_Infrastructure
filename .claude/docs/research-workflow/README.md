# Adaptive Research Workflow

A multi-agent research orchestration system that intelligently gathers, validates, and synthesizes information from diverse sources.

## How It Works

```mermaid
flowchart TB
    subgraph Phase1["Phase 1: Initialize"]
        Q[User Query] --> S[Input Sanitization]
        S --> A[Query Analysis]
        A --> P[Perspective Generation]
        P --> T[Track Allocation]
    end

    subgraph Phase2["Phase 2: Collect"]
        T --> W1[Wave 1: Exploratory Agents]
        W1 --> QA[Quality Analysis]
        QA --> PD{Pivot Decision}
        PD -->|Gaps Found| W2[Wave 2: Specialist Agents]
        PD -->|Complete| CV[Citation Validation]
        W2 --> CV
    end

    subgraph Phase3["Phase 3: Synthesize"]
        CV --> PS[Parallel Summarization]
        PS --> CS[Cross-Perspective Synthesis]
        CS --> RV{Review Loop}
        RV -->|Revisions Needed| CS
        RV -->|Approved| FS[Final Synthesis]
    end

    subgraph Phase4["Phase 4: Validate"]
        FS --> CU[Citation Utilization Check]
        CU --> SV[Structure Validation]
        SV --> QG{Quality Gate}
        QG -->|Pass| OUT[Research Output]
        QG -->|Fail| CS
    end

    style Phase1 fill:#e1f5fe
    style Phase2 fill:#fff3e0
    style Phase3 fill:#e8f5e9
    style Phase4 fill:#fce4ec
```

## Quick Start

Run a research query:
```bash
/conduct-research-adaptive "Your research question here"
```

The system handles everything else: agent selection, quality control, citation validation, and synthesis.

## Core Concepts

### Adaptive Two-Wave Research

Wave 1 launches 4-6 exploratory agents. A quality analyzer then decides whether Wave 2 specialists are needed based on coverage gaps, domain signals, and source quality.

```mermaid
flowchart LR
    subgraph Wave1["Wave 1: Exploration"]
        direction TB
        P1[Perplexity]
        C1[Claude]
        G1[Gemini]
        GK[Grok]
    end

    Wave1 --> QM[Quality Matrix]

    QM --> D{Decision}
    D -->|Skip| Synth[Synthesis]
    D -->|Proceed| Wave2

    subgraph Wave2["Wave 2: Specialists"]
        direction TB
        S1[Domain Expert]
        S2[Academic Deep-Dive]
        S3[Contrarian View]
    end

    Wave2 --> Synth
```

### Track Allocation (Source Diversity)

Research tracks ensure diverse source coverage:

| Track | Allocation | Purpose |
|-------|------------|---------|
| Standard | 50% | Mainstream consensus, balanced sources |
| Independent | 25% | Academic sources, non-vendor perspectives |
| Contrarian | 25% | Opposing viewpoints, critical analysis |

### Quality Gates

Every phase enforces quality through:
- **Input sanitization** - Blocks prompt injection attempts
- **Citation validation** - Verifies URLs, tracks hallucination rate
- **Structure validation** - Ensures academic format compliance
- **Utilization checks** - Requires 60%+ citation coverage

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](./ARCHITECTURE.md) | System design, component relationships |
| [Security](./security/README.md) | Prompt injection prevention, input sanitization |
| **Phase Guides** | |
| [Phase 1: Initialize](./phases/01-initialize.md) | Query analysis, perspective generation |
| [Phase 2: Collect](./phases/02-collect.md) | Agent orchestration, pivot decisions |
| [Phase 3: Synthesize](./phases/03-synthesize.md) | Parallel synthesis, review loop |
| [Phase 4: Validate](./phases/04-validate.md) | Quality gates, final checks |
| **Reference** | |
| [Agents](./agents/README.md) | Agent types and capabilities |
| [Commands](./reference/commands.md) | All slash commands |
| [File Structure](./reference/file-structure.md) | Session directory layout |
| [Troubleshooting](./reference/troubleshooting.md) | Common issues and solutions |

## Key Features

### Parallel Synthesis Architecture

```mermaid
flowchart TB
    subgraph Input["Raw Research Files"]
        R1[wave-1/perplexity.md]
        R2[wave-1/claude.md]
        R3[wave-1/gemini.md]
        R4[wave-2/specialist.md]
    end

    subgraph Parallel["Parallel Summarization"]
        R1 --> S1[Summary Agent 1]
        R2 --> S2[Summary Agent 2]
        R3 --> S3[Summary Agent 3]
        R4 --> S4[Summary Agent 4]
    end

    subgraph Output["Synthesis"]
        S1 --> CPS[Cross-Perspective Synthesizer]
        S2 --> CPS
        S3 --> CPS
        S4 --> CPS
        CPS --> REV[Research Reviewer]
        REV -->|Approved| FINAL[Final Synthesis]
        REV -->|Revisions| CPS
    end
```

### Citation Flow

```mermaid
flowchart LR
    subgraph Extract["Extraction"]
        A1[Agent 1 Citations]
        A2[Agent 2 Citations]
        A3[Agent 3 Citations]
    end

    subgraph Validate["Validation"]
        A1 --> V[URL Validator]
        A2 --> V
        A3 --> V
        V --> D[Deduplication]
        D --> U[Unified Pool]
    end

    subgraph Use["Synthesis"]
        U --> S[Inline Citations]
        S --> R[IEEE References]
    end
```

## Version

**M13.2** - Parallel Synthesis with Producer/Approver Loop (2025-12-26)

---

[View full technical documentation](./ARCHITECTURE.md)
