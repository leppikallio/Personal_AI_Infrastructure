---
name: Arxiv
description: |
  Academic research paper discovery, download, and deep analysis system using arXiv MCP server.

  USE WHEN user says "search arxiv", "find papers on", "research papers about", "academic papers",
  "download paper", "analyze paper", "deep paper analysis", "literature review", "find arxiv paper",
  "read paper [arxiv ID]", "what papers exist on", or any academic research request.
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests paper search/discovery:**
Examples: "find papers on", "search arxiv for", "what papers exist on", "research papers about", "academic papers on", "literature review on"
→ **READ:** ${PAI_DIR}/skills/Arxiv/workflows/search-papers.md
→ **EXECUTE:** Search arXiv with optimized queries, filters, and category constraints

**When user requests paper download:**
Examples: "download paper [ID]", "get paper [ID]", "fetch arxiv paper", "download arxiv [ID]"
→ **READ:** ${PAI_DIR}/skills/Arxiv/workflows/download-paper.md
→ **EXECUTE:** Download paper and verify availability for reading

**When user requests deep paper analysis:**
Examples: "analyze paper [ID]", "deep analysis of", "comprehensive paper review", "analyze this research", "what does this paper say"
→ **READ:** ${PAI_DIR}/skills/Arxiv/workflows/deep-analysis.md
→ **EXECUTE:** Full 8-section deep research analysis with cross-referencing

**When user requests listing downloaded papers:**
Examples: "list papers", "what papers do I have", "show downloaded papers", "available papers"
→ **USE TOOL:** mcp__arxiv-mcp-server__list_papers directly (no workflow needed)
→ **EXECUTE:** Display all locally stored papers

**When user requests reading paper content:**
Examples: "read paper [ID]", "show paper content", "get paper text", "paper markdown"
→ **USE TOOL:** mcp__arxiv-mcp-server__read_paper with paper_id
→ **EXECUTE:** Return full paper content in markdown

---

## When to Activate This Skill

### Direct arXiv Requests
- "search arxiv for [topic]" or "find arxiv papers on [topic]"
- "download paper [arxiv ID]" or "get paper 2312.00752"
- "analyze paper [arxiv ID]" or "deep dive into paper"
- "list my papers" or "what papers are downloaded"
- "read paper [arxiv ID]" or "show paper content"

### Academic Research Requests
- "find research papers on [topic]"
- "literature review on [topic]"
- "what academic papers exist about [topic]"
- "find recent papers on [topic]"
- "papers from [category] on [topic]"

### Paper Analysis Requests
- "analyze this paper" or "what does this paper say"
- "summarize paper [ID]" or "paper summary"
- "deep analysis of [ID]" or "comprehensive review"
- "compare papers on [topic]"

---

## Available MCP Tools

The arxiv-mcp-server provides four primary tools:

| Tool | Purpose | Parameters |
|------|---------|------------|
| `mcp__arxiv-mcp-server__search_papers` | Search arXiv with filters | query, categories, date_from, date_to, max_results, sort_by |
| `mcp__arxiv-mcp-server__download_paper` | Download paper by ID | paper_id, check_status |
| `mcp__arxiv-mcp-server__list_papers` | List all downloaded papers | (none) |
| `mcp__arxiv-mcp-server__read_paper` | Read paper content | paper_id |

---

## Search Query Best Practices

### Query Construction
- **Use quoted phrases** for exact matches: `"multi-agent systems"`, `"neural networks"`
- **Combine with OR** for related concepts: `"AI agents" OR "software agents"`
- **Field-specific searches**:
  - `ti:"exact title phrase"` - title only
  - `au:"author name"` - author search
  - `abs:"keyword"` - abstract only
- **Use ANDNOT** to exclude: `"machine learning" ANDNOT "survey"`

### Category Filtering (Highly Recommended)
| Category | Domain |
|----------|--------|
| cs.AI | Artificial Intelligence |
| cs.MA | Multi-Agent Systems |
| cs.LG | Machine Learning |
| cs.CL | Computation and Language (NLP) |
| cs.CV | Computer Vision |
| cs.RO | Robotics |
| cs.CR | Cryptography and Security |
| cs.SE | Software Engineering |

### Date Filtering
- `date_to: "2015-12-31"` - for foundational/classic work
- `date_from: "2023-01-01"` - for recent developments
- Results sorted by RELEVANCE by default (most relevant first)

---

## Deep Paper Analysis Framework

When performing comprehensive paper analysis, follow this 8-section framework:

### 1. Executive Summary
- Main contributions and problems addressed
- Key findings in 2-3 sentences

### 2. Historical Context
- Position within research domain
- Prior work and how this builds on it

### 3. Technical Approach
- Methodology breakdown
- Implementation specifics
- Algorithms and techniques used

### 4. Experimental Validation
- Benchmarks and datasets
- Comparative performance analysis
- Statistical rigor assessment

### 5. Practical Deployment
- Real-world applicability
- Implementation considerations
- Computational requirements

### 6. Theoretical Advances
- Novel contributions
- Paradigm shifts introduced
- Mathematical foundations

### 7. Future Research
- Open questions identified
- Suggested directions
- Limitations acknowledged

### 8. Societal Impact
- Ethical considerations
- Broader implications
- Potential misuse concerns

---

## Workflow Files

- `workflows/search-papers.md` - Optimized paper discovery workflow
- `workflows/download-paper.md` - Paper download and verification
- `workflows/deep-analysis.md` - Comprehensive 8-section analysis

---

## Quick Usage Examples

**Search for recent AI agent papers:**
```
Search arxiv for multi-agent systems papers from 2024
```
→ Uses search_papers with categories=["cs.MA", "cs.AI"], date_from="2024-01-01"

**Download and analyze a specific paper:**
```
Download and analyze paper 2312.00752
```
→ Uses download_paper, then read_paper, then deep-analysis workflow

**Find foundational work:**
```
Find classic BDI architecture papers before 2010
```
→ Uses search_papers with ti:"BDI" AND abs:"belief desire intention", date_to="2010-12-31"

---

## Integration Notes

- Papers are stored locally at `~/.arxiv-mcp-server/papers` (configurable via ARXIV_STORAGE_PATH)
- Always check `list_papers` first to see what's already downloaded
- When analyzing papers, search for related work to provide context
- Cross-reference findings across multiple papers when possible
