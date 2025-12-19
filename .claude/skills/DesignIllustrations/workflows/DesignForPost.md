# DesignForPost Workflow

Design illustrations for a single blog post.

---

## Input

- Path to MDX file **OR** post content directly
- Optional: Reference images for character/style consistency

---

## Process

### Step 1: Read the Blog Post

Extract from the MDX file:
- Title
- Content body
- Existing frontmatter
- Series information (if any)

```bash
# Read the MDX file
Read /path/to/post.mdx
```

### Step 2: Run 24-Item Story Explanation

**MANDATORY:** Use the story-explanation skill with 24-item length to understand the full narrative arc.

```
Use story-explanation skill with 24-item length for the blog post content
```

The 24-item output reveals:
- Setup and context
- Tension and conflict
- Transformation and resolution
- Key emotional beats

### Step 3: Determine Illustration Needs

Based on the narrative arc, identify:

| Illustration Type | When Needed | Typical Specs |
|-------------------|-------------|---------------|
| **Cover image** | Always (if missing) | 16:9, 2K |
| **In-content** | Long posts, key transitions | 1:1, 2K |
| **Diagram** | Technical explanations | 1:1 or 16:9, 1K |

### Step 4: Design Visual Metaphors

For each illustration, derive ONE visual metaphor from the narrative arc:

**Pattern Recognition:**

| Narrative Theme | Visual Strategy |
|-----------------|-----------------|
| Conflict/Ownership | Two forces pulling one object |
| Loss/Absence | Empty spaces that should be full |
| Duality/States | Split composition showing both |
| Collaboration | Hands working together |
| Transformation | Before/after in single frame |
| Discovery | Lightbulb, door opening, path revealing |

### Step 5: Construct Prompts

Follow Art skill aesthetic:
- Saul Steinberg / New Yorker style
- Hand-drawn black ink linework
- Flat solid colors (NO gradients)
- Muted earth-tone backgrounds
- 30-40% negative space

**Prompt Template:**

```
Editorial conceptual illustration in Saul Steinberg / New Yorker style.

BACKGROUND: Solid flat [CREAM #F5E6D3 | TERRACOTTA #C17A5B | SAGE #A8A89A] — NO gradients.

STYLE: Hand-drawn black ink linework. Variable stroke weight. Imperfect wobbly lines.
Gestural brush quality. NOT smooth vectors. NOT photorealistic.

COMPOSITION: [Describe the visual metaphor with 2-3 elements]

CRITICAL:
- NO gradients anywhere
- NO shadows
- NO 3D effects
- Lines should be imperfect, hand-drawn quality
```

### Step 6: Generate Output YAML

```yaml
illustrations:
  - name: cover
    slug: blog/[post-slug]-cover
    prompt: |
      [Full prompt from Step 5]
    reference_images:           # Only if character/style consistency needed
      - /path/to/reference.png
    model: nano-banana-pro
    size: 2K
    aspect_ratio: "16:9"
    format: webp
    output: /tmp/[post-slug]-cover.webp
```

---

## Output

Return the complete YAML block that can be added to the MDX frontmatter.

Include:
- All illustration objects
- Reasoning for visual metaphor choices (as comments or separate explanation)

---

## Reference Images

When to include `reference_images`:

| Scenario | Action |
|----------|--------|
| Post features Petteri/Marvin characters | Include character turnaround sheets |
| Post is part of a series with established visual language | Include style references |
| Standalone post, abstract concepts | Skip reference images |

**Array is ordered** - prompts can reference by position:
- "Character from image 1 sitting at desk"
- "Scene rendered in the style of image 2"

---

## Validation

Before finalizing:

- [ ] Prompt follows Art skill aesthetic
- [ ] Visual metaphor derived from FULL narrative arc (not just title)
- [ ] Aspect ratio appropriate for use case
- [ ] Output path uses post slug
- [ ] Reference images only included when needed
- [ ] YAML validates against content.config.ts schema
