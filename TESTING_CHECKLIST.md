# Category 2 Refactoring - Testing Checklist

**Branch:** `category2-execution`
**Worktree:** `/Users/zuul/Projects/PAI-category2`
**Backup Branch:** `backup-category2-20251204-0113`

---

## Pre-Testing Verification

- [x] **Path Standardization**: 657 `${PAI_DIR}` placeholders, 4 acceptable hardcoded paths
- [x] **Identity Genericization**: 0 hardcoded identity references in active code
- [x] **Settings.json**: Valid JSON, adaptiveResearch config intact
- [x] **Hook System**: `initialize-session.ts` renamed and referenced correctly
- [x] **Environment Variable**: `PAI_DIR=/Users/zuul/Projects/PAI/.claude` confirmed

---

## Phase 1: Basic Functionality Tests

### Session Start
- [ ] Start a new Claude Code session
- [ ] Verify SessionStart hooks execute successfully
- [ ] Verify `initialize-session.ts` runs without errors
- [ ] Check status line displays correctly
- [ ] Verify CORE skill loads with {{DA}} and {{ENGINEER_NAME}} replaced

**Expected behavior:**
- Session starts cleanly
- No "PAI_DIR not set" warnings
- Status line shows current context
- CORE context loads with "Marvin" and "Petteri" names (from env vars)

### Tool Execution
- [ ] Execute Read tool on a file
- [ ] Execute Write tool to create a test file in scratchpad
- [ ] Execute Bash command (e.g., `ls ${PAI_DIR}/skills`)
- [ ] Verify hooks capture events to `history/raw-outputs/`

**Expected behavior:**
- All tools work normally
- PreToolUse and PostToolUse hooks fire
- Events logged to daily JSONL file

---

## Phase 2: Path Resolution Tests

### Environment Variable Resolution
- [ ] Check `settings.json` hooks resolve `${PAI_DIR}` correctly
- [ ] Run: `echo $PAI_DIR` in bash (should show `/Users/zuul/Projects/PAI/.claude`)
- [ ] Verify hooks can find scripts at `${PAI_DIR}/hooks/`

### TypeScript Path Resolution
- [ ] Verify observability dashboard starts: `cd ~/.claude/Observability && bun dev`
- [ ] Check console for PAI_DIR usage in file-ingest.ts
- [ ] Confirm dashboard finds today's events file

**Expected behavior:**
- All `${PAI_DIR}` references resolve to `/Users/zuul/Projects/PAI/.claude`
- No hardcoded path errors
- TypeScript files use `process.env.PAI_DIR` fallback correctly

---

## Phase 3: Identity Placeholder Tests

### Agent Invocations
- [ ] Invoke Task tool with `subagent_type: "Explore"` agent
- [ ] Check agent transcript for correct identity usage
- [ ] Verify agent refers to you as "Petteri" (from ENGINEER_NAME)
- [ ] Verify agent refers to itself as part of "Marvin" system (from DA)

### Skill Loading
- [ ] Load a custom skill (e.g., `/research`)
- [ ] Verify skill description uses "{{DA}}" placeholder format
- [ ] Check skill instructions reference {{ENGINEER_NAME}}

**Expected behavior:**
- All placeholders resolved to actual names from `settings.json` env
- No raw `{{DA}}` or `{{ENGINEER_NAME}}` strings visible to user
- System maintains personal identity throughout

---

## Phase 4: Hook System Tests

### Hook Execution
- [ ] Verify `initialize-session.ts` exists and is executable
- [ ] Check `capture-all-events.ts` logs all event types
- [ ] Verify `update-tab-titles.ts` runs on UserPromptSubmit
- [ ] Test `stop-hook.ts` captures stop events

### Hook Output
- [ ] Check `history/raw-outputs/YYYY-MM-DD_all-events.jsonl` exists
- [ ] Verify events contain `session_id`, `hook_event_type`, `timestamp`
- [ ] Check agent-sessions.json mapping file

**Expected behavior:**
- All hooks execute without errors
- Events logged in correct JSONL format
- Session tracking works correctly

---

## Phase 5: Settings.json Merge Verification

### Custom Configuration Preserved
- [ ] Verify `adaptiveResearch` block exists in settings.json
- [ ] Check rate limits for all providers (anthropic, google, perplexity, xai, apify, brightdata)
- [ ] Verify ensemble configuration: `enabled: true`, `requestsPerMinute: 10`
- [ ] Check cache configuration: `enabled: true`, `ttlHours: 24`

### Upstream Structure Adopted
- [ ] Verify `_envDocs` section documents all env vars
- [ ] Check permissions use wildcard format: `Read(*)`, `Write(*)`
- [ ] Confirm hooks reference `initialize-session.ts` (not initialize-pai-session.ts)
- [ ] Verify `enabledPlugins` includes document-skills

**Expected behavior:**
- Best of both worlds: upstream structure + custom adaptiveResearch
- All custom functionality preserved
- Clean, documented configuration

---

## Phase 6: Observability Dashboard Tests

### Path Resolution
- [ ] Start observability: `cd ~/.claude/skills/observability && bun run start-observability`
- [ ] Check server logs for PAI_DIR usage
- [ ] Verify file-ingest.ts finds events at `${PAI_DIR}/history/raw-outputs/`

### Dashboard Functionality
- [ ] Open dashboard at http://localhost:3001
- [ ] Verify events stream in real-time
- [ ] Check agent name enrichment (should show "Marvin" for main agent)
- [ ] Test todo completion detection

**Expected behavior:**
- Dashboard starts without path errors
- Events display with correct agent names
- Todo completions appear as separate events

---

## Phase 7: Documentation Accuracy

### CORE Skill References
- [ ] Read `~/.claude/skills/CORE/SKILL.md`
- [ ] Verify all `${PAI_DIR}` references are present (not hardcoded paths)
- [ ] Check documentation references use placeholders
- [ ] Verify workflow files reference generic paths

### Skill Documentation
- [ ] Spot-check 5 random skills for placeholder usage
- [ ] Verify art workflows use `{{DA}}` in signatures
- [ ] Check agent files use `{{ENGINEER_NAME}}` for user references

**Expected behavior:**
- All documentation location-agnostic
- No user-specific references in markdown
- Clean, portable documentation

---

## Phase 8: Regression Tests

### Existing Functionality
- [ ] Test research workflow: `/conduct-research "test query"`
- [ ] Test art workflow: Create a simple diagram
- [ ] Test parallel agents: Launch 3 intern agents
- [ ] Test voice integration (if applicable)

### Critical Paths
- [ ] Git workflow: Create a test commit
- [ ] MCP server: Test context7 or Ref lookup
- [ ] Fabric integration: Run a fabric pattern
- [ ] File organization: Create file in scratchpad, move to history

**Expected behavior:**
- All existing workflows function normally
- No regressions from refactoring
- System behaves identically to pre-refactor

---

## Phase 9: Edge Cases

### Missing Environment Variables
- [ ] Temporarily unset `DA` env var, verify fallback behavior
- [ ] Temporarily unset `PAI_DIR`, verify fallback to `~/.claude`
- [ ] Check error messages are helpful

### Path Conflicts
- [ ] Verify no conflicts between `${PAI_DIR}` and hardcoded paths
- [ ] Test with different PAI_DIR value (if safe to do so)
- [ ] Confirm pai-paths library comments don't break anything

**Expected behavior:**
- Graceful fallbacks for missing env vars
- Clear error messages if something goes wrong
- System remains stable

---

## Success Criteria

**All tests must pass before merging to main:**

1. ✅ Session starts without errors
2. ✅ All hooks execute successfully
3. ✅ Path resolution works throughout system
4. ✅ Identity placeholders resolve correctly
5. ✅ Observability dashboard functions normally
6. ✅ No regressions in existing workflows
7. ✅ Documentation is accurate and portable
8. ✅ adaptiveResearch configuration intact

---

## If Tests Fail

1. **Document the failure** in this checklist
2. **Do NOT merge** to main
3. **Fix the issue** in the `category2-execution` branch
4. **Re-test** the affected area
5. **Get approval** before attempting merge again

---

## Post-Testing: Merge Instructions

**Only proceed if ALL tests pass:**

```bash
# 1. Switch back to main
cd /Users/zuul/Projects/PAI
git checkout main

# 2. Merge category2-execution branch
git merge category2-execution

# 3. Verify one final time
git status
git log -1

# 4. Push to remote (with approval)
git push origin main

# 5. Clean up worktree (optional, can keep for reference)
git worktree remove /Users/zuul/Projects/PAI-category2
```

---

## Notes

- **Backup branch** `backup-category2-20251204-0113` preserved for emergency rollback
- **Worktree location**: `/Users/zuul/Projects/PAI-category2` (isolated, safe to test)
- **Main repo**: `/Users/zuul/Projects/PAI` (untouched, production-safe)
- **Testing timeline**: Complete all phases before considering merge
- **Approval required**: Do NOT push to remote without explicit user confirmation

---

**Testing started:** _[To be filled in by user]_
**Testing completed:** _[To be filled in by user]_
**Result:** _[PASS/FAIL]_
**Notes:** _[Any observations or issues]_
