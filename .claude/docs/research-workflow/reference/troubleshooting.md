# Troubleshooting

Common issues and solutions for the research workflow.

## Phase 1 Issues

### Query Analysis Fails

**Symptom:** "FATAL ERROR: Analyzer returned empty output"

**Causes:**
- Query too short or vague
- Analyzer TypeScript error
- Missing dependencies

**Solutions:**
1. Provide more specific query
2. Check analyzer logs: `bun ~/.claude/utilities/query-analyzer/query-analyzer.ts --perspectives "test query"`
3. Reinstall dependencies: `cd ~/.claude/utilities/query-analyzer && bun install`

### Security Validation Fails

**Symptom:** "SECURITY VALIDATION FAILED"

**Causes:**
- Query contains suspicious patterns
- False positive on legitimate content

**Solutions:**
1. Rephrase query to avoid injection-like patterns
2. Remove special characters or code snippets from query
3. Check sanitizer patterns in `~/.claude/utilities/input-sanitizer/`

### Invalid JSON

**Symptom:** "FATAL ERROR: Analyzer returned invalid JSON"

**Causes:**
- Analyzer produced malformed output
- Truncated response

**Solutions:**
1. Run analyzer directly to see raw output
2. Check for model rate limiting
3. Simplify query complexity

## Phase 2 Issues

### No Agents Complete

**Symptom:** Wave 1 produces no output files

**Causes:**
- Agent launch failures
- Network issues
- Model availability

**Solutions:**
1. Check agent definitions exist in `~/.claude/agents/`
2. Verify network connectivity
3. Check model API status

### All Citations Invalid

**Symptom:** "Hallucination rate exceeds 30%"

**Causes:**
- Agents produced fake URLs
- Network blocked URL validation
- Source sites unreachable

**Solutions:**
1. Review agent outputs for URL quality
2. Check if validation can reach external URLs
3. Increase validation timeout

### Pivot Always Triggers

**Symptom:** Wave 2 runs even when Wave 1 looks complete

**Causes:**
- Quality thresholds too strict
- Coverage calculation incorrect
- Perspective matching too rigid

**Solutions:**
1. Review `pivot-decision.json` for trigger reasons
2. Adjust thresholds in quality analyzer
3. Check perspective count matches expectations

### Pivot Never Triggers

**Symptom:** Wave 2 never runs despite obvious gaps

**Causes:**
- Quality thresholds too lenient
- Pivot logic bypassed
- Missing trigger conditions

**Solutions:**
1. Review quality-analysis.json metrics
2. Check pivot decision engine logic
3. Manually verify coverage claims

## Phase 3 Issues

### Synthesis Missing Parts

**Symptom:** Final output lacks Part I-VI structure

**Causes:**
- Agent ignored format instructions
- Context overflow truncated template
- Wrong agent definition used

**Solutions:**
1. Check cross-perspective-synthesizer agent definition
2. Verify summaries aren't too large (should be ~4KB each)
3. Review synthesis review feedback

### Low Citation Utilization

**Symptom:** "<40% citation utilization"

**Causes:**
- Synthesis ignored available citations
- Citations poorly matched to content
- Summary lost citation mappings

**Solutions:**
1. Check unified-citations.md is complete
2. Verify summaries preserve citation references
3. Review synthesis for citation-free paragraphs

### Review Loop Exhausted

**Symptom:** "Iteration 5 reached without approval"

**Causes:**
- Systematic issues with synthesis
- Reviewer criteria too strict
- Synthesis agent not processing feedback

**Solutions:**
1. Review each iteration's feedback
2. Check if issues are actually fixable
3. Manually review final output

### Summaries Not Produced

**Symptom:** `summaries/` directory empty

**Causes:**
- Parallel summarization failed
- No wave files to summarize
- Agent spawn failures

**Solutions:**
1. Check wave-1/ and wave-2/ have content
2. Verify perspective-summarizer agent works
3. Check for Task tool errors

## Phase 4 Issues

### Validation Rejects Output

**Symptom:** Hard failure on final validation

**Causes:**
- Missing structure parts
- Zero citations
- Track imbalance

**Solutions:**
1. Review validation-report.md for specifics
2. Check synthesis actually has content
3. Return to Phase 3 for revision

### Soft Failures Ignored

**Symptom:** Output has warnings but issues remain

**Causes:**
- Marginal utilization accepted
- Minor imbalance tolerated
- Expected behavior for edge cases

**Solutions:**
1. Review warnings in validation report
2. Decide if manual intervention needed
3. Adjust thresholds if too permissive

## General Issues

### Session Directory Not Found

**Symptom:** "SESSION_DIR does not exist"

**Causes:**
- Phase 1 didn't complete
- Path variable not set
- Directory deleted mid-run

**Solutions:**
1. Restart from Phase 1
2. Check environment variables
3. Create directory manually if needed

### Out of Context

**Symptom:** Agent responses truncated or confused

**Causes:**
- Too many perspectives
- Wave files too large
- Summary condensation failed

**Solutions:**
1. Reduce perspective count
2. Ensure parallel summarization runs
3. Check summary sizes (<5KB target)

### Slow Performance

**Symptom:** Research takes much longer than expected

**Causes:**
- Too many agents launched
- Wave 2 running unnecessarily
- URL validation slow

**Solutions:**
1. Review agent allocation
2. Tune pivot decision thresholds
3. Add timeout to URL validation

## Diagnostic Commands

Check session status:
```bash
ls -la $SESSION_DIR
```

View quality analysis:
```bash
cat $SESSION_DIR/analysis/quality-analysis.json | jq .
```

Check pivot decision:
```bash
cat $SESSION_DIR/analysis/pivot-decision.json | jq .
```

Count citations:
```bash
grep -c "^\[" $SESSION_DIR/analysis/unified-citations.md
```

Verify synthesis structure:
```bash
grep "## Part" $SESSION_DIR/synthesis/final-synthesis.md
```

## Getting Help

If issues persist:

1. Collect diagnostic output from commands above
2. Note the SESSION_DIR path
3. Include the original query
4. Check for patterns across multiple runs

---

Back to: [README](../README.md)
