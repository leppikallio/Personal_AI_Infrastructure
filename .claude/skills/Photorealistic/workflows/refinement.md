# Refinement Phase

Second pass of the 3-pass workflow. Focus: photorealistic enhancement while preserving composition.

## Purpose

Enhance realism without changing structure:
- Add texture and detail
- Improve lighting
- Enhance materials
- Add photorealistic qualities
- Preserve the composition you approved

## Settings

```yaml
phase: refine
steps: 28          # Full quality
guidance: 3.5      # FLUX-optimal
strength: 0.35     # CRITICAL: Low to preserve composition
```

### Strength Guidelines

| Strength | Effect |
|----------|--------|
| 0.25-0.30 | Minimal change, maximum composition preservation |
| 0.35-0.40 | Sweet spot: noticeable enhancement, composition intact |
| 0.45-0.50 | Significant enhancement, some composition drift |
| 0.50+ | Major changes, composition may shift |

**Default: 0.35** - Start here, adjust based on results.

## Command

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase refine \
  --image /path/to/composition.png \
  --strength 0.35 \
  "Same or enhanced prompt"
```

## Prompt Enhancement

In refinement, you can add detail terms:

### Composition Prompt (Phase 1)
```
Mountain lake at sunrise, cabin on shore
```

### Refinement Prompt (Phase 2)
```
Mountain lake at sunrise, cabin on shore,
35mm film photography, Kodak Portra 400,
soft golden hour lighting,
mirror-like water reflections,
atmospheric haze in distance,
subtle film grain
```

## Before/After Comparison

Always compare refinement to composition:

| Check | Expected |
|-------|----------|
| Subject position | Same |
| Camera angle | Same |
| Major elements | Same |
| Texture detail | Enhanced |
| Lighting quality | Improved |
| Material realism | Better |
| Overall feel | More photographic |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Composition shifted | Lower strength (0.25-0.30) |
| Not enough enhancement | Raise strength (0.40-0.45) |
| Wrong areas changed | Use detail phase with mask instead |
| Quality decreased | Check model (use flux-pro) |
| Colors shifted | Add color anchor terms to prompt |

## When to Skip

Skip refinement if:
- Composition already has good realism
- You want to jump directly to targeted fixes
- Time constraints (quick iteration)

## Output

Refinement phase outputs:
- Single refined image
- Logged seed
- Ready for detail phase or final approval
