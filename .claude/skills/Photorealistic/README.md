# Photorealistic Image Generation

Generate photorealistic images using FLUX models with a human-in-the-loop 3-pass workflow.

---

## Golden Rules

1. **Pick a default stack and stop re-choosing every time**
2. **Fix and log seeds** - always store prompt + seed + params with each saved image
3. **Limit batches** - 4 images per prompt, not 20
4. **Work at moderate resolution first** - 1024x576 for exploration, upscale only when satisfied
5. **One change per pass** - don't combine multiple edits in one request

---

## Quick Start

### Single Image (Fastest)

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "A coffee shop interior, morning light through windows, cozy atmosphere"
```

### With PAI Assistance

Just ask:
```
"Create a photorealistic image of a mountain lake at sunrise"
```

PAI will invoke this skill and guide you through the workflow.

---

## The 3-Pass Workflow

For complex scenes, use the 3-pass workflow (91% success rate vs 76% single-shot):

```
COMPOSITION → REFINEMENT → DETAIL
```

### Pass 1: Composition

Generate multiple options, pick the best structure:

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "Japanese garden in autumn, stone pathway, maple trees"
```

**Output:** 4 images with different compositions. Pick your favorite.

### Pass 2: Refinement

Enhance realism on your chosen composition:

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase refine \
  --image /path/to/chosen-composition.png \
  --strength 0.35 \
  "Japanese garden in autumn, stone pathway, maple trees, 35mm film, soft morning light"
```

**Output:** Enhanced version preserving your composition.

### Pass 3: Detail (Optional)

Fix specific problem areas with inpainting:

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase detail \
  --image /path/to/refined.png \
  --mask /path/to/problem-area-mask.png \
  "More detailed stone texture"
```

**Output:** Fixed image with targeted improvements.

---

## Key Settings

| Parameter | Value | Why |
|-----------|-------|-----|
| `--model flux-pro` | FLUX 1.1 Pro | Best quality for photorealism |
| `--preset photorealistic` | Auto-applies optimal settings | CFG 3.5, 28 steps |
| `--strength 0.35` | For refinement | Preserves composition |
| `--batch 4` | For composition | Options to choose from |

### Model Options

| Model | Speed | Quality | Use For |
|-------|-------|---------|---------|
| `flux-schnell` | Fast | Good | Quick previews |
| `flux-dev` | Medium | High | Iteration |
| `flux-pro` | Slow | Highest | Final output |

---

## The Default Stack (Lock This In)

Stop re-choosing parameters every time. Use these as your baseline:

```yaml
# Golden Config - Project Defaults
model: flux-dev           # or flux-pro for final
resolution: 1344x768      # wide cinematic
sampler: dpmpp_2m
scheduler: sgm_uniform
steps: 24                 # 20-30 range is fine
cfg_scale: 3.0            # 2.7-3.5 sweet spot
seed: [fixed for repeatability]
```

**No LoRAs initially** - add them later once the pipeline itself behaves.

The preset `--preset photorealistic` applies these automatically.

---

## Prompt Tips

### Formula

```
[Camera] + [Subject] + [Technical] + [Lighting] + [Imperfections]
```

### Example

```
Professional DSLR photograph,
85mm portrait lens,
craftsman working in woodshop,
soft window light from left,
shallow depth of field,
Kodak Portra 400 film aesthetic,
natural wood grain textures,
subtle dust particles in light rays
```

### Realism Triggers

- **Camera:** "DSLR", "mirrorless", "medium format", "Hasselblad"
- **Lens:** "50mm f/1.4", "85mm portrait", "24mm wide angle"
- **Film:** "Kodak Portra", "Fujifilm", "film grain", "analog"
- **Light:** "golden hour", "soft diffused", "volumetric", "rim light"
- **Imperfections:** "lens flare", "bokeh", "dust particles", "film grain"

---

## Seed Reproducibility

Every generation logs a seed. Use it to reproduce or iterate:

```bash
# First run outputs: "Seed: 42819 (use --seed 42819 to reproduce)"

# Reproduce exactly
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --seed 42819 \
  "Same prompt"

# Iterate with same seed, different prompt
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --seed 42819 \
  "Same scene but at sunset"
```

---

## Common Workflows

### Portrait Photography

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Professional headshot, woman in business attire, \
   neutral gray background, soft studio lighting, \
   85mm lens, shallow depth of field, \
   natural skin texture, subtle catchlight in eyes"
```

### Landscape/Scenery

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "Dramatic mountain landscape, \
   snow-capped peaks, alpine lake reflection, \
   golden hour lighting, wispy clouds, \
   wide angle 24mm, deep depth of field"
```

### Product Photography

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Luxury watch on marble surface, \
   soft studio lighting with subtle reflections, \
   macro lens, extreme detail on watch face, \
   clean minimal composition, slight shadow"
```

### Architectural/Interior

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Modern living room interior, \
   floor to ceiling windows, city view, \
   warm afternoon light, minimalist furniture, \
   wide angle architectural photography, \
   slight lens distortion at edges"
```

---

## Complete 3-Pass Example: Gothic Winter Park

A concrete, reusable workflow for a complex narrative scene.

### The Goal

Create a gothic winter dawn scene with:
- Cobblestone path with fresh snow
- Wrought-iron bench with a heart melted in snow
- River with iron railing and stone bridge
- Small barefoot footprints in snow
- Crow with emerald eyes on bridge

### Pass 1: Composition (text2img)

**Goal:** Layout only. No heart, no footprints, no crow yet.

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  --output park_base.png \
  "Gothic winter dawn in a foggy park. A pristine cobblestone path \
   covered with a light, untouched layer of new snow curves gently \
   forward through tall bare trees. On the right side of the path \
   stands a wrought-iron-and-wood bench, completely clean with \
   undisturbed snow on the seat. On the left side, a narrow river \
   runs parallel to the path with a beautiful old iron railing along \
   its edge. A stone bridge crosses the river from right to left in \
   the middle distance. Frosted oak trees arch overhead like a \
   cathedral. Soft mist rises from the river and fog thickens in \
   the distance. The snow everywhere is smooth and unbroken, with \
   no footprints or disturbances."
```

**Negative prompt elements:** people, animals, footprints, heart shapes, text, logos, extra objects

Generate 4 options, choose the one where geometry feels right → save as `park_base.png`

### Pass 2: Clean Realism (img2img, low denoise)

**Goal:** Clean, realistic rendering of the chosen composition.

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset photorealistic \
  --phase refine \
  --image park_base.png \
  --strength 0.35 \
  --output park_clean.png \
  "Re-render this exact scene cleanly and realistically while keeping \
   the same composition, camera angle, and layout. Crisp winter \
   atmosphere, smooth snow, realistic cobblestones lightly dusted \
   with fresh snow, natural wood on the bench, realistic wrought \
   iron railings, frosted tree branches, and soft fog. Do not move \
   or add any objects. No footprints, no people, no birds, no hearts."
```

Same layout, better textures and realism → save as `park_clean.png`

### Pass 3: Micro-Details via Inpainting

Now add specific elements one by one with masked edits.

#### 3a. Heart on the Bench

Mask only the bench seat area.

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset photorealistic \
  --phase detail \
  --image park_clean.png \
  --mask bench_seat_mask.png \
  --strength 0.4 \
  --output park_heart.png \
  "On the bench seat, melt the snow in the shape of a single stylized \
   heart exactly where someone had been sitting. The heart reveals \
   the warm wooden slats beneath. Do not place anything on the \
   backrest. Keep all other snow on and around the bench undisturbed."
```

#### 3b. Barefoot Prints

Mask only a small oval patch in front of the bench.

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset photorealistic \
  --phase detail \
  --image park_heart.png \
  --mask footprint_area_mask.png \
  --strength 0.4 \
  --output park_heart_feet.png \
  "In the clean snow directly in front of the bench, add exactly one \
   pair of very small, delicate barefoot footprints. The two prints \
   are side by side, close together, as if a petite lady had just \
   stood up from the bench and is still standing there. Each footprint \
   is about half the length of a normal adult footprint, with narrow \
   heels and small toes. They do not form a trail and do not point \
   clearly toward or away from the bench. No other footprints or \
   marks appear anywhere outside this small area."
```

#### 3c. Crow on Bridge

Mask a small area on the bridge railing.

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset photorealistic \
  --phase detail \
  --image park_heart_feet.png \
  --mask bridge_railing_mask.png \
  --strength 0.4 \
  --output park_final.png \
  "Add a single glossy black crow perched on the corner of the bridge \
   railing above the river, sized realistically. Give it subtle \
   unnatural emerald-green eyes that catch the light. Do not add any \
   extra birds or animals and do not change the snow, footprints, \
   or bench."
```

### Result: Repeatable Pipeline

```
text2img    → park_base.png      (composition)
img2img     → park_clean.png     (realism pass)
inpaint x3  → park_final.png     (heart, feet, crow)
```

Same structure works for any narrative scene with multiple specific elements.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Image too "AI-looking" | Add imperfection terms (grain, flare, dust) |
| Wrong composition | Use `--phase composition --batch 6` for more options |
| Refinement changes too much | Lower `--strength` to 0.25-0.30 |
| Hands/faces wrong | Use `--phase detail` with mask on problem area |
| Colors look off | Add color anchor terms ("natural tones", specific film stock) |
| Too smooth/plastic | Add texture terms ("skin pores", "fabric weave", "wood grain") |

---

## Reducing Token/Credit Waste

### Fix and Log Seeds

Always store prompt + seed + params with each saved image. If something is almost right, refine from that instead of regenerating from scratch.

```bash
# Output includes: "Seed: 42819 (use --seed 42819 to reproduce)"
# Save this with your image!
```

### Limit Batches

Do 4 images per prompt, not 20. The 3-pass structure already gives you multiple opportunities to adjust.

### Work at Moderate Resolution First

- **Exploration:** 1024x576 or 1152x648
- **Final output:** Upscale only once you like the result

### One Change Per Pass

Don't ask "add footprints + resize crow + move bridge" in one go. That's when models go wild and you spend 5 more runs fixing them.

### Keep a Golden Config File

Store your chosen defaults in `presets/defaults.yaml`. Every request imports from that, then overrides only what's necessary.

```yaml
# ~/.claude/skills/Photorealistic/presets/defaults.yaml
model: flux-dev
resolution: 1344x768
sampler: dpmpp_2m
scheduler: sgm_uniform
steps: 24
cfg_scale: 3.0
```

---

## File Locations

```
~/.claude/skills/Photorealistic/
├── README.md                    ← You are here
├── SKILL.md                     ← Skill definition for PAI
├── workflows/
│   ├── 3pass.md                 ← Complete workflow guide
│   ├── composition.md           ← Pass 1 details
│   ├── refinement.md            ← Pass 2 details
│   ├── detail.md                ← Pass 3 details
│   └── single-shot.md           ← Quick generation
└── presets/
    └── defaults.yaml            ← Golden config settings
```

**Tool location:** `~/.claude/skills/Art/tools/generate-ulart-image.ts`

---

## Slash Commands

Quick access to all workflow phases via Claude Code slash commands:

| Command | Purpose |
|---------|---------|
| `/photo [prompt]` | Quick single-shot generation |
| `/photo-compose [prompt]` | Start 3-pass with 4 composition options |
| `/photo-refine [image] [notes]` | Refine selected composition |
| `/photo-detail [image] [mask] [fix]` | Inpaint specific areas |
| `/photo-session [date]` | View generation history |

### Examples

```bash
# Quick single image
/photo "Mountain lake at sunrise, 50mm lens, soft morning light"

# Start 3-pass workflow
/photo-compose "Gothic winter park, cobblestone path, bare trees"

# Refine chosen composition
/photo-refine ~/Pictures/generations/compose-v2.png

# View today's session
/photo-session
```

---

## Session Logging

Every generation is **automatically logged** to daily JSONL files, with images organized by date:

```
~/.claude/history/photorealistic/
├── 2025-12-05.jsonl              # Log for Dec 5
├── 2025-12-05/                   # Images for Dec 5
│   ├── photo-143022.png
│   ├── compose-150122-v1.png
│   ├── compose-150122-v2.png
│   └── refine-151530.png
├── 2025-12-04.jsonl              # Log for Dec 4
├── 2025-12-04/                   # Images for Dec 4
│   └── ...
└── ...
```

**Configure output location** in `~/.claude/settings.json`:
```json
{
  "photorealistic": {
    "outputDir": "~/.claude/history/photorealistic"
  }
}
```

Each entry captures:
- Timestamp and session date
- Prompt and model
- Seed for reproducibility
- All parameters (guidance, steps, strength)
- Input/output image paths
- Workflow phase and preset

### Viewing Logs

Use the `/photo-session` command or query directly:

```bash
# View today's log
cat ~/.claude/history/photorealistic/$(date +%Y-%m-%d).jsonl | jq

# Find all images with a specific seed
grep '"seed":42819' ~/.claude/history/photorealistic/*.jsonl

# Find all composition phases
grep '"phase":"composition"' ~/.claude/history/photorealistic/*.jsonl
```

---

## vs. Art Skill

| Use Photorealistic | Use Art |
|--------------------|---------|
| Realistic photos | Editorial illustrations |
| Complex scenes | Flat color graphics |
| Scenery/landscapes | Technical diagrams |
| Product shots | Conceptual metaphors |
| Portraits | New Yorker style |

The Art skill explicitly excludes photorealistic elements. Use this skill for any photo-quality imagery.
