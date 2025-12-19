# DesignForSeries Workflow

Design illustrations for a series of blog posts with consistent visual language.

---

## Input

- Series name **OR** list of MDX file paths
- Optional: Existing style references to maintain

---

## Process

### Step 1: Gather All Posts

Find all posts in the series:

```bash
# If series name provided, search for posts with that series tag
Grep "series: [series-name]" src/content/blog/

# Or read provided list of MDX files
```

### Step 2: Analyze Series Theme

Read all posts and identify:
- **Overarching narrative** - What story does the series tell?
- **Common concepts** - Recurring themes, technologies, challenges
- **Progression** - How does the series evolve?
- **Tone** - Technical, narrative, reflective, tutorial?

### Step 3: Design Visual Language

Create a consistent visual system for the series:

#### Color Emphasis
Choose 1-2 accent colors to emphasize throughout:

| Color | Hex | Emotional Association |
|-------|-----|----------------------|
| Deep Purple | #4A148C | Technology, AI, intelligence |
| Deep Teal | #00796B | Growth, systems, connections |
| Terracotta | #C17A5B | Warmth, humanity, craft |
| Sage | #A8A89A | Calm, nature, balance |

#### Recurring Motifs

Choose 2-3 visual elements that will appear across the series:

| Series Theme | Suggested Motifs |
|--------------|------------------|
| Building/Creating | Hands, tools, construction elements |
| Learning/Discovery | Books, lightbulbs, paths |
| AI/Agents | Circuits, networks, assistants |
| Problem-solving | Puzzles, mazes, keys |
| Collaboration | Multiple hands, dialogue, bridges |

#### Composition Rules

Define consistent composition patterns:
- **Split compositions** for comparison posts
- **Central focus** for concept posts
- **Flowing elements** for process posts

### Step 4: Generate Per-Post Illustrations

For each post in the series:

1. **Run 24-item story explanation** on the individual post
2. **Derive visual metaphor** specific to that post's narrative
3. **Apply series visual language** (colors, motifs, composition)
4. **Generate illustration YAML**

### Step 5: Create Visual Theme Document

Output a reference document for the series:

```yaml
series_visual_language:
  name: "[Series Name]"

  colors:
    primary_accent: "#4A148C"  # Deep Purple
    secondary_accent: "#00796B"  # Deep Teal

  motifs:
    - "Hand-drawn circuits and connection lines"
    - "Human hands interacting with abstract systems"
    - "Lightbulb moments with electrical elements"

  composition:
    default: "Central focus with radiating elements"
    comparison_posts: "Split composition"
    process_posts: "Left-to-right flow"

  consistency_rules:
    - "All illustrations use same black linework weight"
    - "Purple accent appears in every image"
    - "Circuit motif subtly present in backgrounds"
```

### Step 6: Output Illustration Objects

For each post, generate:

```yaml
# Post 1: [Title]
illustrations:
  - name: cover
    slug: blog/[series]-[post-1]-cover
    prompt: |
      [Prompt with series visual language applied]
    reference_images:
      - /path/to/series-style-reference.png  # Use for all posts
    model: nano-banana-pro
    size: 2K
    aspect_ratio: "16:9"
    format: webp
    output: /tmp/[series]-[post-1]-cover.webp

---

# Post 2: [Title]
illustrations:
  - name: cover
    slug: blog/[series]-[post-2]-cover
    prompt: |
      [Prompt with series visual language applied]
    reference_images:
      - /path/to/series-style-reference.png
    model: nano-banana-pro
    size: 2K
    aspect_ratio: "16:9"
    format: webp
    output: /tmp/[series]-[post-2]-cover.webp
```

---

## Output

Return:

1. **Visual Theme Document** - Series-wide style guide
2. **Illustration Objects** - YAML for each post
3. **Reasoning** - Why these visual choices for this series

---

## Reference Images for Series

Series illustrations benefit heavily from reference images:

| Reference Type | Purpose |
|----------------|---------|
| **Style reference** | First generated image becomes reference for all subsequent |
| **Character sheets** | If series features recurring characters |
| **Motif library** | Pre-drawn motif elements for consistency |

**Workflow for building series references:**

1. Generate first post's cover without references
2. If satisfactory, use as style reference for remaining posts
3. Include in all subsequent illustration `reference_images` arrays

---

## Validation

Before finalizing:

- [ ] All posts in series accounted for
- [ ] Visual language document complete
- [ ] Consistent colors across all prompts
- [ ] Recurring motifs present in each illustration
- [ ] Reference images path consistent across all posts
- [ ] Slugs follow series naming convention
- [ ] All YAML validates against content.config.ts schema
