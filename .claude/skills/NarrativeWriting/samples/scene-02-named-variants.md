# Scene 2: Named Variants Over Flexible

*Type: Success/insight - Petteri makes a correct architectural call*
*Source: CF-PAGES-MIGRATION-COMPLETE.md, Decision #1*
*Length: ~600 words | Reading time: ~2.5 minutes*

---

"So the question is," I said, staring at the Cloudflare Images documentation, "do we use their flexible variants or define our own named ones?"

Flexible variants sounded appealing on paper. Pass any width you want in the URL - `w=400`, `w=847`, `w=1337` - and Cloudflare resizes on the fly. Maximum flexibility. The sort of feature that makes a developer's heart sing with possibility.

Marvin, characteristically, was less enthused.

"The flexibility is indeed considerable. Perhaps worth considering what that flexibility enables."

"Responsive images at any breakpoint we want. Perfect sizing for any device."

"Also arbitrary requests from anyone who discovers the URL pattern."

I paused. "Meaning?"

"If I were inclined toward mischief, and I discovered your images accepted any width parameter, I might request the same image at widths 1 through 4000. Each request generates a new resize operation. Each resize costs compute. Each variant potentially cached separately."

The singing heart went rather quiet.

"That's... a lot of cache variants."

"Four thousand, in my hypothetical. Per image. Multiplied by however many images exist in your library. The bandwidth costs alone would be noteworthy, to say nothing of the processing overhead."

I thought about the kind of traffic a blog might attract. Most of it legitimate. Some of it not. And all it would take is one curious individual with a script and too much free time.

"Named variants, then."

"That would be the more conservative approach."

We settled on four: `w400` for thumbnails, `w800` for cards, `w1600` for hero images, `w2400` for high-resolution displays. Four sizes. Four cache entries per image. Anything else gets rejected at the edge before it can do damage.

"The signing also becomes simpler," Marvin noted. "With flexible variants, you'd need to validate that the requested width falls within acceptable bounds. With named variants, you check against a short allowlist. Four strings."

"And if someone requests `w847`?"

"They receive nothing. The function returns before any image processing occurs."

There was something satisfying about that. The elegance of a closed system. Here are the sizes we offer. Pick one. Don't like them? That's unfortunate, but at least you won't be generating four thousand resize operations at our expense.

"I suppose," I admitted, "that 'maximum flexibility' isn't always a feature."

"In security contexts, it rarely is. Constraints are often protective. The inability to do something frequently means the inability to do something harmful."

I configured the four variants in the Cloudflare dashboard, added them to the allowlist in the signing function, and updated the responsive image helper to use only these breakpoints. The whole thing took perhaps twenty minutes.

"Not exactly the cutting-edge, any-width-you-want implementation I'd imagined."

"No. But considerably more resistant to abuse. And," Marvin added, "rather easier to reason about. Four variants is a manageable mental model. Infinite variants is not."

He had a point. When debugging image issues three months from now, I'd much rather trace through four possibilities than attempt to reconstruct whatever arbitrary width some visitor's browser decided to request.

"Sometimes boring is correct."

"A sentiment that rarely appears in technology marketing materials, yet frequently proves accurate in production environments."

I saved the configuration and moved on to the next task, vaguely pleased that for once I'd chosen the sensible option before discovering the hard way why the exciting option was a mistake.

It wouldn't last, of course. But for this particular decision, I'd take the win.

---

*Calibration notes:*
- Shows Petteri making the right call (with Marvin's guidance)
- Self-deprecation present but lighter ("It wouldn't last, of course")
- Technical concept (cache amplification attack) explained without code
- Marvin's role: adds perspective, doesn't override - validates the good instinct
