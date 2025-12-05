---
name: Photorealistic
description: Photorealistic image generation using FLUX models with 3-pass workflow. USE WHEN user says 'photorealistic', 'realistic photo', 'photo-quality', 'lifelike image', 'complex scene', 'scenery generation', OR needs high-fidelity imagery with human-in-the-loop control.
---

# Photorealistic - API-Driven Image Generation

Photorealistic image generation using FLUX models via Replicate API. Human-in-the-loop 3-pass workflow for complex compositions with batch generation for selection.

## Quick Reference

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Default Model** | FLUX 1.1 Pro | Via Replicate API |
| **CFG Scale** | 3.0-4.0 | NOT 7-12 like old Stable Diffusion |
| **Steps** | 28 | For 1.1 Pro |
| **Workflow** | 3-pass | Composition → Refinement → Detail |
| **Resolution** | Start 1024x1024 | Upscale in final step |

## Key Principle: Human-in-the-Loop

**YOU control every phase. PAI assists but doesn't automate.**

Every phase generates a batch of options for your selection. Nothing advances without your explicit approval.

## 3-Pass Workflow Overview

```
COMPOSITION (text2img)     → Pick best structure
    ↓ your approval
REFINEMENT (img2img 0.35)  → Enhance realism
    ↓ your approval
DETAIL (inpainting)        → Fix micro-issues
    ↓ your approval
UPSCALE (optional)         → Final resolution
```

## CLI Usage

The tool is located at: `~/.claude/skills/Art/tools/generate-ulart-image.ts`

### Quick Start

```bash
# Single photorealistic image
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "A misty forest at dawn, golden light rays through trees"

# Composition phase with batch for selection
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "A misty forest at dawn, golden light rays through trees"
```

### Workflow Phase Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--preset photorealistic` | Apply FLUX-optimized defaults | CFG 3.5, steps 28 |
| `--phase composition` | Text2img for structure | First pass |
| `--phase refine` | img2img enhancement | Requires `--image` |
| `--phase detail` | Inpainting fixes | Requires `--image` |
| `--phase upscale` | Final resolution | Requires `--image` |
| `--batch N` | Generate N images for selection | 1-10 |
| `--seed N` | Reproduce exact result | Use logged seed |

### Full 3-Pass Example

```bash
# Pass 1: COMPOSITION - Generate 4 options
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "A misty forest at dawn, golden light rays through trees"

# → Pick best composition (e.g., output_002.png)
# → Note the seed from output for reproducibility

# Pass 2: REFINEMENT - Enhance chosen image
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase refine \
  --image /path/to/output_002.png \
  --strength 0.35 \
  "A misty forest at dawn, golden light rays through trees"

# Pass 3: DETAIL - Fix specific areas (if needed)
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase detail \
  --image /path/to/refined.png \
  --mask /path/to/problem-area-mask.png \
  "More detailed bark texture on the foreground trees"
```

## Prompt Engineering for Photorealism

### Formula

```
[Camera] + [Subject] + [Technical] + [Lighting] + [Imperfections]
```

### Example Build-Up

```
Base:     "forest at dawn"
+Camera:  "wide angle shot of a forest at dawn"
+Tech:    "wide angle shot of a forest at dawn, 35mm film"
+Light:   "wide angle shot of a forest at dawn, 35mm film, golden hour lighting, volumetric fog"
+Imperfect: "wide angle shot of a forest at dawn, 35mm film, golden hour lighting, volumetric fog, lens flare, film grain"
```

### Realism Triggers

| Category | Terms |
|----------|-------|
| **Camera** | DSLR, mirrorless, 35mm, medium format, Hasselblad, Sony A7R |
| **Lens** | 50mm f/1.4, 85mm portrait, 24mm wide, macro, telephoto |
| **Film** | Kodak Portra, Fujifilm, film grain, analog |
| **Lighting** | Golden hour, blue hour, soft diffused, rim light, volumetric |
| **Imperfections** | Lens flare, chromatic aberration, bokeh, dust particles |

## Model Variants

| Model | Speed | Quality | Use Case |
|-------|-------|---------|----------|
| `flux-pro` | Slow | Highest | Final production |
| `flux-dev` | Medium | High | Iteration, testing |
| `flux-schnell` | Fast | Good | Quick previews, batch exploration |

## Phase Checkpoints (Human-in-the-Loop)

| Phase | PAI Does | You Do |
|-------|----------|--------|
| **COMPOSITION** | Generate batch (default 4) | Pick best, give feedback |
| **REFINEMENT** | img2img on your choice | Approve or request changes |
| **DETAIL** | Inpaint specific areas | Identify problem areas, approve |
| **UPSCALE** | Only on approval | Confirm resolution needs |

## When NOT to Use This Skill

Use the **Art** skill instead for:
- Editorial illustrations
- Flat color graphics
- Technical diagrams
- Abstract conceptual metaphors
- New Yorker / Saul Steinberg aesthetic

## Workflow Documentation

- [3-Pass Complete Workflow](workflows/3pass.md)
- [Composition Phase Details](workflows/composition.md)
- [Refinement Phase Details](workflows/refinement.md)
- [Detail Phase Details](workflows/detail.md)
- [Single-Shot Quick Reference](workflows/single-shot.md)

## Golden Config

See [presets/defaults.yaml](presets/defaults.yaml) for locked optimal settings.
