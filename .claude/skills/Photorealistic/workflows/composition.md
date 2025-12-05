# Composition Phase

First pass of the 3-pass workflow. Focus: structure, layout, overall composition.

## Purpose

Get the fundamental elements right before adding detail:
- Subject placement
- Camera angle
- Scene layout
- Major elements positioning
- Overall balance

## Settings

```yaml
phase: composition
steps: 20          # Faster iteration
guidance: 3.5      # FLUX-optimal
batch: 4           # Multiple options
```

## Command

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase composition \
  --batch 4 \
  "Your prompt"
```

## Prompt Strategy

In composition phase, focus prompts on:
- Overall scene description
- Subject positioning ("centered", "rule of thirds", "off-center left")
- Camera perspective ("wide angle", "close-up", "bird's eye")
- Major elements only

Save detailed texture/material descriptions for refinement.

### Good Composition Prompt
```
Wide angle shot of a mountain lake at sunrise,
snow-capped peaks in background,
reflections on calm water,
single cabin on the left shore,
rule of thirds composition
```

### Less Effective (Too Much Detail for Composition)
```
Wide angle shot of a mountain lake at sunrise,
snow-capped peaks with jagged granite textures,
crystal clear water with visible pebbles,
weathered wooden cabin with moss on roof,
golden light with volumetric rays...
```

## Batch Selection Criteria

When reviewing composition batch:

| Priority | Check For |
|----------|-----------|
| 1 | Subject placement correct |
| 2 | Camera angle works |
| 3 | Major elements balanced |
| 4 | No compositional flaws |
| 5 | Foundation for refinement |

Don't worry about:
- Fine texture detail
- Photorealistic quality
- Small imperfections

These are addressed in subsequent phases.

## Iteration Strategy

If no composition works:
1. Adjust batch size (try 6-8)
2. Modify positioning language
3. Try different camera angles
4. Simplify prompt to core elements
5. Use --seed to lock good elements, vary others

## Output

Composition phase outputs:
- N images (based on --batch)
- Logged seeds for each
- Selection for refinement phase
