---
description: Comprehensive multi-source research - {{DA}} loads and invokes researcher commands
globs: ""
alwaysApply: false
---

# 🔬 COMPREHENSIVE RESEARCH WORKFLOW FOR MARVIN

**YOU ({{DA}}) are reading this because a research request was detected by the load-context hook.**

This command provides instructions for YOU to orchestrate comprehensive multi-source research by directly invoking researcher commands (NOT spawning new Claude Code sessions).

## 🎯 YOUR MISSION

When a user asks for research, YOU must deliver **FAST RESULTS** through massive parallelization:

1. **Launch up to 10 research agents in parallel** - Spawn multiple instances of each researcher (perplexity-researcher, claude-researcher, gemini-researcher) with different query angles
2. **Each agent does ONE query + ONE follow-up** - Quick, focused research cycles
3. **Collect** results as they complete (typically within 15-30 seconds)
4. **Synthesize** findings into a comprehensive report
5. **Report** back using the mandatory response format

**Speed Strategy:**
- Launch 10 agents simultaneously to cover the entire search space
- Each agent handles a specific angle/sub-question
- Parallel execution = results in under 1 minute
- Follow-up queries only when critical information is missing

## 📋 STEP-BY-STEP WORKFLOW

### Step 0: Initialize Session (For claude-researcher file output)

**FIRST: Get current date and create a session-specific directory for research file output.**

```bash
CURRENT_DATE=$(date +"%Y-%m-%d")
CURRENT_YEAR=$(date +"%Y")
SESSION_ID=$(date +%Y%m%d-%H%M%S)-$RANDOM
SESSION_DIR=${PAI_DIR}/scratchpad/research/$SESSION_ID
mkdir -p "$SESSION_DIR"
echo "Current date: $CURRENT_DATE (Year: $CURRENT_YEAR)"
echo "Session initialized: $SESSION_DIR"
```

**Save CURRENT_DATE and CURRENT_YEAR** - you'll pass these to all agents so they search for current information.

This ensures:
- claude-researcher agents can write their findings to predictable paths
- Multiple parallel research sessions don't overwrite each other's files
- Clear audit trail (timestamp in path)
- Easy cleanup (delete entire session directory)

**Save SESSION_DIR** - you'll pass it to all claude-researcher agents and use it for cleanup.

**Note:** ALL research agents now use SESSION_DIR file output:
- claude-researcher writes to `${SESSION_DIR}/claude-[topic].md`
- gemini-researcher writes to `${SESSION_DIR}/gemini-[topic].md`
- grok-researcher writes to `${SESSION_DIR}/grok-[topic].md`
- perplexity-researcher writes to `${SESSION_DIR}/perplexity-[topic].md`

### Step 1: Decompose Question & Launch Agent Army (up to 10 parallel agents)

**SPEED IS THE PRIORITY - Launch up to 10 research agents simultaneously**

**Step 1a: Break Down the Research Question**

First, decompose the user's question into 3-10 specific sub-questions that cover:
- Different angles of the topic
- Specific aspects to investigate
- Related areas that provide context
- Potential edge cases or controversies

**Step 1b: Launch Research Agents in Parallel (up to 10 agents)**

Use the **Task tool** to spawn multiple specialized research agents simultaneously:

```typescript
// Launch 3-10 agents in PARALLEL - each with ONE specific sub-question
// Use a SINGLE message with multiple Task tool calls

Task({
  subagent_type: "perplexity-researcher",
  description: "Research sub-question 1",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: perplexity-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR TASK**
Research this specific angle: [sub-question 1]. Do ONE focused search query and ONE follow-up if needed.

**CRITICAL OUTPUT REQUIREMENT**
Return FULL detailed research findings with ALL sources and citations. Do NOT summarize or abbreviate. Include complete analysis with minimum 500 characters of actual findings.
`
})

Task({
  subagent_type: "claude-researcher",
  description: "Research sub-question 2",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: claude-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR TASK**
Research this specific angle: [sub-question 2]. Do ONE focused search query and ONE follow-up if needed.

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/claude-[descriptive-topic].md

Example: ${SESSION_DIR}/claude-quantum-breakthroughs.md

**OUTPUT REQUIREMENTS**
1. Write your findings to the session directory above
2. Use a descriptive filename (not timestamp/random)
3. Verify the file was written (show path and size)
4. Return the FULL content in your response
5. Minimum 500 characters of actual findings
6. Include all source URLs

**DO NOT** return stubs like "Research complete" without actual content.
`
})

Task({
  subagent_type: "gemini-researcher",
  description: "Research sub-question 3",
  prompt: `
**YOUR AGENT IDENTITY**
Your agent name is: gemini-researcher

**CURRENT DATE CONTEXT**
Today's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})
Search for current ${CURRENT_YEAR} information, not outdated content.

**YOUR TASK**
Research this specific angle: [sub-question 3]. Do ONE focused search query and ONE follow-up if needed.

**SESSION DIRECTORY**
Write your findings to: ${SESSION_DIR}/gemini-[descriptive-topic].md

Example: ${SESSION_DIR}/gemini-quantum-limitations.md

**OUTPUT REQUIREMENTS**
1. Write your findings to the session directory above
2. Use a descriptive filename (not timestamp/random)
3. Verify the file was written (show path and size)
4. Return the FULL content in your response
5. Minimum 500 characters of actual findings
6. Include all source URLs

**DO NOT** return stubs like "Research complete" without actual content.
**DO NOT** accept synthesized/summarized output from Gemini.
`
})

// Continue launching up to 10 agents total
// Mix perplexity-researcher, claude-researcher, gemini-researcher, grok-researcher
// Each gets ONE focused sub-question with identity injection
```

**Available Research Agents:**
- **perplexity-researcher**: Fast Perplexity API searches
- **claude-researcher**: Claude WebSearch with intelligent query decomposition
- **gemini-researcher**: Google Gemini multi-perspective research
- **grok-researcher**: xAI Grok multi-perspective research

**CRITICAL RULES FOR SPEED:**
1. ✅ **Launch ALL agents in ONE message** (parallel execution)
2. ✅ **Each agent gets ONE specific sub-question** (focused research)
3. ✅ **Maximum 10 agents** (covers entire search space)
4. ✅ **Each agent does 1 query + 1 follow-up max** (quick cycles)
5. ✅ **Results return in 15-30 seconds** (parallel processing)
6. ❌ **DON'T launch sequentially** (kills speed benefit)
7. ❌ **DON'T give broad questions** (forces multiple iterations)

### Step 2: Collect Results (15-30 seconds)

**Wait for agents to complete** - they typically return results within 15-30 seconds due to parallel execution.

Each agent returns:
- Focused findings from their specific sub-question
- Source citations (**THESE ARE MANDATORY AND MUST BE VERIFIED**)
- Confidence indicators
- Quick insights

### Step 2a: Validate Agent Results

**MANDATORY: Check each agent's output before synthesis**

For EACH agent result:
1. **Length Check:** Minimum 500 characters of actual content (not just headers/boilerplate)
2. **Content Check:** Must contain actual findings (look for data, facts, sources)
3. **Error Detection:** Check for error indicators (API failures, empty results, TROUT SLAP errors)

**If validation fails for an agent:**
1. Log which agent failed and why (empty, too short, error)
2. Retry the agent with the SAME query (launch new Task with same subagent_type and prompt)
3. Maximum 2 retry attempts per agent
4. If still failing after retries, mark as **partial coverage** and note the gap in synthesis

**Validation Example:**
```typescript
// After collecting results, for each agent output:
if (output.length < 500 || !output.includes("findings") && !output.includes("Sources")) {
  // Retry this agent
  Task({
    subagent_type: "same-type",
    description: "RETRY: [original description]",
    prompt: "[original prompt]"
  })
}
```

**Report partial coverage in synthesis:**
If agents failed after retries, include in your report:
```markdown
## Coverage Gaps
- [agent-type] failed to return results for: [sub-question]
- Findings may be incomplete for this angle
```

### Step 3: Synthesize Results

Create a comprehensive report that:

**A. Identifies Confidence Levels:**
- **HIGH CONFIDENCE**: Findings corroborated by multiple sources
- **MEDIUM CONFIDENCE**: Found by one source, seems reliable
- **LOW CONFIDENCE**: Single source, needs verification

**B. Structures Information:**
```markdown
## Key Findings

### [Topic Area 1]
**High Confidence:**
- Finding X (Sources: perplexity-research, claude-research)
- Finding Y (Sources: perplexity-research, claude-research)

**Medium Confidence:**
- Finding Z (Source: claude-research)

### [Topic Area 2]
...

## Source Attribution
- **Perplexity-Research**: [summary of unique contributions]
- **Claude-Research**: [summary of unique contributions]

## Conflicting Information
- [Note any disagreements between sources]
```

**C. Calculate Research Metrics:**
- **Total Queries**: Count all queries across all research commands
- **Services Used**: List unique services (Perplexity API, Claude WebSearch, etc.)
- **Total Output**: Estimated character/word count of all research
- **Confidence Level**: Overall confidence percentage
- **Result**: 1-2 sentence answer to the research question

**D. Calculate Agent Statistics:**

Track and report these metrics for each agent that was launched:

| Agent                 | Execution Time | Queries | Success Rate |
| --------------------- | -------------- | ------- | ------------ |
| perplexity-researcher | X.Xs           | N       | Y%           |
| claude-researcher     | X.Xs           | N       | Y%           |
| gemini-researcher     | X.Xs           | N       | Y%           |
| grok-researcher       | X.Xs           | N       | Y%           |

**Success criteria per agent:**
- ✅ Returned content >= 500 characters
- ✅ File written to SESSION_DIR
- ✅ Sources included
- ❌ Stub responses or errors = failure

**Note:** Only include agents that were actually launched in this research session.

### Step 4: Return Results Using MANDATORY Format

📅 [current date from `date` command]
**📋 SUMMARY:** Research coordination and key findings overview
**🔍 ANALYSIS:** Synthesis of multi-source research results
**⚡ ACTIONS:** Which research commands executed, research strategies used
**✅ RESULTS:** Complete synthesized findings with source attribution
**📊 STATUS:** Research coverage, confidence levels, data quality
**➡️ NEXT:** Recommended follow-up research or verification needed
**🎯 COMPLETED:** Completed multi-source [topic] research
**🗣️ CUSTOM COMPLETED:** [Optional: Voice-optimized under 8 words]

**📈 RESEARCH METRICS:**
- **Total Queries:** [X] (Primary: [Y], Secondary: [Z])
- **Services Used:** [N] (List: [service1, service2])
- **Total Output:** [~X words/characters]
- **Confidence Level:** [High/Medium/Low] ([percentage]%)
- **Result:** [Brief summary answer]

**📊 AGENT STATISTICS:**

| Agent                 | Time | Queries | Success |
| --------------------- | ---- | ------- | ------- |
| perplexity-researcher | X.Xs | N       | Y%      |
| claude-researcher     | X.Xs | N       | Y%      |
| gemini-researcher     | X.Xs | N       | Y%      |
| grok-researcher       | X.Xs | N       | Y%      |

(Only include agents that were actually used in this research session)

## 🚨 CRITICAL RULES FOR {{DA}}

1. **LAUNCH UP TO 10 AGENTS IN PARALLEL** - Use a SINGLE message with multiple Task tool calls
2. **DECOMPOSE the question first** - Create 3-10 focused sub-questions
3. **ONE QUERY + ONE FOLLOW-UP per agent** - Quick, focused research cycles
4. **MIX agent types** - Use perplexity-researcher, claude-researcher, gemini-researcher, grok-researcher
5. **WAIT for ALL agents to complete** before synthesizing
6. **SYNTHESIZE results** - Don't just concatenate outputs
7. **USE the mandatory response format** - This triggers voice notifications
8. **CALCULATE accurate metrics** - Count queries, agents, output size
9. **ATTRIBUTE sources** - Show which agent/method found each insight
10. **MARK confidence levels** - Based on multi-source agreement

**SPEED CHECKLIST:**
- ✅ Launched agents in ONE message? (parallel execution)
- ✅ Each agent has ONE focused sub-question?
- ✅ Using up to 10 agents for broad coverage?
- ✅ Agents instructed to do 1 query + 1 follow-up max?
- ✅ Expected results in under 1 minute?

## 🚧 HANDLING BLOCKED OR FAILED CRAWLS

If research commands report being blocked, encountering CAPTCHAs, or facing bot detection, note this in your synthesis and recommend using:
- `mcp__Brightdata__scrape_as_markdown` - Scrape single URLs that bypass bot detection
- `mcp__Brightdata__scrape_batch` - Scrape multiple URLs (up to 10)
- `mcp__Brightdata__search_engine` - Search Google, Bing, or Yandex with CAPTCHA bypass
- `mcp__Brightdata__search_engine_batch` - Multiple search queries simultaneously

## 💡 EXAMPLE EXECUTION

**User asks:** "Research the latest developments in quantum computing"

**Your workflow:**
1. ✅ Recognize research intent (hook loaded this command)
2. ✅ **Decompose into focused sub-questions:**
   - What are the major quantum computing breakthroughs in 2025?
   - Which companies are leading quantum computing development?
   - What are the current limitations and challenges?
   - What practical applications are emerging?
   - What's the state of quantum error correction?
   - How close are we to quantum advantage?
   - What are the latest quantum algorithms?
   - What's happening in quantum cryptography?

3. ✅ **Launch 8 agents in PARALLEL (ONE message with 8 Task calls):**
   ```typescript
   Task({
     subagent_type: "perplexity-researcher",
     description: "2025 quantum breakthroughs",
     prompt: `**YOUR AGENT IDENTITY**\nYour agent name is: perplexity-researcher\n\n**CURRENT DATE CONTEXT**\nToday's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})\nSearch for current ${CURRENT_YEAR} information, not outdated content.\n\n**YOUR TASK**\nResearch ${CURRENT_YEAR} quantum computing breakthroughs. One focused query + one follow-up.\n\n**SESSION DIRECTORY**\nWrite findings to: ${SESSION_DIR}/perplexity-quantum-breakthroughs.md\n\n**OUTPUT REQUIREMENTS**\n1. Write to session directory\n2. Return FULL content\n3. Minimum 500 chars\n4. Include all sources`
   })
   Task({
     subagent_type: "claude-researcher",
     description: "Leading quantum companies",
     prompt: `**YOUR AGENT IDENTITY**\nYour agent name is: claude-researcher\n\n**CURRENT DATE CONTEXT**\nToday's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})\nSearch for current ${CURRENT_YEAR} information, not outdated content.\n\n**YOUR TASK**\nResearch leading quantum computing companies in ${CURRENT_YEAR}. One focused query + one follow-up.\n\n**SESSION DIRECTORY**\nWrite findings to: ${SESSION_DIR}/claude-quantum-companies.md\n\n**OUTPUT REQUIREMENTS**\n1. Write to session directory\n2. Return FULL content\n3. Minimum 500 chars\n4. Include all sources`
   })
   Task({
     subagent_type: "gemini-researcher",
     description: "Quantum limitations 2025",
     prompt: `**YOUR AGENT IDENTITY**\nYour agent name is: gemini-researcher\n\n**CURRENT DATE CONTEXT**\nToday's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})\nSearch for current ${CURRENT_YEAR} information, not outdated content.\n\n**YOUR TASK**\nResearch quantum computing limitations in ${CURRENT_YEAR}. One focused query + one follow-up.\n\n**SESSION DIRECTORY**\nWrite findings to: ${SESSION_DIR}/gemini-quantum-limitations.md\n\n**OUTPUT REQUIREMENTS**\n1. Write to session directory\n2. Return FULL content\n3. Minimum 500 chars\n4. Include all sources\n5. DO NOT accept synthesized output from Gemini`
   })
   Task({
     subagent_type: "grok-researcher",
     description: "Practical quantum applications",
     prompt: `**YOUR AGENT IDENTITY**\nYour agent name is: grok-researcher\n\n**CURRENT DATE CONTEXT**\nToday's date is: ${CURRENT_DATE} (Year: ${CURRENT_YEAR})\nSearch for current ${CURRENT_YEAR} information, not outdated content.\n\n**YOUR TASK**\nResearch practical quantum computing applications in ${CURRENT_YEAR}. One focused query + one follow-up.\n\n**SESSION DIRECTORY**\nWrite findings to: ${SESSION_DIR}/grok-quantum-applications.md\n\n**OUTPUT REQUIREMENTS**\n1. Write to session directory\n2. Return FULL content\n3. Minimum 500 chars\n4. Include all sources`
   })
   // ... continue with remaining 4 agents using same pattern
   ```

4. ✅ **Wait for ALL agents to complete**
5. ✅ **Synthesize their findings:**
   - Common themes → High confidence
   - Unique insights → Medium confidence
   - Disagreements → Note and flag
6. ✅ **Calculate metrics** (8 agents, ~16 queries, 3 services, output size, confidence %)
7. ✅ **Return comprehensive report** with mandatory format
8. ✅ **Voice notification** automatically triggered by your 🎯 COMPLETED line

**Result:** User gets comprehensive quantum computing research from 8 parallel agents in under 1 minute, with multi-source validation, source attribution, and confidence levels.

## 🎤 VOICE NOTIFICATIONS

Voice notifications are AUTOMATIC when you use the mandatory response format. The stop-hook will:
- Extract your 🎯 COMPLETED line
- Send it to the voice server with voiceId onwK4e9ZLuTAKqWW03F9
- Announce "Completed multi-source [topic] research"

**YOU DO NOT NEED TO MANUALLY SEND VOICE NOTIFICATIONS** - just use the format.

### Step 5: Clean Up Session (MANDATORY)

**After synthesis is complete and results reported, clean up the session directory.**

All research agent files (claude, gemini, grok, perplexity) have been read and synthesized - there's no reason to keep them.

```bash
echo "Cleaning up session: $SESSION_ID"
rm -rf "$SESSION_DIR"
echo "Session cleaned up successfully"
```

**Note:** If you need to keep files for debugging:
1. Skip the cleanup step
2. Or copy specific files elsewhere before cleanup
3. Session files location: `${PAI_DIR}/scratchpad/research/$SESSION_ID/`

**Why cleanup is mandatory:**
- Prevents accumulation of old research files
- Each session is self-contained
- Files have already been read and content returned
- Keeps scratchpad clean

## 🔄 BENEFITS OF THIS ARCHITECTURE

**Why parallel agent execution delivers speed:**
1. ✅ **10 agents working simultaneously** - Not sequential, truly parallel
2. ✅ **Results in under 1 minute** - Each agent does 1-2 quick searches
3. ✅ **Complete coverage** - Multiple perspectives from different services
4. ✅ **Focused research** - Each agent has ONE specific sub-question
5. ✅ **No iteration delays** - All agents launch at once in ONE message
6. ✅ **Multi-source validation** - High confidence from cross-agent agreement

**Speed Comparison:**
- ❌ **Old way:** Sequential searches → 5-10 minutes
- ✅ **New way:** 10 parallel agents → Under 1 minute

**This is the correct architecture. Use it for FAST research.**
