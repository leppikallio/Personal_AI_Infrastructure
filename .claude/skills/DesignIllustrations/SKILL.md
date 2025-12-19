---
name: DesignIllustrations
description: Sub-agent illustrator for blog content. Reads posts, analyzes narrative, designs illustration specs for MDX frontmatter. USE WHEN designing illustrations for blog posts, creating illustration frontmatter, adding visuals to articles, OR sub-agent needs to design blog imagery.
---

# DesignIllustrations

Design illustration definitions for blog posts. Analyzes content narrative, derives visual metaphors, and outputs structured YAML for MDX frontmatter.

## Workflow Routing

**When executing a workflow, call the notification script via Bash:**

```bash
${PAI_DIR}/tools/skill-workflow-notification WorkflowName DesignIllustrations
```

| Workflow | Trigger | File |
|----------|---------|------|
| **DesignForPost** | "design illustrations for [post]", "add illustrations" | `workflows/DesignForPost.md` |
| **DesignForSeries** | "design illustrations for series", "consistent visuals" | `workflows/DesignForSeries.md` |
| **PlaceIllustrations** | "place illustrations", "insert FloatImage tags", "add highlight images to content" (EDITS MDX FILE) | `workflows/PlaceIllustrations.md` |

---

## Examples

**Example 1: Design cover illustration for a blog post**
```
User: "Design illustrations for my new post about AI agents"
→ Invokes DesignForPost workflow
→ Reads post content, runs 24-item story explanation
→ Derives visual metaphor from narrative arc
→ Outputs YAML illustration object with prompt
```

**Example 2: Design consistent visuals for a series**
```
User: "Design illustrations for the 'Building PAI' series"
→ Invokes DesignForSeries workflow
→ Reads all series posts, identifies common themes
→ Creates visual language document
→ Outputs illustration objects for each post with consistent motifs
```

**Example 3: Sub-agent illustrator reading drafts**
```
Sub-agent receives: "Read this draft and design appropriate illustrations"
→ Invokes DesignForPost workflow
→ Analyzes content without human intervention
→ Returns structured illustration definitions
```

**Example 4: Place highlight at its narrative moment (EDITS FILE)**
```
User: "Place illustrations in adaptive-research-story-13"
→ Invokes PlaceIllustrations workflow
→ Reads frontmatter: finds highlight with slug and prompt
→ Prompt describes "hot coffee victory moment"
→ Finds that scene in content: "I made fresh coffee..."
→ EDITS THE MDX FILE: inserts FloatImage at that narrative moment
```

**Example 5: Complete illustrator pipeline for a series**
```
User: "Design and place illustrations for the adaptive-research series"
→ DesignForSeries: Reads all posts, creates consistent visual language
→ DesignForPost (per story): Creates cover + highlight specs with prompts
→ PlaceIllustrations (per story): Places highlights where prompts indicate
→ Result: Each story has illustrations placed at their narrative moments
```

---

## Output Schema

All output matches the tuonela `content.config.ts` illustration schema:

```yaml
illustrations:
  - name: cover                          # Identifier
    slug: blog/[post-slug]-cover         # CF Images slug
    prompt: "[Detailed prompt]"          # Following Art skill aesthetic
    reference_images:                    # Optional - ordered array
      - /path/to/character-sheet.png     # Image 1
      - /path/to/style-reference.png     # Image 2
    model: nano-banana-pro               # Default model
    size: 2K                             # Default resolution
    aspect_ratio: "16:9"                 # Cover images
    format: webp                         # Web-optimized
    output: /tmp/[post-slug]-cover.webp  # Output path
```

---

## Key Rules

### Image Specifications
- **Cover images:** 16:9 aspect ratio, 2K resolution
- **Highlight images:** 9:16 portrait (for FloatImage) or 16:9 landscape (for ImageCard)
- **In-content images:** 1:1 aspect ratio typically
- **Format:** Always webp for web optimization

### Highlight Image Placement
- **The prompt is the placement guide** - it describes the narrative moment the image depicts
- Find where that moment occurs in the content, place the image there
- Portrait (9:16) highlights use `<FloatImage>` component for newspaper-style text wrap
- Landscape (16:9) highlights use `<ImageCard>` for full-width display

### Prompt Construction
- Follow Art skill aesthetic (Saul Steinberg, hand-drawn, flat colors)
- Use 24-item story explanation to derive visual metaphors
- Reference `${PAI_DIR}/skills/Art/SKILL.md` for guidelines

### Reference Images
- **Optional** - only include when character/style consistency needed
- **Ordered array** - prompts can reference by position ("character from image 1")
- **Paths** resolved relative to MDX file location

---

## Integration

### With Art Skill
- References `${PAI_DIR}/skills/Art/SKILL.md` for aesthetic guidelines
- Uses same 24-item story explanation process
- Follows same prompt construction patterns

### With generate-ulart-image.ts
- Output is directly usable with `--prompt-file-mdx` CLI option
- All fields match CLI expectations

### With tuonela content.config.ts
- Output validates against Zod schema
- Run `bun astro check` to verify
