---
name: WebsiteToText
description: Extract website content as markdown using fabric CLI. PRIMARY method for getting webpage text - use BEFORE Apify/Brightdata/WebFetch. USE WHEN user asks to "read this website", "get content from URL", "scrape this page", or when research needs webpage content. Falls back to MCPs only for paywalls, logins, or specialized scraping. Works for main agent and all sub-agents.
---

# Website to Text - Web Content Extraction

## When to Activate This Skill

**Automatic activation for:**
- Any URL that needs content extraction
- "Read this website: [URL]"
- "Get the content from this page"
- "Scrape this URL"
- "What does this webpage say?"
- "Extract text from this site"
- Research tasks that need webpage content
- Following links found during research

**This skill is the PRIMARY method - use it FIRST before:**
- WebFetch tool
- mcp__brightdata__scrape_as_markdown
- mcp__apify__* scrapers
- Any other web scraping approach

## Quick Start

### Basic Website Extraction
```bash
# Extract website content as markdown
fabric -u "https://example.com"

# Extract and save to file
fabric -u "https://example.com" -o /tmp/page_content.md
```

### Direct Pattern Processing
```bash
# Extract and process in one command
fabric -u "https://example.com" | fabric -p summarize
fabric -u "https://example.com" | fabric -p extract_wisdom
fabric -u "https://example.com" | fabric -p extract_article_wisdom
```

## Tool Hierarchy (CRITICAL)

**Always follow this order:**

```
1. fabric -u "URL"           ← TRY THIS FIRST (fast, native, no API costs)
   ↓ fails?
2. WebFetch tool             ← Built-in Claude Code tool
   ↓ fails?
3. Brightdata scrape         ← For protected sites, anti-bot bypass
   ↓ fails?
4. Apify specialized actors  ← For platform-specific scraping (LinkedIn, etc.)
```

**When to skip to specialized tools:**
- Paywall-protected content → Brightdata or skip
- Login-required pages → Apify with auth or skip
- Platform-specific (LinkedIn, Twitter) → Use platform skills
- Heavy JavaScript rendering → Brightdata
- CAPTCHA-protected → Brightdata

## Context-Based Pattern Selection

| User Intent | Recommended Pattern | When to Use |
|-------------|---------------------|-------------|
| Research/learning | `extract_article_wisdom` | Articles, blog posts |
| Quick overview | `summarize` | Any webpage |
| Key insights | `extract_insights` | Long-form content |
| Main points | `extract_main_idea` | Single core concept |
| Technical docs | `analyze_paper` | Technical articles |
| News articles | `summarize` | Current events |
| Security content | `extract_ctf_writeup` | Security write-ups |

## Workflow for Researcher Agents

When a researcher agent needs webpage content:

1. **Detect URL** in search results or references
2. **Extract content** using fabric -u
3. **Process with appropriate pattern** based on research context
4. **Include processed content** in research findings
5. **Fall back to MCPs** only if fabric -u fails

### Example Research Integration
```bash
# Researcher finds: https://langchain.com/blog/langgraph-update
# Topic: "AI Agent Frameworks 2025"

# Step 1: Extract content
fabric -u "https://langchain.com/blog/langgraph-update"

# Step 2: If analysis needed
fabric -u "https://langchain.com/blog/langgraph-update" | fabric -p extract_article_wisdom

# Step 3: Include in research output with source attribution
```

## Two-Step Workflow (Complex Analysis)

For complex analysis or when piping to multiple patterns:

```bash
# Step 1: Extract raw content
fabric -u "URL" -o /tmp/page_content.md

# Step 2: Process with one or more patterns
cat /tmp/page_content.md | fabric -p extract_wisdom
cat /tmp/page_content.md | fabric -p summarize
cat /tmp/page_content.md | fabric -p extract_recommendations
```

## Options Reference

| Flag | Purpose | Example |
|------|---------|---------|
| `-u URL` | URL to extract | `fabric -u "https://example.com"` |
| `-o FILE` | Save output to file | `fabric -u "URL" -o /tmp/out.md` |
| `-p PATTERN` | Pipe to fabric pattern | `fabric -u "URL" \| fabric -p summarize` |

## Error Handling

**Common issues and fallbacks:**

| Issue | Solution |
|-------|----------|
| Timeout / slow load | Add explicit wait or use Brightdata |
| 403 Forbidden | Use Brightdata (anti-bot bypass) |
| 404 Not Found | URL is dead, report to user |
| Paywall | Note as inaccessible, try Brightdata |
| Login required | Skip or use authenticated Apify actor |
| CAPTCHA | Use Brightdata |
| JavaScript-heavy SPA | Use Brightdata or Playwright MCP |
| Empty/minimal content | Try Brightdata, page may need JS |

**Fallback decision tree:**
```
fabric -u fails with:
├── Timeout → Retry once, then Brightdata
├── 403/Forbidden → Brightdata (anti-bot)
├── Paywall detected → Note as [PAYWALLED], skip or Brightdata
├── Login required → Note as [LOGIN REQUIRED], skip
├── Empty content → Brightdata (may need JS rendering)
└── Other error → WebFetch, then Brightdata
```

## Integration with Other Skills

- **fabric**: Process content with any of 242+ patterns
- **research**: Primary tool for webpage content during research
- **video-to-text**: For YouTube URLs (use that skill instead)
- **linkedin-scraper**: For LinkedIn (use that skill instead)
- **citation-creation**: Properly cite web sources

## Sub-Agent Instructions

When delegating web content tasks to sub-agents:

```markdown
Task: "Extract and analyze content from [URL]"

Instructions:
1. Use website-to-text skill (fabric -u) FIRST
2. Extract content: fabric -u "URL"
3. If needed, process with pattern: fabric -p [pattern]
4. Include findings in your report
5. Attribute source: "From webpage: [URL]"
6. ONLY use Brightdata/Apify if fabric -u fails
```

## Examples

### Example 1: Research Task Needs Webpage Content
```
Context: Researching "LangGraph vs CrewAI"
Found: https://blog.langchain.dev/langgraph-multi-agent/

Action:
1. Run: fabric -u "https://blog.langchain.dev/langgraph-multi-agent/"
2. Process: | fabric -p extract_article_wisdom
3. Include key points in research findings
```

### Example 2: User Requests Page Summary
```
User: "Summarize this article: [URL]"

Action:
1. Run: fabric -u "URL" | fabric -p summarize
2. Present summary to user
```

### Example 3: Multiple Pages for Research
```
URLs to process:
- https://microsoft.github.io/autogen/
- https://docs.crewai.com/
- https://langchain-ai.github.io/langgraph/

Action:
1. Process each with fabric -u
2. Compile findings
3. If any fail, fall back to Brightdata for those specific URLs
```

### Example 4: Handling Failures
```
fabric -u "https://protected-site.com" returns empty/error

Action:
1. Note the failure
2. Try: mcp__brightdata__scrape_as_markdown with URL
3. If still fails, note as [INACCESSIBLE] in report
```

## Platform-Specific Routing

**Use dedicated skills/tools instead of this skill for:**

| Platform | Use Instead |
|----------|-------------|
| YouTube | `video-to-text` skill |
| LinkedIn | `linkedin-scraper` skill |
| X/Twitter | `grok` CLI or Apify |
| arXiv | `arxiv` skill + MCP |
| GitHub repos | Brightdata or direct API |

## Key Principle

> **fabric -u is your PRIMARY web extraction tool. It's fast, free, and works for most public websites. Only escalate to MCPs when it fails or for specialized platforms.**

This keeps API costs low and research fast while maintaining fallback options for edge cases.
