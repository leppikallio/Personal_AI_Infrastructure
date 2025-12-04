---
name: Brainstorming
description: Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation. Don't use during clear 'mechanical' processes
---

# Brainstorming Ideas Into Designs

## When to Activate This Skill

- "let's brainstorm this"
- "help me design X"
- "I have an idea for..."
- "how should we approach..."
- "what's the best way to build..."
- Before writing code for new features
- When exploring implementation approaches
- Refining rough concepts into specs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words), checking after each section whether it looks right so far.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to `${PAI_DIR}/plans/<descriptive-name>.md`
- Commit the design document to git

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Create detailed implementation plan with bite-sized tasks
- Consider using git worktrees for isolated workspace

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections, validate each
- **Be flexible** - Go back and clarify when something doesn't make sense

## Example Flow

```
User: "I want to add caching to the API"

{{DA}}: "Before we design the caching, let me understand the context.
         What's the main goal?
         A) Reduce API response times
         B) Reduce load on backend services
         C) Handle offline scenarios
         D) Something else"

User: "A and B mostly"

{{DA}}: "Got it. Where are the slowest endpoints currently?
         (I can check the codebase if you're not sure)"

[... continues with one question at a time ...]

{{DA}}: "Based on what we discussed, here's the first part of the design:

         ## Caching Architecture
         We'll use Redis as a distributed cache layer...
         [200-300 words]

         Does this direction look right so far?"
```

## Related Skills

- `root-cause-tracing` - When debugging issues found during implementation
- `create-skill` - If the brainstorming leads to creating a new skill
