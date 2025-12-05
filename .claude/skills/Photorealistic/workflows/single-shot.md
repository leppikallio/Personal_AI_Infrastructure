# Single-Shot Workflow

Quick reference for single-image generation without multi-pass workflow.

## When to Use

- Quick iterations
- Simple subjects
- Testing prompts
- Time-constrained work
- When 76% success rate is acceptable

## Command

```bash
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Your prompt"
```

## Settings

Single-shot uses full quality settings:
```yaml
model: flux-pro
steps: 28
guidance: 3.5
```

## Quick Model Selection

| Model | Use For |
|-------|---------|
| `flux-schnell` | Rapid iteration, 1-4 steps |
| `flux-dev` | Balance of speed and quality |
| `flux-pro` | Production quality (default) |

### Fast Iteration Example

```bash
# Quick previews with schnell
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-schnell \
  "Test prompt"

# When satisfied, switch to pro
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Final prompt"
```

## Seed Workflow

Use seeds to iterate on good results:

```bash
# Initial generation
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "Mountain landscape"
# Output: Seed: 42819

# Reproduce exact result
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --seed 42819 \
  "Mountain landscape"

# Vary prompt, keep seed
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --seed 42819 \
  "Mountain landscape at sunset"
```

## Prompt Tips for Single-Shot

Since you're not iterating through phases, front-load your prompt:

```
[Camera] + [Subject] + [Technical] + [Lighting] + [Imperfections]
```

### Complete Single-Shot Prompt
```
Professional DSLR photograph,
50mm f/1.4 lens,
portrait of a craftsman in workshop,
soft window light from left,
shallow depth of field,
Kodak Portra 400 film aesthetic,
natural skin tones,
subtle film grain,
authentic workshop environment
```

## Limitations

Single-shot can struggle with:
- Complex multi-subject scenes
- Specific compositional requirements
- Hands and fine anatomy
- Text in images

Consider 3-pass workflow for these cases.

## Quick Reference

```bash
# Minimum viable command
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  "prompt"

# With photorealistic preset
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  "prompt"

# With custom output path
bun ~/.claude/skills/Art/tools/generate-ulart-image.ts \
  --model flux-pro \
  --preset photorealistic \
  --output /path/to/output.png \
  "prompt"
```
