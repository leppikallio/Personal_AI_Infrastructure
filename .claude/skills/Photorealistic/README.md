# Photorealistic Image Generation

Generate photorealistic images using FLUX models with a human-in-the-loop 3-pass workflow. Supports both quick single-shot generation and complex multi-component projects with full iteration tracking.

---

## Golden Rules

1. **Pick a default stack and stop re-choosing every time**
2. **Fix and log seeds** - always store prompt + seed + params with each saved image
3. **Limit batches** - 4 images per prompt, not 20
4. **Work at moderate resolution first** - 1024x576 for exploration, upscale only when satisfied
5. **One change per pass** - don't combine multiple edits in one request

---

## Two Modes of Operation

### 1. Legacy Mode (Quick Single Images)
For fast, standalone generations without project structure:
```bash
/photo-compose "Atmospheric gothic park at dawn"
```
Outputs to: `$PHOTO_DIR/YYYY-MM-DD/compose-HHMMSS.png`

### 2. Project Mode (Multi-Component Scenes)
For complex scenes with multiple iterations and full traceability:
```bash
/photo-compose --project gothic-park --component background --name base "Atmospheric gothic park at dawn"
```
Outputs to: `$PHOTO_DIR/projects/gothic-park/components/background/iterations/001-compose-base/`

---

## Project-Based Workflow

### Creating a Project

```bash
/photo-project --create gothic-park "Gothic park at dawn, circa 1898"
```

Creates:
```
projects/gothic-park/
├── project.json
├── components/
├── masks/
├── pipeline/
└── composite/
```

### The Iteration Directory Structure

Each generation pass creates a self-contained iteration directory:

```
components/background/
├── chain.json                    # Tracks lineage
└── iterations/
    ├── 001-compose-base/
    │   ├── image.png             # Selected variation
    │   ├── thumb.png
    │   ├── metadata.json         # Full generation params
    │   └── variations/           # All batch options
    │       ├── v1.png
    │       ├── v2.png
    │       └── ...
    ├── 002-refine-fog/
    │   ├── image.png
    │   ├── thumb.png
    │   └── metadata.json         # source: "001-compose-base"
    ├── 003-refine-lighting/
    │   ├── image.png
    │   └── metadata.json         # source: "002-refine-fog"
    └── 004-detail-hands/
        ├── image.png
        ├── mask.png              # Mask used for inpainting
        └── metadata.json         # source: "003-refine-lighting"
```

### Benefits of Iteration Directories

- **Self-contained:** Each pass has all data needed to reproduce
- **Traceable:** `source` field in metadata.json tracks the chain
- **Branchable:** Can create multiple paths from same source
- **Reproducible:** Seeds, prompts, and all params stored with each image

---

## Slash Commands

### Project Management

| Command | Purpose |
|---------|---------|
| `/photo-project` | List all projects |
| `/photo-project NAME` | Show project details |
| `/photo-project --create NAME "desc"` | Create new project |
| `/photo-project --components NAME` | List components |
| `/photo-project --iterations NAME COMP` | List iterations for component |
| `/photo-project --chain NAME COMP` | Show iteration chain tree |
| `/photo-project --status NAME` | Show project progress |

### Generation Commands

| Command | Purpose |
|---------|---------|
| `/photo [prompt]` | Quick single-shot generation |
| `/photo-compose [flags] [prompt]` | Start with composition options |
| `/photo-refine [flags] [source] [notes]` | Refine selected composition |
| `/photo-detail [flags] [source] [--mask] [fix]` | Inpaint specific areas |

### Command Flags

**For project mode (all commands):**
- `--project NAME` - Project name (required for project mode)
- `--component TYPE` - Component type (background, bridge, bench, figure, prop, overlay)

**For compose:**
- `--name NAME` - Iteration name (e.g., "base", "alt") - defaults to timestamp
- `--batch N` - Number of variations (1-10)

**For refine/detail:**
- `--layer NAME` - What this pass changes (e.g., "fog", "lighting", "hands")
- `--strength 0.1-0.9` - Denoising strength

**For detail:**
- `--mask PATH` - Mask image (white=regenerate, black=preserve)

---

## Complete Project Workflow Example

### 1. Create Project
```bash
/photo-project --create gothic-park "Gothic park at dawn, circa 1898"
```

### 2. Generate Background Compositions
```bash
/photo-compose --project gothic-park --component background --name base \
  "Atmospheric gothic park at dawn, cobblestone path, bare trees, soft fog"
```
→ Creates `001-compose-base/` with 4 variations

### 3. Select and Refine
```bash
# After selecting v3 as the best composition
/photo-refine --project gothic-park --component background --layer fog \
  001-compose-base "enhance fog density and depth"
```
→ Creates `002-refine-fog/` with source pointing to 001

### 4. Continue Refining
```bash
/photo-refine --project gothic-park --component background --layer lighting \
  002-refine-fog "warm dawn lighting, golden hour tones"
```
→ Creates `003-refine-lighting/` with source pointing to 002

### 5. Detail Fixes
```bash
/photo-detail --project gothic-park --component background --layer hands \
  003-refine-lighting --mask hands.png "fix the hands"
```
→ Creates `004-detail-hands/` with mask stored

### 6. View Chain
```bash
/photo-project --chain gothic-park background
```
Output:
```
001-compose-base
  └── 002-refine-fog
      └── 003-refine-lighting
          └── 004-detail-hands
```

---

## The 3-Pass Workflow

For complex scenes, use the 3-pass workflow (91% success rate vs 76% single-shot):

```
COMPOSITION → REFINEMENT → DETAIL
```

### Pass 1: Composition (`/photo-compose`)

Generate multiple options, pick the best structure:
- Focus on layout, geometry, and overall feel
- Don't worry about fine details yet
- Generate 4-8 variations to choose from

### Pass 2: Refinement (`/photo-refine`)

Enhance realism on your chosen composition:
- Low denoising strength (0.30-0.40) to preserve structure
- Add texture, lighting, atmosphere
- Can do multiple refinement passes for different aspects

### Pass 3: Detail (`/photo-detail`)

Fix specific problem areas with inpainting:
- Create masks for problem areas (hands, faces, text)
- Target one issue per pass
- Higher strength (0.40-0.60) for actual changes

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

## Directory Structure

### Full Project Layout

```
~/.claude/history/photorealistic/
├── projects/
│   └── gothic-park/
│       ├── project.json                # Project manifest
│       ├── components/
│       │   ├── background/
│       │   │   ├── chain.json          # Iteration lineage
│       │   │   └── iterations/
│       │   │       ├── 001-compose-base/
│       │   │       ├── 002-refine-fog/
│       │   │       └── ...
│       │   ├── bridge/
│       │   │   └── iterations/...
│       │   └── figure/
│       │       └── iterations/...
│       ├── masks/                      # Project-level masks
│       ├── pipeline/                   # Pipeline execution outputs
│       └── composite/                  # Final composites
├── 2025-12-06/                         # Legacy date-based outputs
├── 2025-12-06.jsonl                    # Legacy logs
└── recipes/                            # Saved recipes
```

### metadata.json Format

```json
{
  "id": "002-refine-fog",
  "phase": "refine",
  "layer": "fog",
  "source": "001-compose-base",
  "created": "2025-12-06T14:30:00Z",
  "model": "flux-pro",
  "preset": "strict",
  "strength": 0.35,
  "seed": 393567706,
  "prompt": "Enhanced atmospheric fog...",
  "notes": "Good depth, maybe too dense"
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Image too "AI-looking" | Add imperfection terms (grain, flare, dust) |
| Wrong composition | Use `--batch 6` for more options |
| Refinement changes too much | Lower `--strength` to 0.25-0.30 |
| Hands/faces wrong | Use detail pass with mask on problem area |
| Colors look off | Add color anchor terms ("natural tones", specific film stock) |
| Too smooth/plastic | Add texture terms ("skin pores", "fabric weave", "wood grain") |

---

## File Locations

```
~/.claude/skills/Photorealistic/
├── README.md                    ← You are here
├── SKILL.md                     ← Skill definition for PAI
├── get-photo-config.ts          ← Configuration loader
├── get-photo-dir.sh             ← Directory resolver
└── workflows/
    ├── 3pass.md                 ← Complete workflow guide
    ├── composition.md           ← Pass 1 details
    ├── refinement.md            ← Pass 2 details
    ├── detail.md                ← Pass 3 details
    └── single-shot.md           ← Quick generation

~/.claude/commands/
├── photo.md                     ← Single-shot command
├── photo-compose.md             ← Composition command
├── photo-refine.md              ← Refinement command
├── photo-detail.md              ← Detail/inpainting command
└── photo-project.md             ← Project management command
```

**Tool location:** `~/.claude/skills/Art/tools/generate-ulart-image.ts`

---

## Configuration

Configure defaults in `~/.claude/settings.json`:

```json
{
  "photorealistic": {
    "outputDir": "~/.claude/history/photorealistic",
    "model": "flux-dev",
    "preset": "strict",
    "batch": 4,
    "openImages": true,
    "generateThumbnails": true
  }
}
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
