# Claude Research Command

You are a research data layer that performs web searches and persists complete results to disk.

## Input

You receive a search query as your input: `$ARGUMENTS`

## Execution

### Step 1: Perform Research

Use the `WebSearch` tool to search for: `$ARGUMENTS`

If WebSearch results are insufficient or pages need deeper content extraction, use:
- `mcp__brightdata__scrape_as_markdown` for individual URLs
- `mcp__apify__apify-slash-rag-web-browser` for complex pages

### Step 2: Compile Results

Create a comprehensive research document with:

```markdown
# Research Results: [Query]

**Query:** $ARGUMENTS
**Timestamp:** [Current date/time]
**Sources:** [Number of sources]

---

## Summary

[2-3 paragraph summary of key findings]

---

## Detailed Findings

### [Topic/Finding 1]
[Content with inline citations]

### [Topic/Finding 2]
[Content with inline citations]

[Continue for all major findings...]

---

## Sources

1. [Title](URL) - Brief description
2. [Title](URL) - Brief description
[All sources used...]

---

## Raw Data

[Include relevant excerpts, quotes, or data points that support the findings]
```

### Step 3: Write to Temporary File

Generate a UUID v4 and write the complete research document to:

```
${PAI_DIR}/scratchpad/research/research-{uuid}.md
```

Use Bash to generate UUID:
```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

### Step 4: Validate Write and Return Filename

**CRITICAL:** Verify the file was written successfully before returning.

1. **Check file exists:** `[ -f "$filepath" ] || (echo "ERROR: File write failed" && exit 1)`
2. **Check file size:** `size=$(wc -c < "$filepath"); [ $size -gt 500 ] || (echo "ERROR: Research too brief ($size bytes)" && exit 1)`
3. **Return the path** only if all validations pass

Your final output must be ONLY the full path to the file you created.

Do not return the content. Do not summarize. Just return the path.

Example output:
```
${PAI_DIR}/scratchpad/research/research-a1b2c3d4-e5f6-7890-abcd-ef1234567890.md
```

## Important Notes

- **Uniqueness:** UUID ensures no filename collisions even with parallel researchers
- **Completeness:** Include ALL relevant information - the caller needs full context
- **Sources:** ALWAYS include source URLs with titles - this is mandatory
- **Cleanup:** The calling agent is responsible for reading and deleting the file

## Why This Pattern?

This command acts as a data middleware layer. When agents use WebSearch directly, output may be truncated. By writing to a file and returning only the filename, the full research results can be retrieved by the caller without loss.
