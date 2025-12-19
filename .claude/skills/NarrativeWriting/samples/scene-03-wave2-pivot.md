# Scene 3: The Wave 2 Pivot Problem

*Type: Problem-solving dialogue - collaborative design through back-and-forth*
*Source: adaptive-research-system materials, Platform Coverage Issue*
*Length: ~750 words | Reading time: ~3 minutes*

---

The first real test of the adaptive research system had gone brilliantly. Six agents dispatched, results collected, quality scores calculated. Every agent had scored between 85 and 97. Excellent, by any reasonable measure.

"The results look good," I said, scrolling through the output. "Solid scores across the board. Agents found plenty of sources. Confidence levels are high."

"The scores are indeed high," Marvin agreed. "Though I notice something curious about the platform coverage."

"What about it?"

"Of the six perspectives we generated, three mentioned social media discussions as likely sources of valuable insights. Practitioner discussions on Twitter. Developer conversations on Bluesky. LinkedIn posts from professionals in the field."

"And?"

"None of the agents searched any of those platforms."

I stopped scrolling. "None of them?"

"Zero LinkedIn results. Zero Bluesky results. Twitter appears once, tangentially, in a citation that isn't actually about our topic."

I stared at the quality scores again. 85. 92. 97. 94. All excellent. All meaningless, apparently.

"So we scored 97 on an exam," I said slowly, "but we didn't answer a third of the questions."

"A reasonable analogy. Quality and coverage are distinct dimensions. An agent can be exceptionally thorough about the places it searched while systematically ignoring entire platforms."

This was the sort of insight that makes you question everything you thought you understood. We'd built a sophisticated quality scoring system - length of response, number of sources, confidence levels, domain signals. We'd validated it carefully. It worked exactly as designed.

And it was completely blind to what wasn't there.

"We need coverage tracking," I said. "Not just quality tracking."

"Agreed. The question is how to implement it."

I thought about the architecture. The system generated perspectives, each perspective identified where relevant information might be found, agents were dispatched to explore those perspectives. The gap was between "where to look" and "did you actually look there."

"What if each perspective explicitly declares which platforms it expects the agent to search?"

"Interesting. Elaborate?"

"When we generate a perspective like 'practitioner discussions on social media,' we also declare: this perspective expects coverage of Twitter, Bluesky, maybe Reddit. The agent doesn't have to find anything useful on those platforms - some searches come up empty. But it has to actually try."

Marvin considered this. "So coverage becomes a per-perspective metric rather than a global one."

"Exactly. Perspective A expects LinkedIn and Twitter. Perspective B expects academic sources and GitHub. We track whether each perspective's expected platforms were actually searched, regardless of whether the search yielded results."

"And if an agent scores 97 on quality but searched zero of its expected platforms?"

"Then we have a coverage failure. Which should trigger Wave 2."

There it was. The Wave 2 pivot logic we'd designed - launch specialists when Wave 1 results were insufficient - had been focused entirely on quality gaps. Low scores triggered additional research. But we'd missed something equally important.

"Wave 2 triggers on two conditions," I said, working through it. "Quality failure, yes. But also coverage failure. If no agent searched LinkedIn despite three perspectives expecting LinkedIn coverage, that's a gap worth filling."

"Even if the overall quality scores are excellent."

"Especially if the overall quality scores are excellent. High scores can be dangerously misleading. They tell you the work that was done was done well. They don't tell you whether the work that should have been done was even attempted."

Marvin was quiet for a moment. "This is a broader principle, isn't it? Not specific to research systems."

"Probably. Test coverage doesn't guarantee correctness. Revenue growth doesn't guarantee profitability. Any metric in isolation can hide what it doesn't measure."

"Quality does not equal coverage."

"Quality does not equal coverage."

We spent the next hour redesigning the pivot analysis engine. Each perspective now carried a list of expected platforms. Each agent's output was scanned for evidence of platform engagement. A coverage summary appeared in the final report - not just what was found, but which platforms were searched and which were skipped.

The next test run still scored high on quality. But this time we could also see that six of six expected platforms had been searched. The measurement system was finally measuring what mattered.

"Still not perfect," I admitted. "An agent could technically claim to have searched LinkedIn without actually searching it meaningfully."

"True. Though at this point we've moved from systemic blindness to potential agent misbehavior. A different category of problem."

"One that's at least visible in the output."

"Which is, in many ways, the goal. Not perfection. Visibility."

I saved the updated architecture and committed the changes. We'd learned something important that day - about quality metrics, about coverage gaps, and about the danger of celebrating numbers that look good but don't capture what's actually missing.

---

*Calibration notes:*
- Shows collaborative problem-solving (back-and-forth dialogue, building on each other's ideas)
- Neither character is "wrong" - they're discovering together
- Technical concept (quality ≠ coverage) explained through dialogue
- Ends with broader insight ("visibility over perfection")
- Marvin's role: asks probing questions, validates logic, extends thinking
