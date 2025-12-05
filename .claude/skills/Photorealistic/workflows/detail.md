# Detail Phase

Third pass of the 3-pass workflow. Focus: targeted fixes using inpainting.

## Purpose

Fix specific problem areas without affecting the rest:
- Correct hands, faces, text
- Fix small object issues
- Add missing details
- Repair artifacts
- Touch up specific zones

## Settings

```yaml
phase: detail
steps: 30          # Maximum quality
strength: 0.5      # Higher for meaningful change in masked area
```

## Command

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --phase detail \
  --image /path/to/refined.png \
  --mask /path/to/mask.png \
  "Specific fix description"
```

## Creating Masks

Masks define which areas to regenerate:
- White = regenerate (affected area)
- Black = preserve (protected area)

### Mask Tools
- Photoshop/GIMP: Quick mask mode
- Preview (macOS): Markup tools
- Online: Photopea, Canva

### Mask Best Practices

| Do | Don't |
|-----|-------|
| Feather edges slightly | Hard pixel boundaries |
| Include surrounding context | Tight cropping on problem |
| Mask whole objects | Partial object masks |
| Use generous margins | Exact boundaries |

## Prompt Strategy

Detail prompts should be specific to the fix:

### Generic (Less Effective)
```
Fix the hands
```

### Specific (Better)
```
Realistic human hands,
natural finger positioning,
proper proportions,
matching skin tone to rest of image
```

### With Context (Best)
```
Realistic human hands holding a coffee cup,
relaxed natural grip,
five fingers visible,
warm caucasian skin tone matching subject,
soft indoor lighting
```

## Common Fixes

| Problem | Mask Area | Prompt Focus |
|---------|-----------|--------------|
| Malformed hands | Hands + wrists | "realistic hands, proper anatomy" |
| Wrong face details | Face region | "photorealistic face, natural expression" |
| Text errors | Text area | "clear legible text reading [WORD]" |
| Object artifacts | Object + margin | "clean [object], no artifacts" |
| Extra limbs | Extra limb area | "remove extra arm, natural body" |

## Iteration

Detail phase often requires multiple passes:

1. **First pass:** Major fix
2. **Review:** Check if resolved
3. **Second pass:** Fine-tune if needed
4. **Different mask:** Try larger/smaller area

## Strength Adjustment

| Strength | Use When |
|----------|----------|
| 0.3-0.4 | Subtle touch-ups |
| 0.5-0.6 | Standard fixes |
| 0.7-0.8 | Major regeneration |
| 0.9+ | Complete replacement |

## When to Use Detail vs. Refinement

| Use Detail | Use Refinement |
|------------|----------------|
| Specific problem areas | Overall enhancement |
| Fix artifacts | Add texture everywhere |
| Correct anatomy | Improve lighting |
| Small regions | Whole image |

## Output

Detail phase outputs:
- Fixed image with inpainted region
- Logged seed
- Ready for approval or another detail pass
