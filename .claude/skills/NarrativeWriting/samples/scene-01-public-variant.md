# Scene 1: The Public Variant Discovery

*Type: Mistake/fumble - overconfidence deflated by overlooked detail*
*Source: CF-PAGES-MIGRATION-COMPLETE.md, Lesson #2*
*Length: ~600 words | Reading time: ~2.5 minutes*

---

The signed URLs were working beautifully. HMAC-SHA256 for images, RS256 JWT for videos - the whole cryptographic apparatus humming along like a well-oiled machine. I was rather pleased with myself, if I'm honest.

"The implementation looks solid," Marvin confirmed, having just run through the verification checklist. "Images return 403 without valid signatures. Videos require JWT tokens. Rate limiting is active on both endpoints."

I leaned back, contemplating whether this called for a celebratory coffee. Security hardening complete. Bandwidth scrapers thwarted. Egress costs contained. The sort of morning that makes a developer feel like a responsible adult.

"There is," Marvin continued, in that tone I'd come to recognize as the diplomatic throat-clearing before unwelcome news, "one small matter that might warrant attention."

"Oh?"

"The variant allowlist in the image signing function. I notice it includes `w400`, `w800`, `w1600`, `w2400` - the responsive breakpoints we configured."

"Yes, that's the point. Named variants only. No arbitrary width requests sneaking past."

"Indeed. It also includes `public`."

I stared at the code. There it was, sitting innocently in the list of allowed variants like it belonged there. Four sensible entries - the responsive image sizes we'd carefully configured - and then `public`, tagged on at the end like an afterthought.

"That's... that's for the dashboard preview, I think? Cloudflare's default variant?"

"It is. It's also a variant that bypasses signing entirely. Any image requested with the `public` variant serves without signature verification."

The celebratory coffee feeling evaporated rather quickly.

"So you're telling me," I said slowly, working through the implications, "that I've spent the morning implementing cryptographic signatures on every image endpoint, and anyone who simply adds `public` to the URL gets in anyway?"

"That would be an accurate summary, yes."

I pulled up the Cloudflare Images dashboard, hoping against hope that maybe the `public` variant didn't actually exist in our account. It did. Of course it did. Sitting there with its smug little checkbox, completely bypassing the security layer I'd been so proud of ten minutes ago.

"This is rather like installing an elaborate alarm system," I muttered, "while leaving the back door propped open with a brick."

"The analogy has merit."

The fix was straightforward enough - delete `public` from the code, delete the variant from the dashboard. Two minutes of work to close a hole that would have made the entire signed URL implementation theatrical rather than functional.

"I should probably check if there's anything else in that allowlist that shouldn't be there."

"A prudent instinct. I might also suggest verifying the dashboard configuration matches the code. The `public` variant exists at the account level - it would affect all images, not just those in this project."

I checked. It did. I deleted it.

"You know," I said, after the deployment confirmed everything was properly locked down this time, "the documentation really ought to warn people about this. 'Hey, that default variant you're ignoring? It's a security hole if you're using signed URLs.'"

"To be fair, the signing system is designed to protect specific variants. The `public` variant is explicitly named for its intended purpose."

"Explicitly named to be a footgun, more like."

"Perhaps. Though footguns typically require someone to pull the trigger."

I chose not to dignify that with a response.

---

*Calibration notes:*
- Shows overconfidence before the fall ("rather pleased with myself")
- Marvin's diplomatic delivery of bad news ("one small matter")
- Self-deprecation without self-flagellation
- Technical issue explained without code blocks
- Marvin gets the last word (dry wit)
