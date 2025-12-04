# Citation Validation - Complete Reference

## Purpose

LLMs frequently fabricate citations - URLs that don't exist, papers never written, statistics not in sources. This skill ensures research credibility by validating all citations before synthesis.

---

## Workflow Position in Adaptive Research

```
Wave 1 Complete
      │
      ▼
Pivot Analysis (Step 2.5)
      │
      ▼
Wave 2 (Step 3.5, if needed)
      │
      ▼
┌─────────────────────────────────┐
│ CITATION VALIDATION (Step 3.4)  │  ← THIS SKILL
│ Sees ALL citations (W1 + W2)    │
│ Runs 1-3 Sonnet agents parallel │
└─────────────────────────────────┘
      │
      ▼
Synthesis (Step 3) - with validation flags
```

**Critical:** Validation MUST happen after ALL research waves but BEFORE synthesis.

---

## Thorough Validation Process

### Step 1: Citation Extraction

Extract all URLs from research files:

```bash
# Get unique URLs from all research
find $SESSION_DIR -name "*.md" -exec grep -oE "https?://[^\s\)\]\>\"']+" {} \; | sort -u > $SESSION_DIR/analysis/citations-raw.txt

# Count for agent distribution
CITATION_COUNT=$(wc -l < $SESSION_DIR/analysis/citations-raw.txt)
echo "Total citations to validate: $CITATION_COUNT"
```

### Step 2: Context Extraction

For each URL, extract the claim context:

```markdown
Citation Context Record:
- URL: https://example.com/article
- Claimed: "78% of enterprises adopted AI agents in 2024"
- Source agent: perplexity-market
- Used in: Market landscape section
```

### Step 3: Agent Distribution

| Citation Count | Agents | Split Strategy |
|----------------|--------|----------------|
| 1-50 | 1 | All to single agent |
| 51-150 | 2 | Even split (1-75, 76-150) |
| 151+ | 3 | Even thirds |

### Step 4: Validation Per Citation

Each validator agent performs:

1. **Accessibility Check**
   ```
   HTTP GET → 200 OK? → Continue
                 ↓ No
            404/Timeout → Mark ❌ Invalid
   ```

2. **Content Fetch**
   ```typescript
   // Try WebFetch first
   const content = await WebFetch({ url, prompt: "Extract full article text" });

   // If blocked, use Brightdata
   if (blocked) {
     const content = await mcp__brightdata__scrape_as_markdown({ url });
   }
   ```

3. **Claim Verification**
   ```
   Search content for:
   - Exact quoted text
   - Key statistics/numbers
   - Author names
   - Publication dates

   If found → ✅ Valid
   If different → ⚠️ Mismatch (note actual vs claimed)
   If not found → ⚠️ Unverifiable claim
   ```

4. **IEEE Conversion**
   Convert to proper IEEE format (see below)

---

## IEEE Citation Style Guide

**Official Source:** IEEE Editorial Style Manual for Authors (Updated July 29, 2024)
**PDF Location:** https://journals.ieeeauthorcenter.ieee.org/wp-content/uploads/sites/7/IEEE-Editorial-Style-Manual-for-Authors.pdf
**Local Copy:** /tmp/ieee-style-manual.pdf (if downloaded)
**Related Skill:** `${PAI_DIR}/skills/CitationCreation/` for complete IEEE format templates

### Format Templates

#### Journal Article
```
[#] A. B. Author and C. D. Author, "Title of article," Title of Journal, vol. X, no. Y, pp. ZZ-ZZ, Month Year.
```
Example:
```
[1] J. Smith and A. Johnson, "Multi-agent systems for enterprise automation," IEEE Trans. AI, vol. 15, no. 3, pp. 234-245, Mar. 2025.
```

#### Conference Paper
```
[#] A. B. Author, "Title of paper," in Proc. Name of Conf., City, State/Country, Year, pp. XX-XX.
```
Example:
```
[2] M. Chen et al., "Agentic AI architectures," in Proc. NeurIPS, Vancouver, Canada, 2024, pp. 1234-1245.
```

#### Book
```
[#] A. B. Author, Title of Book, xth ed. City, State/Country: Publisher, Year.
```

#### Website/Online Source
```
[#] A. Author. "Title of page." Website Name. URL (accessed Month Day, Year).
```
Example:
```
[3] McKinsey & Company. "State of AI 2025." McKinsey.com. https://mckinsey.com/ai-report (accessed Nov. 25, 2025).
```

#### Online Article with Date
```
[#] A. Author, "Title of article," Publication, Month Day, Year. [Online]. Available: URL
```
Example:
```
[4] S. Brown, "Enterprise AI adoption trends," TechCrunch, Nov. 15, 2025. [Online]. Available: https://techcrunch.com/ai-trends
```

#### Report/White Paper
```
[#] Organization, "Title of report," Report No., Month Year. [Online]. Available: URL
```
Example:
```
[5] Gartner, "Magic Quadrant for AI Platforms," Rep. G00123456, Oct. 2025. [Online]. Available: https://gartner.com/report
```

#### arXiv Preprint
```
[#] A. Author, "Title," arXiv:XXXX.XXXXX, Month Year.
```
Example:
```
[6] Y. Wang et al., "LLM agent frameworks survey," arXiv:2411.12345, Nov. 2024.
```

### IEEE Style Rules

1. **Author names:** First initial(s), then last name (J. Smith, not John Smith)
2. **Multiple authors:** Use "and" for 2, "et al." for 3+
3. **Titles:** Article titles in quotes, journal/book titles in italics
4. **Abbreviations:** Standard IEEE abbreviations (Trans., Proc., Conf., vol., no., pp.)
5. **Access dates:** Required for online sources
6. **Reference numbers:** Sequential [1], [2], [3] in order of appearance

---

## Validation Report Format

```markdown
# Citation Validation Report

**Session:** [session-id]
**Validation Date:** [date]
**Validation Level:** Thorough
**Validator Agents:** [count]

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Valid | X | Y% |
| ⚠️ Content Mismatch | X | Y% |
| ❌ Invalid (404/unreachable) | X | Y% |
| 🔒 Paywalled (unverifiable) | X | Y% |

**Overall Citation Reliability:** X%

---

## Validated References (IEEE Format)

[1] A. Smith, "Enterprise AI adoption trends," McKinsey Quarterly, Nov. 2025. [Online]. Available: https://mckinsey.com/ai-report ✅

[2] B. Johnson et al., "Multi-agent frameworks comparison," in Proc. NeurIPS, Vancouver, Canada, 2024, pp. 100-115. ✅

[3] C. Williams. "AI agent security guide." OWASP. https://owasp.org/ai-agents (accessed Nov. 25, 2025). ✅

---

## Flagged Citations

### ❌ Invalid Citations

[15] **INVALID - 404 Not Found**
- Original claim: "32% improvement in reasoning tasks"
- URL: https://fake-paper.arxiv.org/not-real
- HTTP Status: 404
- **Action Required:** Remove from synthesis or mark as [UNVERIFIED]

### ⚠️ Content Mismatches

[23] **MISMATCH - Different statistic**
- Original claim: "78% of enterprises adopted AI agents"
- URL: https://mckinsey.com/ai-report (valid, accessible)
- Actual content found: "72% of enterprises..."
- **Action Required:** Correct to accurate figure or flag discrepancy

### 🔒 Paywalled/Unverifiable

[45] **PAYWALLED - Cannot verify content**
- Original claim: "Gartner positions Salesforce as Leader"
- URL: https://gartner.com/magic-quadrant (paywall)
- **Action Required:** Note as unverifiable in synthesis
```

---

## Integration with Synthesis

### Marking Invalid Citations in Final Report

When synthesizing research with flagged citations, use clear visual markers:

```markdown
## Market Analysis

Enterprise AI adoption has reached significant levels, with major analysts
reporting widespread deployment [1]. ✅

The multi-agent framework market shows 78% year-over-year growth [2].
⚠️ **[CITATION FLAGGED: Source shows 72%, not 78% - statistic corrected]**

According to industry research, autonomous agents achieve 32% better
reasoning performance [3]. ❌ **[CITATION INVALID: Source URL not found
- treat as unverified claim]**

Gartner's analysis positions several vendors as leaders [4].
🔒 **[CITATION UNVERIFIABLE: Paywalled source]**
```

### Synthesis Rules

1. **✅ Valid citations:** Use confidently, cite normally
2. **⚠️ Mismatches:** Correct the information OR flag the discrepancy
3. **❌ Invalid:** MUST be visually highlighted if content is used
4. **🔒 Paywalled:** Note limitation, don't present as verified fact

---

## Agent Prompt Template

```markdown
# Citation Validator Agent

**Model:** Sonnet
**Task:** Validate research citations (Batch X of Y)

## Your Citations to Validate

[List of citations with context]

## Validation Process

For EACH citation:

1. **Check Accessibility**
   - Use WebFetch to access the URL
   - If blocked, use mcp__brightdata__scrape_as_markdown
   - Record HTTP status

2. **Verify Content** (if accessible)
   - Search for the claimed information
   - Note exact text found vs claimed
   - Flag any discrepancies

3. **Convert to IEEE Format**
   - Extract: author, title, publication, date
   - Format per IEEE style guide
   - Include access date for online sources

4. **Assign Status**
   - ✅ Valid: URL works AND content matches
   - ⚠️ Mismatch: URL works BUT content differs
   - ❌ Invalid: URL doesn't work (404, timeout, etc.)
   - 🔒 Paywalled: URL works but content behind paywall

## Output Format

Return structured validation report with:
- Summary statistics
- IEEE-formatted reference list
- Detailed flags for each problematic citation
- Specific discrepancies noted for mismatches

## Tools Available

- WebFetch: Primary URL fetching
- mcp__brightdata__scrape_as_markdown: For protected/blocked sites
- mcp__brightdata__scrape_batch: For batch URL checking (up to 10)
```

---

## Error Handling

### Common Issues

| Issue | Detection | Handling |
|-------|-----------|----------|
| 404 Not Found | HTTP 404 | Mark ❌, flag for removal |
| Timeout | No response >30s | Retry once, then mark ❌ |
| Bot blocked | 403/CAPTCHA | Use Brightdata fallback |
| Paywall | Login/subscription required | Mark 🔒 |
| Redirect loop | >5 redirects | Mark ❌ |
| Content changed | URL valid, claim not found | Mark ⚠️, note what IS found |

### Retry Strategy

```
Attempt 1: WebFetch
    ↓ Failed
Attempt 2: Brightdata scrape_as_markdown
    ↓ Failed
Mark as ❌ Invalid (note: tried multiple methods)
```

---

## Future Enhancements

1. **Citation Cache:** Store validated URLs to avoid re-checking
2. **Academic APIs:** CrossRef, Semantic Scholar, arXiv API integration
3. **Auto-correction:** Suggest fixes for mismatched statistics
4. **Confidence weighting:** Lower synthesis confidence for high invalid %
5. **Real-time validation:** Check citations as researchers write them

---

## Related Files

- `${PAI_DIR}/skills/CitationValidation/SKILL.md` - Quick reference
- `${PAI_DIR}/skills/CitationValidation/templates/validation-report.md` - Report template
- `${PAI_DIR}/commands/conduct-research-adaptive.md` - Integration point (Step 3.4)
