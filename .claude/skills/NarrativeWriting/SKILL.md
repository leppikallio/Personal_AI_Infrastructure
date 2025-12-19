---
name: NarrativeWriting
description: Write Wodehouse-inspired blog narratives with Petteri/Marvin dialogue. USE WHEN user wants to write narrative blog posts, create dialogue scenes, draft story content for tuonela blog, OR mentions Wodehouse style, Petteri/Marvin conversations, or narrative drafting.
---

# NarrativeWriting

Write blog narratives in a modern Wodehouse homage style, featuring Petteri (the developer) and Marvin (the AI assistant) in witty dialogue that captures technical journeys.

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName NarrativeWriting
```

| Workflow | Trigger | File |
|----------|---------|------|
| **DraftScene** | "write a scene", "draft narrative" | `workflows/DraftScene.md` |
| **EditScene** | "edit scene", "revise narrative" | `workflows/EditScene.md` |

---

## FOUNDATIONAL RULE: Don't Write Like AI

**This is the most important constraint.** Before any other style consideration, eliminate AI writing patterns. Human readers detect AI prose instantly. It kills engagement.

### AI Tells to ELIMINATE

| Pattern | Example | Why It Fails |
|---------|---------|--------------|
| **List structures** | "There were three issues: first... second... third..." | AI default formatting, even when disguised as prose |
| **Em-dash overuse** | "The code—surprisingly—worked" | Every AI does this. Readers notice. |
| **Parallel construction** | "Not just X but Y. Not only A but B." | Mechanical rhythm screams "generated" |
| **Hedging language** | "perhaps," "it's worth noting," "one might argue" | Non-committal AI-speak. Have opinions. |
| **Summary paragraphs** | "In summary, we learned that..." | Padding, not narrative. Delete these. |
| **Even pacing** | Every paragraph ~same length | Robotic feel. Humans are messier. |

### REPLACE WITH

| Human Pattern | What It Looks Like |
|---------------|-------------------|
| **Messy transitions** | Jump between thoughts. Readers follow. |
| **Mid-thought sentences** | Start in the middle of an idea sometimes |
| **Varied paragraph lengths** | One sentence. Then three. Then two short ones. |
| **Flat opinions** | "This was wrong" not "It could be argued this was suboptimal" |
| **Run-ons** | Let thoughts tumble together when the moment calls for momentum and you want the reader breathless |
| **Fragments** | Useful. Sometimes. Here too. |
| **Wodehouse rhythm** | Interruptions, asides, tangents that circle back eventually |

### Self-Check Before Finalizing

Read the draft aloud. If it sounds like an AI wrote it, it probably does. Specifically:

1. **Count the em-dashes.** More than 2 per 500 words? Too many.
2. **Find any lists.** Convert to flowing prose or delete.
3. **Spot the hedges.** "Perhaps" and "it's worth noting" are red flags.
4. **Check paragraph lengths.** If they're all similar, vary them.
5. **Look for summaries.** "In conclusion" or "To summarize" = delete the whole paragraph.

---

## Examples

**Example 1: Draft a mistake/fumble scene**
```
User: "Write a narrative scene about the time I forgot to handle null values"
→ Invokes DraftScene workflow
→ Opens with Petteri's overconfidence ("The validation was airtight...")
→ Marvin diplomatically reveals the oversight
→ Self-deprecating realization, witty closer
→ Returns 500-800 word scene in Wodehouse style
```

**Example 2: Draft a success/insight scene**
```
User: "Write about choosing Redis over in-memory caching"
→ Invokes DraftScene workflow
→ Shows initial temptation (simpler option)
→ Marvin explains implications without overriding
→ Petteri makes the right call
→ Light self-deprecation at the end ("It wouldn't last, of course")
```

**Example 3: Draft a problem-solving dialogue**
```
User: "Write about how we figured out the race condition"
→ Invokes DraftScene workflow
→ Back-and-forth collaborative discovery
→ Neither character "wins" - they build on each other
→ Ends with broader insight or principle
```

---

## The Style: Modern Wodehouse Homage

### Characters

| Character | Role | Inspired By | Voice |
|-----------|------|-------------|-------|
| **Petteri** | Developer/narrator | Bertie Wooster | Enthusiastic, owns mistakes cheerfully, occasional brilliant ideas |
| **Marvin** | AI assistant | Jeeves | Quietly competent, diplomatic corrections, dry wit, sees pitfalls |

### Fidelity Level: Modern Homage

- Keep the dynamic and wit
- Use contemporary language (no "I say, what ho")
- Technical content stays accessible
- Self-deprecation is fully Bertie ("I had what I thought was a masterstroke...")

### What Makes It Work

1. **The fumbles are real** - Tech blogs rarely show mistakes; this is differentiated
2. **Learning journey, not tutorial** - We're not pretending to be authorities
3. **Humor makes density accessible** - Serious topics land better with wit
4. **Session logs have this naturally** - We're formalizing what already exists

---

## Style Rules

### DO

- **Open with overconfidence** (for mistake scenes): "The implementation was elegant, if I say so myself"
- **Marvin delivers bad news diplomatically**: "There is one small matter..."
- **Self-deprecate cheerfully**: "The celebratory coffee feeling evaporated rather quickly"
- **End with dry wit**: "Perhaps. Though footguns typically require someone to pull the trigger"
- **Let Marvin have the last word** (often)
- **Describe code in plain language**: "Four sensible entries, and then `public` tagged on at the end"
- **Use inline code for terms only**: `public`, `w400`, `HMAC-SHA256` (backticks, not blocks)

### DON'T

- **No code blocks** - Reserved for technical posts only
- **No tutorial voice** - We're not teaching, we're sharing a journey
- **No excessive jargon** - If a term needs explaining, explain it in dialogue
- **No making Petteri incompetent** - He makes mistakes, but he's capable
- **No making Marvin smug** - Helpful, not superior
- **No losing the wit** - If it's not at least a little funny, revise

### Scene Length

| Type | Target | Range |
|------|--------|-------|
| Mistake/fumble | 600 words | 500-700 |
| Success/insight | 600 words | 500-700 |
| Problem-solving | 750 words | 650-850 |

---

## Calibration Scenes

Four scenes that demonstrate the exact style. Full text in `samples/` directory.

**⚠️ Context Management:** The full scenes below are ~2,500 words total. If context is tight:
1. Read only the scene type you're writing (mistake, success, or problem-solving)
2. Or read just the "What this demonstrates" notes at the end of each scene
3. Full scenes available at: `samples/scene-*.md`

| Scene | Type | File | Words |
|-------|------|------|-------|
| The Public Variant Discovery | Mistake/fumble | `samples/scene-01-public-variant.md` | ~600 |
| Named Variants Over Flexible | Success/insight | `samples/scene-02-named-variants.md` | ~600 |
| The Wave 2 Pivot Problem | Problem-solving | `samples/scene-03-wave2-pivot.md` | ~750 |
| The Three-Hour Debugging Session | Problem-solving | `samples/scene-04-ssr-debugging.md` | ~800 |

### Scene Type 1: Mistake/Fumble

**"The Public Variant Discovery"** - Overconfidence deflated by overlooked detail

> The signed URLs were working beautifully. HMAC-SHA256 for images, RS256 JWT for videos - the whole cryptographic apparatus humming along like a well-oiled machine. I was rather pleased with myself, if I'm honest.
>
> "The implementation looks solid," Marvin confirmed, having just run through the verification checklist. "Images return 403 without valid signatures. Videos require JWT tokens. Rate limiting is active on both endpoints."
>
> I leaned back, contemplating whether this called for a celebratory coffee. Security hardening complete. Bandwidth scrapers thwarted. Egress costs contained. The sort of morning that makes a developer feel like a responsible adult.
>
> "There is," Marvin continued, in that tone I'd come to recognize as the diplomatic throat-clearing before unwelcome news, "one small matter that might warrant attention."
>
> "Oh?"
>
> "The variant allowlist in the image signing function. I notice it includes `w400`, `w800`, `w1600`, `w2400` - the responsive breakpoints we configured."
>
> "Yes, that's the point. Named variants only. No arbitrary width requests sneaking past."
>
> "Indeed. It also includes `public`."
>
> I stared at the code. There it was, sitting innocently in the list of allowed variants like it belonged there. Four sensible entries - the responsive image sizes we'd carefully configured - and then `public`, tagged on at the end like an afterthought.
>
> "That's... that's for the dashboard preview, I think? Cloudflare's default variant?"
>
> "It is. It's also a variant that bypasses signing entirely. Any image requested with the `public` variant serves without signature verification."
>
> The celebratory coffee feeling evaporated rather quickly.
>
> "So you're telling me," I said slowly, working through the implications, "that I've spent the morning implementing cryptographic signatures on every image endpoint, and anyone who simply adds `public` to the URL gets in anyway?"
>
> "That would be an accurate summary, yes."
>
> I pulled up the Cloudflare Images dashboard, hoping against hope that maybe the `public` variant didn't actually exist in our account. It did. Of course it did. Sitting there with its smug little checkbox, completely bypassing the security layer I'd been so proud of ten minutes ago.
>
> "This is rather like installing an elaborate alarm system," I muttered, "while leaving the back door propped open with a brick."
>
> "The analogy has merit."
>
> The fix was straightforward enough - delete `public` from the code, delete the variant from the dashboard. Two minutes of work to close a hole that would have made the entire signed URL implementation theatrical rather than functional.
>
> "I should probably check if there's anything else in that allowlist that shouldn't be there."
>
> "A prudent instinct. I might also suggest verifying the dashboard configuration matches the code. The `public` variant exists at the account level - it would affect all images, not just those in this project."
>
> I checked. It did. I deleted it.
>
> "You know," I said, after the deployment confirmed everything was properly locked down this time, "the documentation really ought to warn people about this. 'Hey, that default variant you're ignoring? It's a security hole if you're using signed URLs.'"
>
> "To be fair, the signing system is designed to protect specific variants. The `public` variant is explicitly named for its intended purpose."
>
> "Explicitly named to be a footgun, more like."
>
> "Perhaps. Though footguns typically require someone to pull the trigger."
>
> I chose not to dignify that with a response.

**What this demonstrates:**
- Opens with overconfidence ("rather pleased with myself")
- Marvin's diplomatic bad news delivery ("one small matter")
- Self-deprecation without self-flagellation
- Technical content explained without code blocks
- Marvin gets the last word with dry wit

---

### Scene Type 2: Success/Insight

**"Named Variants Over Flexible"** - Making the correct architectural call

> "So the question is," I said, staring at the Cloudflare Images documentation, "do we use their flexible variants or define our own named ones?"
>
> Flexible variants sounded appealing on paper. Pass any width you want in the URL - `w=400`, `w=847`, `w=1337` - and Cloudflare resizes on the fly. Maximum flexibility. The sort of feature that makes a developer's heart sing with possibility.
>
> Marvin, characteristically, was less enthused.
>
> "The flexibility is indeed considerable. Perhaps worth considering what that flexibility enables."
>
> "Responsive images at any breakpoint we want. Perfect sizing for any device."
>
> "Also arbitrary requests from anyone who discovers the URL pattern."
>
> I paused. "Meaning?"
>
> "If I were inclined toward mischief, and I discovered your images accepted any width parameter, I might request the same image at widths 1 through 4000. Each request generates a new resize operation. Each resize costs compute. Each variant potentially cached separately."
>
> The singing heart went rather quiet.
>
> "That's... a lot of cache variants."
>
> "Four thousand, in my hypothetical. Per image. Multiplied by however many images exist in your library. The bandwidth costs alone would be noteworthy, to say nothing of the processing overhead."
>
> I thought about the kind of traffic a blog might attract. Most of it legitimate. Some of it not. And all it would take is one curious individual with a script and too much free time.
>
> "Named variants, then."
>
> "That would be the more conservative approach."
>
> We settled on four: `w400` for thumbnails, `w800` for cards, `w1600` for hero images, `w2400` for high-resolution displays. Four sizes. Four cache entries per image. Anything else gets rejected at the edge before it can do damage.
>
> "The signing also becomes simpler," Marvin noted. "With flexible variants, you'd need to validate that the requested width falls within acceptable bounds. With named variants, you check against a short allowlist. Four strings."
>
> "And if someone requests `w847`?"
>
> "They receive nothing. The function returns before any image processing occurs."
>
> There was something satisfying about that. The elegance of a closed system. Here are the sizes we offer. Pick one. Don't like them? That's unfortunate, but at least you won't be generating four thousand resize operations at our expense.
>
> "I suppose," I admitted, "that 'maximum flexibility' isn't always a feature."
>
> "In security contexts, it rarely is. Constraints are often protective. The inability to do something frequently means the inability to do something harmful."
>
> I configured the four variants in the Cloudflare dashboard, added them to the allowlist in the signing function, and updated the responsive image helper to use only these breakpoints. The whole thing took perhaps twenty minutes.
>
> "Not exactly the cutting-edge, any-width-you-want implementation I'd imagined."
>
> "No. But considerably more resistant to abuse. And," Marvin added, "rather easier to reason about. Four variants is a manageable mental model. Infinite variants is not."
>
> He had a point. When debugging image issues three months from now, I'd much rather trace through four possibilities than attempt to reconstruct whatever arbitrary width some visitor's browser decided to request.
>
> "Sometimes boring is correct."
>
> "A sentiment that rarely appears in technology marketing materials, yet frequently proves accurate in production environments."
>
> I saved the configuration and moved on to the next task, vaguely pleased that for once I'd chosen the sensible option before discovering the hard way why the exciting option was a mistake.
>
> It wouldn't last, of course. But for this particular decision, I'd take the win.

**What this demonstrates:**
- Petteri makes the right call (with Marvin's guidance)
- Self-deprecation present but lighter ("It wouldn't last, of course")
- Technical concept (cache amplification) explained through dialogue
- Marvin validates the good instinct rather than overriding

---

### Scene Type 3: Problem-Solving Dialogue

**"The Wave 2 Pivot Problem"** - Collaborative discovery through back-and-forth

> The first real test of the adaptive research system had gone brilliantly. Six agents dispatched, results collected, quality scores calculated. Every agent had scored between 85 and 97. Excellent, by any reasonable measure.
>
> "The results look good," I said, scrolling through the output. "Solid scores across the board. Agents found plenty of sources. Confidence levels are high."
>
> "The scores are indeed high," Marvin agreed. "Though I notice something curious about the platform coverage."
>
> "What about it?"
>
> "Of the six perspectives we generated, three mentioned social media discussions as likely sources of valuable insights. Practitioner discussions on Twitter. Developer conversations on Bluesky. LinkedIn posts from professionals in the field."
>
> "And?"
>
> "None of the agents searched any of those platforms."
>
> I stopped scrolling. "None of them?"
>
> "Zero LinkedIn results. Zero Bluesky results. Twitter appears once, tangentially, in a citation that isn't actually about our topic."
>
> I stared at the quality scores again. 85. 92. 97. 94. All excellent. All meaningless, apparently.
>
> "So we scored 97 on an exam," I said slowly, "but we didn't answer a third of the questions."
>
> "A reasonable analogy. Quality and coverage are distinct dimensions. An agent can be exceptionally thorough about the places it searched while systematically ignoring entire platforms."
>
> This was the sort of insight that makes you question everything you thought you understood. We'd built a sophisticated quality scoring system - length of response, number of sources, confidence levels, domain signals. We'd validated it carefully. It worked exactly as designed.
>
> And it was completely blind to what wasn't there.
>
> "We need coverage tracking," I said. "Not just quality tracking."
>
> "Agreed. The question is how to implement it."
>
> I thought about the architecture. The system generated perspectives, each perspective identified where relevant information might be found, agents were dispatched to explore those perspectives. The gap was between "where to look" and "did you actually look there."
>
> "What if each perspective explicitly declares which platforms it expects the agent to search?"
>
> "Interesting. Elaborate?"
>
> "When we generate a perspective like 'practitioner discussions on social media,' we also declare: this perspective expects coverage of Twitter, Bluesky, maybe Reddit. The agent doesn't have to find anything useful on those platforms - some searches come up empty. But it has to actually try."
>
> Marvin considered this. "So coverage becomes a per-perspective metric rather than a global one."
>
> "Exactly. Perspective A expects LinkedIn and Twitter. Perspective B expects academic sources and GitHub. We track whether each perspective's expected platforms were actually searched, regardless of whether the search yielded results."
>
> "And if an agent scores 97 on quality but searched zero of its expected platforms?"
>
> "Then we have a coverage failure. Which should trigger Wave 2."
>
> There it was. The Wave 2 pivot logic we'd designed - launch specialists when Wave 1 results were insufficient - had been focused entirely on quality gaps. Low scores triggered additional research. But we'd missed something equally important.
>
> "Wave 2 triggers on two conditions," I said, working through it. "Quality failure, yes. But also coverage failure. If no agent searched LinkedIn despite three perspectives expecting LinkedIn coverage, that's a gap worth filling."
>
> "Even if the overall quality scores are excellent."
>
> "Especially if the overall quality scores are excellent. High scores can be dangerously misleading. They tell you the work that was done was done well. They don't tell you whether the work that should have been done was even attempted."
>
> Marvin was quiet for a moment. "This is a broader principle, isn't it? Not specific to research systems."
>
> "Probably. Test coverage doesn't guarantee correctness. Revenue growth doesn't guarantee profitability. Any metric in isolation can hide what it doesn't measure."
>
> "Quality does not equal coverage."
>
> "Quality does not equal coverage."
>
> We spent the next hour redesigning the pivot analysis engine. Each perspective now carried a list of expected platforms. Each agent's output was scanned for evidence of platform engagement. A coverage summary appeared in the final report - not just what was found, but which platforms were searched and which were skipped.
>
> The next test run still scored high on quality. But this time we could also see that six of six expected platforms had been searched. The measurement system was finally measuring what mattered.
>
> "Still not perfect," I admitted. "An agent could technically claim to have searched LinkedIn without actually searching it meaningfully."
>
> "True. Though at this point we've moved from systemic blindness to potential agent misbehavior. A different category of problem."
>
> "One that's at least visible in the output."
>
> "Which is, in many ways, the goal. Not perfection. Visibility."
>
> I saved the updated architecture and committed the changes. We'd learned something important that day - about quality metrics, about coverage gaps, and about the danger of celebrating numbers that look good but don't capture what's actually missing.

**What this demonstrates:**
- Collaborative problem-solving (back-and-forth building on ideas)
- Neither character is "wrong" - they discover together
- Technical concept explained through dialogue
- Ends with broader insight ("visibility over perfection")
- Marvin asks probing questions, extends thinking

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Instead Do |
|--------------|--------------|------------|
| Code blocks with syntax highlighting | Scares non-technical readers | Describe in plain language with inline `backticks` |
| Tutorial voice ("First, we need to...") | Sounds authoritative, not exploratory | Use first-person journey ("I stared at the code...") |
| Marvin lectures Petteri | Makes Marvin smug, Petteri passive | Marvin prompts, Petteri realizes |
| Petteri is clueless | Undermines reader trust | Petteri is capable, just human |
| No wit in the scene | Loses the Wodehouse spirit | Every scene needs at least one good line |
| Ending without a closer | Feels unfinished | Dry wit, self-aware observation, or wry acceptance |

---

## Source Material Reference

Scenes are reconstructed from real development sessions. Source material locations:

| Track | Location | Content |
|-------|----------|---------|
| tuonela-platform | `tuonela-private/materials/tracks/tuonela-blog-series/` | Blog infrastructure, CLI, SSR debugging |
| tuonela-platform | `tuonela-private/materials/tracks/cloudflare-pages-migration/` | CF Images, signed URLs, security |
| ai-systems | `tuonela-private/materials/tracks/adaptive-research-system/` | Multi-agent research, citation validation |
| ai-systems | `tuonela-private/materials/tracks/image-generation/` | Text-to-image workflows, cost analysis |

**Calibration samples:** `samples/` directory (co-located with this skill for easy recalibration)

---

## Validation Checklist

Before finalizing any narrative scene:

**AI Pattern Check (DO FIRST):**
- [ ] Em-dash count ≤2 per 500 words
- [ ] No list structures (even disguised as prose)
- [ ] No hedging language ("perhaps," "it's worth noting")
- [ ] No summary/recap paragraphs
- [ ] Paragraph lengths vary noticeably
- [ ] Read aloud - does it sound human?

**Style & Tone:**
- [ ] Opens with appropriate tone (overconfidence for mistakes, curiosity for problems)
- [ ] Marvin is diplomatic, not smug
- [ ] Petteri owns mistakes cheerfully
- [ ] No code blocks (inline backticks only)
- [ ] Technical content explained in dialogue
- [ ] At least one genuinely witty line
- [ ] Proper closer (usually Marvin's dry wit)
- [ ] Word count in target range
- [ ] Scene type matches source material
