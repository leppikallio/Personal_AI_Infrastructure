---
name: CitationValidation
description: |
  Validates research citations for accuracy and existence. Checks URLs are accessible,
  verifies content matches claimed information, converts to IEEE citation format, and
  flags fabricated or mismatched references. USE WHEN completing adaptive research
  (Step 3.4 before synthesis), when user says "validate citations", "check references",
  "verify sources", or when reviewing any research output for citation accuracy.
  Uses 1-3 parallel Sonnet agents for large citation lists. Critical for research credibility.
---

# Citation Validation Skill

## When to Activate This Skill

- Adaptive research workflow Step 3.4 (before synthesis)
- User says "validate citations", "check references", "verify sources"
- User says "are these citations real?", "validate the research"
- Before synthesizing any research with external sources
- When reviewing research output quality

## Quick Reference

### Validation Levels

| Level | Checks | Use When |
|-------|--------|----------|
| **Basic** | URL returns 200 | Quick check, trusted sources |
| **Standard** | 200 + title matches | Normal research |
| **Thorough** | 200 + content contains claims | Final research, publications |

### Status Markers

| Marker | Meaning | Synthesis Action |
|--------|---------|------------------|
| ✅ | Verified | Use confidently |
| ⚠️ | Content mismatch | Flag clearly, correct if possible |
| ❌ | Invalid/404 | Must highlight as unverified |
| 🔒 | Paywalled | Note as unverifiable |

## Core Workflow

### 1. Extract Citations
```bash
# From all research files (Wave 1 + Wave 2)
grep -E "https?://[^\s\)\]\>]+" $SESSION_DIR/wave-*/*.md | sort -u
```

### 2. Distribute to Validators
- **1-50 citations:** 1 agent
- **51-150 citations:** 2 agents (parallel)
- **151+ citations:** 3 agents (parallel)

### 3. Validate Each Citation
For each URL:
1. HTTP GET (check accessibility)
2. Fetch content (WebFetch or Brightdata)
3. Search for claimed information
4. Convert to IEEE format

### 4. Generate Report
```markdown
## Citation Validation Report
**Total:** X | **Valid:** Y (Z%) | **Invalid:** A | **Mismatch:** B
```

### 5. Flag in Synthesis
Invalid/mismatch citations MUST be visually marked in final synthesis.

## IEEE Citation Format (Quick Reference)

**Website:**
```
[1] A. Author. "Title." Site. URL (accessed Mon. Day, Year).
```

**Article:**
```
[2] A. Author, "Title," Publication, Mon. Year. [Online]. Available: URL
```

**Paper:**
```
[3] A. Author, "Title," in Proc. Conf., City, Year, pp. X-Y.
```

## Agent Launch Template

```typescript
Task({
  subagent_type: "citation-validator",  // Or use general-purpose with detailed prompt
  model: "sonnet",
  description: "Validate citations batch 1/3",
  prompt: `Validate these citations thoroughly:
    [citation list]

    For each:
    1. Check URL accessibility
    2. Fetch content
    3. Verify claimed information exists
    4. Convert to IEEE format
    5. Report status: ✅ ⚠️ ❌ 🔒
  `
})
```

## Supplementary Resources

For detailed methodology and IEEE guide: `${PAI_DIR}/skills/CitationValidation/CLAUDE.md`
For report template: `${PAI_DIR}/skills/CitationValidation/templates/validation-report.md`

## Integration with Adaptive Research

This skill is **Step 3.4** in `conduct-research-adaptive.md`:
- Runs AFTER Wave 2 (if any), BEFORE synthesis
- Sees ALL citations from all research agents
- Output feeds directly into synthesis step
- Invalid citations must be flagged in final report
