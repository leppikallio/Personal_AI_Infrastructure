# 3-Pass Workflow - Complete Guide

The 3-pass workflow achieves 91% success rate on complex compositions vs 76% for single-shot approaches.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   COMPOSITION   │ ──▶ │   REFINEMENT    │ ──▶ │     DETAIL      │
│   (text2img)    │     │   (img2img)     │     │   (inpainting)  │
│                 │     │                 │     │                 │
│  Get structure  │     │  Add realism    │     │  Fix micro-     │
│  right first    │     │  preserve comp  │     │  issues         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   You select              You approve             You approve
   best option             or adjust               final result
```

## Phase 1: COMPOSITION

**Goal:** Get the structure, layout, and overall composition right.

**What happens:**
- Text2img generation from your prompt
- Generates batch (default 4) for your selection
- Lower detail focus, higher compositional accuracy

**Settings:**
```yaml
steps: 20          # Faster iteration
guidance: 3.5      # FLUX-optimal CFG
batch: 4           # Options for selection
```

**Command:**
```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "Your detailed prompt here"
```

**Your decision point:**
- Review all 4 outputs
- Pick the one with best composition
- Note the seed for reproducibility
- Provide feedback for re-generation if none work

## Phase 2: REFINEMENT

**Goal:** Enhance realism while preserving the composition you chose.

**What happens:**
- img2img on your selected composition
- Low strength (0.35-0.4) to preserve structure
- Adds detail, texture, photorealistic qualities

**Settings:**
```yaml
steps: 28          # Full quality
guidance: 3.5      # FLUX-optimal CFG
strength: 0.35     # Preserve composition
```

**Command:**
```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase refine \
  --image /path/to/chosen-composition.png \
  --strength 0.35 \
  "Same prompt as composition phase"
```

**Your decision point:**
- Compare refined vs original composition
- Check if key elements preserved
- Approve or request strength adjustment

## Phase 3: DETAIL

**Goal:** Fix specific problem areas without affecting the rest.

**What happens:**
- Inpainting on masked areas only
- Higher strength for targeted fixes
- Preserves all unmasked areas perfectly

**Settings:**
```yaml
steps: 30          # Maximum quality for details
strength: 0.5      # Moderate change in masked area
```

**Command:**
```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase detail \
  --image /path/to/refined.png \
  --mask /path/to/problem-area-mask.png \
  "Specific fix: more detailed bark texture"
```

**Your decision point:**
- Identify problem areas (hands, text, small objects)
- Create masks for those areas
- Approve or iterate on specific fixes

## Optional Phase 4: UPSCALE

**Goal:** Increase resolution for final output.

**Only after you approve the detail phase result.**

**Command:**
```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase upscale \
  --image /path/to/final.png
```

## Complete Session Example

```
YOU: "Create a photorealistic image of a Japanese garden in autumn"

PAI: Starting COMPOSITION phase. Generating 4 variations...
     [Shows 4 images]

     Options:
     1. Wide view with bridge over koi pond
     2. Close-up of maple tree with stone lantern
     3. Pathway perspective through maple trees
     4. Tea house with garden foreground

     Seed logged: 42819 (option 1), 38271 (option 2)...

YOU: "Option 3, but more mist in the background"

PAI: Regenerating with mist emphasis...
     [Shows updated options]

YOU: "Perfect. Use the first one."

PAI: Starting REFINEMENT phase on your selection...
     Strength 0.35 to preserve composition.
     [Shows refined version]

     Changes: Enhanced leaf texture, improved lighting,
     added subtle morning mist, refined stone path detail.

YOU: "The lantern looks slightly off. Fix just that area."

PAI: Starting DETAIL phase - inpainting lantern area...
     [Shows before/after comparison]

YOU: "Looks great. Final version approved."

PAI: Output saved to: /path/to/japanese-garden-final.png
     Seed: 42819 (use --seed 42819 to reproduce composition)
```

## When to Skip Phases

| Skip... | When... |
|---------|---------|
| REFINEMENT | Composition already has good realism |
| DETAIL | No specific problem areas |
| UPSCALE | 1024x1024 is sufficient |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Composition always similar | Increase batch size, vary prompt |
| Refinement changes too much | Lower strength to 0.25-0.30 |
| Detail affects surrounding area | Refine mask, shrink boundaries |
| Overall quality low | Use flux-pro, not schnell |
