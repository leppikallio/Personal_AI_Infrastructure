# PlaceIllustrations Workflow

**Place highlight illustrations at the narrative moments they depict.**

The illustration prompt describes a scene from the story. Find that scene. Place the image there.

---

## Core Concept

When illustrations are designed (via DesignForPost), the prompt captures a specific narrative moment:

```yaml
# Frontmatter example:
- name: highlight
  slug: blog/story-13-highlight
  prompt: |
    Petteri drinks HOT coffee this time (finally! - after 13 stories
    of cold coffee). Marvin tracks the metrics approvingly.
```

This prompt was inspired by content in the story:

```markdown
# In the content:
I made fresh coffee. This time I actually drank it while it was hot.
```

**The prompt tells you WHERE the image belongs.** Place the FloatImage at or near that narrative moment.

---

## Process

### Step 1: Read Post and Understand Context

Read the MDX file. Extract:
- The full content body (understand the narrative flow)
- The `illustrations[]` array from frontmatter
- Filter to highlight(s) only (name !== 'cover')

For each highlight, note:
- `slug` - the image identifier
- `prompt` - **this describes the scene to find**

### Step 2: Match Prompt to Content

**Read the highlight prompt carefully.** It describes a visual scene that was inspired by a moment in the narrative.

Ask: "Where in the content does this scene happen?"

| Prompt Describes | Look For In Content |
|------------------|---------------------|
| Character reaction | The dialogue or event that triggered it |
| Decision point | The paragraph where the decision is discussed |
| Celebration/victory | The resolution or success moment |
| Diagram/flowchart | The technical explanation it visualizes |
| Contrast/comparison | The section comparing two approaches |

**Example for story-13:**

Prompt mentions: "Petteri drinks HOT coffee... the satisfaction of an optimization that works"

Content has: "I made fresh coffee. This time I actually drank it while it was hot."

→ Place the FloatImage before or at that concluding moment.

### Step 3: Insert FloatImage

**EXACT COMPONENT API - use these props exactly:**

```typescript
// FloatImage.astro props interface:
interface Props {
  image_slug: string;      // REQUIRED - slug from frontmatter WITHOUT 'blog/' prefix
  alt: string;             // REQUIRED - concise description, 5-10 words
  position: 'left' | 'right';  // REQUIRED - only these two values
  width?: 'small' | 'medium' | 'large';  // OPTIONAL - defaults to 'medium'
  caption?: string;        // OPTIONAL
}
```

**CORRECT example:**
```mdx
<FloatImage
  image_slug="adaptive-research-story-13-selective-ensemble-highlight"
  alt="Decision tree with fast path and ensemble escalation"
  position="right"
  width="medium"
/>
```

**WRONG - do NOT use these:**
```mdx
<!-- WRONG props - these will break -->
<FloatImage
  src="/path/to/image.png"    <!-- WRONG: use image_slug, not src -->
  float="right"               <!-- WRONG: use position, not float -->
  width="350px"               <!-- WRONG: use "small"|"medium"|"large", not px -->
/>
```

**Placement rules:**
- Insert BEFORE the relevant paragraph (image leads into the moment)
- Blank line above and below for MDX parsing
- Never inside lists, blockquotes, or code blocks

**Width mapping:**
- `small` = 25% of content width
- `medium` = 33% of content width (default, good for portraits)
- `large` = 50% of content width

**Float direction:**
- Single highlight: default `position="right"`
- Multiple highlights: alternate left/right
- Portrait (9:16): use FloatImage with `width="medium"`
- Landscape (16:9): consider ImageCard instead

### Step 4: Edit the File

**Use the Edit tool to modify the MDX file.**

```
Edit tool call:
  file_path: /path/to/post.mdx
  old_string: |
    I made fresh coffee. This time I actually drank it while it was hot.
  new_string: |
    <FloatImage
      image_slug="adaptive-research-story-13-selective-ensemble-highlight"
      alt="Petteri finally drinks hot coffee, celebrating the optimization"
      position="right"
      width="medium"
    />

    I made fresh coffee. This time I actually drank it while it was hot.
```

---

## Constraints

**Only place illustrations that exist in frontmatter:**
- If frontmatter has 1 highlight → place 1 FloatImage
- If frontmatter has 0 highlights → report and exit
- Use the EXACT slug from frontmatter (strip 'blog/' prefix)

**Do NOT invent additional images.** The frontmatter is the source of truth.

---

## Full Example: Story-13

**Frontmatter has:**
```yaml
illustrations:
  - name: cover
    slug: blog/adaptive-research-story-13-selective-ensemble-cover
    # ... cover prompt ...
  - name: highlight
    slug: blog/adaptive-research-story-13-selective-ensemble-highlight
    prompt: |
      A decision tree for perspective classification...
      Petteri drinks HOT coffee this time (finally! - after 13 stories
      of cold coffee). Marvin tracks the metrics approvingly.
      MOOD: The satisfaction of an optimization that works in practice!
```

**Analysis:**
- 1 highlight to place
- Prompt describes: hot coffee victory moment, optimization success celebration
- Find in content: the ending where Petteri drinks hot coffee

**Content location:**
```markdown
I made fresh coffee. This time I actually drank it while it was hot.
```

**Insert using EXACT props from component API:**
```mdx
<FloatImage
  image_slug="adaptive-research-story-13-selective-ensemble-highlight"
  alt="Decision tree with fast path and ensemble escalation"
  position="right"
  width="medium"
/>

I made fresh coffee. This time I actually drank it while it was hot.
```

**Verify before saving:**
- [ ] `image_slug` matches frontmatter slug (minus `blog/` prefix)
- [ ] `position` is "left" or "right" (not "float")
- [ ] `width` is "small", "medium", or "large" (not px values)
- [ ] No `src` prop (that's not a valid prop)

---

## Integration with DesignForPost

The complete illustrator workflow:

1. **DesignForPost** → Reads story, creates illustration specs including prompts
2. **Generate images** → Art skill or generate-ulart-image.ts creates actual images
3. **PlaceIllustrations** → Places highlight at the narrative moment the prompt describes

The prompt is the bridge: it captures the moment during design, then guides placement.
