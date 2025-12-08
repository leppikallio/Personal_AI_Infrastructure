#!/usr/bin/env bun

/**
 * generate-ulart-image - UL Image Generation CLI
 *
 * Generate Unsupervised Learning branded images using Flux 1.1 Pro, Nano Banana, Nano Banana Pro, or GPT-image-1.
 * Follows llcli pattern for deterministic, composable CLI design.
 *
 * Usage:
 *   generate-ulart-image --model nano-banana-pro --prompt "..." --size 16:9 --output /tmp/image.png
 *
 * @see ${PAI_DIR}/skills/art/README.md
 */

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { ApiError, GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Replicate from 'replicate';

// ============================================================================
// PAI Directory Configuration
// ============================================================================

/**
 * PAI_DIR - Base directory for Personal AI Infrastructure
 * Uses PAI_DIR environment variable with fallback to ~/.claude
 */
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// ============================================================================
// Environment Loading
// ============================================================================

/**
 * Load environment variables from ${PAI_DIR}/.env
 * This ensures API keys are available regardless of how the CLI is invoked
 */
async function loadEnv(): Promise<void> {
  const envPath = join(PAI_DIR, '.env');
  try {
    const envContent = await readFile(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Only set if not already defined (allow overrides from shell)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (_error) {
    // Silently continue if .env doesn't exist - rely on shell env vars
  }
}

// ============================================================================
// Types
// ============================================================================

type Model =
  | 'flux'
  | 'flux-pro'
  | 'flux-dev'
  | 'flux-schnell'
  | 'nano-banana'
  | 'nano-banana-pro'
  | 'gpt-image-1'
  | 'sdxl';
type Preset = 'photorealistic' | 'strict' | 'cinematic' | 'artistic' | 'raw';
type WorkflowPhase = 'composition' | 'refine' | 'detail' | 'upscale';
type ReplicateSize =
  | '1:1'
  | '16:9'
  | '3:2'
  | '2:3'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '21:9';
type OpenAISize = '1024x1024' | '1536x1024' | '1024x1536';
type GeminiSize = '1K' | '2K' | '4K';
type Size = ReplicateSize | OpenAISize | GeminiSize;
type Skill = 'photorealistic' | 'art';

// SDXL scheduler options
type SDXLScheduler =
  | 'DDIM'
  | 'DPMSolverMultistep'
  | 'HeunDiscrete'
  | 'KarrasDPM'
  | 'K_EULER_ANCESTRAL'
  | 'K_EULER'
  | 'PNDM';

interface CLIArgs {
  model: Model;
  prompt: string;
  promptFile?: string; // Read prompt from file (--prompt-file)
  size: Size;
  output: string;
  creativeVariations?: number;
  aspectRatio?: ReplicateSize; // For Gemini models
  transparent?: boolean; // Enable transparent background
  referenceImage?: string; // Reference image path (Nano Banana Pro only)
  removeBg?: boolean; // Remove background after generation using remove.bg API
  // img2img parameters (SDXL and Flux-dev)
  image?: string; // Input image for img2img mode
  strength?: number; // Denoising strength (0-1, default 0.8)
  guidance?: number; // Guidance scale (flux: 0-10, sdxl: 1-50)
  steps?: number; // Inference steps (flux: 1-50, sdxl: 1-500)
  negativePrompt?: string; // What to avoid (SDXL only)
  scheduler?: SDXLScheduler; // Sampler (SDXL only)
  // Photorealistic workflow support
  preset?: Preset; // Preset configuration (e.g., 'photorealistic')
  seed?: number; // Seed for reproducibility
  batch?: number; // Number of images to generate for selection (1-10)
  phase?: WorkflowPhase; // Workflow phase: composition, refine, detail, upscale
  open?: boolean; // Open generated image(s) after creation
  thumbnail?: boolean; // Generate 200px thumbnail after creation
  skill?: Skill; // Logging destination: photorealistic or art
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: 'flux' as Model,
  size: '16:9' as Size,
  output: '/tmp/ul-image.png',
};

// Preset configurations for different styles
// Based on research: CFG 3.0-4.0 is optimal for FLUX (NOT 7-12 like old SD)
// NOTE: For prompt exclusions ("no X"), use --strict or 'strict' preset with higher guidance
// Better approach: Use positive specification instead of negation (e.g., "empty path" not "no benches")

const PRESETS = {
  photorealistic: {
    model: 'flux-pro' as Model, // flux-1.1-pro via Replicate
    guidance: 3.5, // CFG scale - sweet spot for FLUX photorealism
    steps: 28, // Optimal for flux-1.1-pro
    strength: 0.35, // For refinement phase (img2img)
    description: 'Optimal settings for photorealistic output',
  },
  strict: {
    model: 'flux-pro' as Model,
    guidance: 6.0, // Higher guidance for stricter prompt adherence (helps with exclusions)
    steps: 30, // Slightly more steps for quality at higher guidance
    strength: 0.35,
    description: 'Stricter prompt adherence - use when exclusions matter (no X, without Y)',
  },
  cinematic: {
    model: 'flux-pro' as Model,
    guidance: 4.0, // Slightly higher for more dramatic contrast
    steps: 30,
    strength: 0.4,
    description: 'Film/movie aesthetic with dramatic lighting',
  },
  artistic: {
    model: 'flux-dev' as Model, // flux-dev allows more stylization
    guidance: 5.0, // Higher CFG for more stylized results
    steps: 35,
    strength: 0.5,
    description: 'Painterly/stylized artistic output',
  },
  raw: {
    model: 'flux' as Model, // Base model, no frills
    guidance: undefined, // Use model defaults
    steps: undefined,
    strength: undefined,
    description: 'No preset defaults - pure model output',
  },
};

// Legacy alias for compatibility
const _PHOTOREALISTIC_PRESET = PRESETS.photorealistic;

// Phase-specific defaults for multi-step workflow
const PHASE_DEFAULTS: Record<WorkflowPhase, Partial<CLIArgs>> = {
  composition: {
    // Focus on structure, not final quality
    steps: 20,
    guidance: 3.5,
  },
  refine: {
    // Enhance realism while preserving composition
    strength: 0.35,
    steps: 28,
    guidance: 3.5,
  },
  detail: {
    // Inpainting for micro-fixes
    strength: 0.5,
    steps: 30,
  },
  upscale: {
    // High quality upscaling
    steps: 30,
    strength: 0.2,
  },
};

const REPLICATE_SIZES: ReplicateSize[] = [
  '1:1',
  '16:9',
  '3:2',
  '2:3',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '21:9',
];
const OPENAI_SIZES: OpenAISize[] = ['1024x1024', '1536x1024', '1024x1536'];
const GEMINI_SIZES: GeminiSize[] = ['1K', '2K', '4K'];

// Aspect ratio mapping for Gemini (used with image size like 2K)
const GEMINI_ASPECT_RATIOS: ReplicateSize[] = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
];

// SDXL scheduler options
const SDXL_SCHEDULERS: SDXLScheduler[] = [
  'DDIM',
  'DPMSolverMultistep',
  'HeunDiscrete',
  'KarrasDPM',
  'K_EULER_ANCESTRAL',
  'K_EULER',
  'PNDM',
];

// SDXL sizes (width x height)
const SDXL_SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const;
type SDXLSize = (typeof SDXL_SIZES)[number];

// ============================================================================
// Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(
    message: string,
    public exitCode = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`❌ Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }

  console.error('❌ Unknown error:', error);
  process.exit(1);
}

// ============================================================================
// Retry Configuration (Gemini API)
// ============================================================================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 2000, // Start with 2 seconds
  maxDelayMs: 60000, // Cap at 60 seconds
  jitterFactor: 0.2, // Add ±20% jitter to prevent thundering herd
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelayMs * 2 ** attempt;
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG.maxDelayMs);

  // Add jitter: ±20% of the delay
  const jitter = cappedDelay * RETRY_CONFIG.jitterFactor * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (rate limit or transient server error)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // 429 = Rate limit, 503 = Service unavailable, 500 = Internal server error
    return [429, 503, 500].includes(error.status);
  }
  return false;
}

/**
 * Extract retry delay from API error details if available
 */
function extractRetryDelay(error: ApiError): number | null {
  // Check if error.details contains retryDelay information
  if (error.details && typeof error.details === 'object') {
    // The API may include retry-after in various formats
    const details = error.details as Record<string, unknown>;
    if ('retryDelay' in details && typeof details.retryDelay === 'number') {
      return details.retryDelay * 1000; // Convert to ms
    }
  }
  return null;
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
generate-ulart-image - UL Image Generation CLI

Generate images using Flux 1.1 Pro, SDXL, Nano Banana, Nano Banana Pro, or GPT-image-1.
Supports text-to-image and image-to-image (img2img) workflows.

USAGE:
  generate-ulart-image --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --model <model>      Model to use: flux, sdxl, nano-banana, nano-banana-pro, gpt-image-1
  --prompt <text>      Image generation prompt (quote if contains spaces)
  --prompt-file <path> Read prompt from file (alternative to --prompt)
                       Supports .txt, .md with optional YAML frontmatter for parameters

OPTIONS:
  --size <size>              Image size/aspect ratio (default: 16:9)
                             Replicate (flux, nano-banana): 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                             OpenAI (gpt-image-1): 1024x1024, 1536x1024, 1024x1536
                             Gemini (nano-banana-pro): 1K, 2K, 4K (resolution)
                             SDXL: 1024x1024, 1024x1536, 1536x1024
  --aspect-ratio <ratio>     Aspect ratio for Gemini nano-banana-pro (default: 16:9)
                             Options: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
  --output <path>            Output file path (default: /tmp/ul-image.png)
  --reference-image <path>   Reference image for style/composition guidance (Nano Banana Pro only)
  --transparent              Enable transparent background instructions
  --remove-bg                Remove background after generation using remove.bg API
  --creative-variations <n>  Generate N variations (appends -v1, -v2, etc.)
  --help, -h                 Show this help message

IMG2IMG OPTIONS (SDXL and Flux):
  --image <path>             Input image for img2img mode
                             When provided with flux, auto-uses flux-dev instead of flux-1.1-pro
  --strength <0-1>           Denoising strength (default: 0.8)
                             Lower values preserve more of the original image
  --guidance <number>        Guidance scale (flux: 0-10, sdxl: 1-50)
  --steps <number>           Inference steps (flux: 1-50, sdxl: 1-500)
  --negative-prompt <text>   What to avoid in generation (SDXL only)
  --scheduler <name>         Sampler (SDXL only): DDIM, K_EULER, DPMSolverMultistep, etc.

PRESET OPTIONS:
  --preset <preset>          Apply style preset (photorealistic|strict|cinematic|artistic|raw)
                             photorealistic: flux-pro, guidance=3.5, steps=28 (default)
                             strict: flux-pro, guidance=6.0, steps=30 (for exclusions)
                             cinematic: flux-pro, guidance=4.0, steps=30, dramatic
                             artistic: flux-dev, guidance=5.0, steps=35, stylized
                             raw: no defaults, pure model output
  --strict                   Shortcut for --preset strict (use when prompt has exclusions like "no X")
  --seed <number>            Seed for reproducibility (use same seed for same result)
  --batch <1-10>             Generate N variations for selection (default: 1)
  --phase <phase>            Workflow phase: composition, refine, detail, upscale
                             composition: Text2img for structure (steps=20)
                             refine: img2img enhancement (strength=0.35)
                             detail: Inpainting for micro-fixes (strength=0.5)
                             upscale: High-quality upscaling (strength=0.2)
  --open                     Open generated image(s) after creation (macOS: Preview)
  --thumbnail                Generate 200px thumbnail in thumbs/ subdirectory

YAML FRONTMATTER:
  Prompt files (.md) can include YAML frontmatter for configuration:

  ---
  model: sdxl
  image: /path/to/input.png
  strength: 0.3
  guidance: 6
  steps: 30
  negative_prompt: blurry, artifacts
  ---
  Your prompt text here...

  CLI flags override frontmatter values.

EXAMPLES:
  # Text-to-image with Flux
  generate-ulart-image --model flux --prompt "Minimal geometric art..." --size 16:9

  # Text-to-image with SDXL
  generate-ulart-image --model sdxl --prompt "Photorealistic landscape..." --size 1024x1024

  # img2img: Clean degraded image with SDXL (recommended for artifacts)
  generate-ulart-image --model sdxl \\
    --prompt "Clean render preserving composition" \\
    --image /tmp/degraded.png \\
    --strength 0.3 \\
    --guidance 6 \\
    --negative-prompt "blurry, artifacts, distorted" \\
    --output /tmp/cleaned.png

  # img2img: Using Flux (auto-routes to flux-dev)
  generate-ulart-image --model flux \\
    --prompt "Clean render of scene" \\
    --image /tmp/degraded.png \\
    --strength 0.3 \\
    --output /tmp/cleaned.png

  # img2img: All config in frontmatter
  generate-ulart-image --prompt-file prompts/clean-scene.md --output /tmp/cleaned.png

  # Nano Banana Pro with reference image
  generate-ulart-image --model nano-banana-pro --prompt "..." \\
    --reference-image /tmp/style.png --size 2K --aspect-ratio 16:9

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux, sdxl, and nano-banana models
  OPENAI_API_KEY       Required for gpt-image-1 model
  GOOGLE_API_KEY       Required for nano-banana-pro model
  REMOVEBG_API_KEY     Required for --remove-bg flag

ERROR CODES:
  0  Success
  1  General error (invalid arguments, API error, file write error)

MORE INFO:
  Documentation: \${PAI_DIR}/skills/art/README.md
  Source: \${PAI_DIR}/skills/art/tools/generate-ulart-image.ts
`);
  process.exit(0);
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULTS.model,
    size: DEFAULTS.size,
    output: DEFAULTS.output,
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith('--')) {
      throw new CLIError(`Invalid flag: ${flag}. Flags must start with --`);
    }

    const key = flag.slice(2);

    // Handle boolean flags (no value)
    if (key === 'transparent') {
      parsed.transparent = true;
      continue;
    }
    if (key === 'remove-bg') {
      parsed.removeBg = true;
      continue;
    }
    if (key === 'open') {
      parsed.open = true;
      continue;
    }
    if (key === 'thumbnail') {
      parsed.thumbnail = true;
      continue;
    }

    // Handle flags with values
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case 'model':
        if (
          value !== 'flux' &&
          value !== 'flux-pro' &&
          value !== 'flux-dev' &&
          value !== 'flux-schnell' &&
          value !== 'nano-banana' &&
          value !== 'nano-banana-pro' &&
          value !== 'gpt-image-1' &&
          value !== 'sdxl'
        ) {
          throw new CLIError(
            `Invalid model: ${value}. Must be: flux, flux-pro, flux-dev, flux-schnell, sdxl, nano-banana, nano-banana-pro, or gpt-image-1`
          );
        }
        parsed.model = value as Model;
        i++; // Skip next arg (value)
        break;
      case 'prompt':
        parsed.prompt = value;
        i++; // Skip next arg (value)
        break;
      case 'prompt-file':
        parsed.promptFile = value;
        i++; // Skip next arg (value)
        break;
      case 'size':
        parsed.size = value as Size;
        i++; // Skip next arg (value)
        break;
      case 'aspect-ratio':
        parsed.aspectRatio = value as ReplicateSize;
        i++; // Skip next arg (value)
        break;
      case 'output':
        parsed.output = value;
        i++; // Skip next arg (value)
        break;
      case 'reference-image':
        parsed.referenceImage = value;
        i++; // Skip next arg (value)
        break;
      case 'creative-variations': {
        const variations = Number.parseInt(value, 10);
        if (Number.isNaN(variations) || variations < 1 || variations > 10) {
          throw new CLIError(`Invalid creative-variations: ${value}. Must be 1-10`);
        }
        parsed.creativeVariations = variations;
        i++; // Skip next arg (value)
        break;
      }
      // img2img parameters
      case 'image':
        if (!existsSync(value)) {
          throw new CLIError(`Input image not found: ${value}`);
        }
        parsed.image = value;
        i++; // Skip next arg (value)
        break;
      case 'strength': {
        const strength = Number.parseFloat(value);
        if (Number.isNaN(strength) || strength < 0 || strength > 1) {
          throw new CLIError(`Invalid strength: ${value}. Must be 0-1`);
        }
        parsed.strength = strength;
        i++; // Skip next arg (value)
        break;
      }
      case 'guidance': {
        const guidance = Number.parseFloat(value);
        if (Number.isNaN(guidance) || guidance < 0) {
          throw new CLIError(`Invalid guidance: ${value}. Must be a positive number`);
        }
        parsed.guidance = guidance;
        i++; // Skip next arg (value)
        break;
      }
      case 'steps': {
        const steps = Number.parseInt(value, 10);
        if (Number.isNaN(steps) || steps < 1) {
          throw new CLIError(`Invalid steps: ${value}. Must be a positive integer`);
        }
        parsed.steps = steps;
        i++; // Skip next arg (value)
        break;
      }
      case 'negative-prompt':
        parsed.negativePrompt = value;
        i++; // Skip next arg (value)
        break;
      case 'scheduler':
        if (!SDXL_SCHEDULERS.includes(value as SDXLScheduler)) {
          throw new CLIError(
            `Invalid scheduler: ${value}. Must be one of: ${SDXL_SCHEDULERS.join(', ')}`
          );
        }
        parsed.scheduler = value as SDXLScheduler;
        i++; // Skip next arg (value)
        break;
      // Photorealistic workflow options
      case 'preset':
        if (!['photorealistic', 'strict', 'cinematic', 'artistic', 'raw'].includes(value)) {
          throw new CLIError(
            `Invalid preset: ${value}. Must be: photorealistic, strict, cinematic, artistic, or raw`
          );
        }
        parsed.preset = value as Preset;
        i++; // Skip next arg (value)
        break;
      case 'strict':
        // Shortcut for --preset strict (higher guidance for exclusion adherence)
        parsed.preset = 'strict';
        break;
      case 'seed': {
        const seed = Number.parseInt(value, 10);
        if (Number.isNaN(seed) || seed < 0) {
          throw new CLIError(`Invalid seed: ${value}. Must be a non-negative integer`);
        }
        parsed.seed = seed;
        i++; // Skip next arg (value)
        break;
      }
      case 'batch': {
        // Alias for creative-variations (batch is the same functionality)
        const batch = Number.parseInt(value, 10);
        if (Number.isNaN(batch) || batch < 1 || batch > 10) {
          throw new CLIError(`Invalid batch: ${value}. Must be 1-10`);
        }
        parsed.creativeVariations = batch;
        i++; // Skip next arg (value)
        break;
      }
      case 'phase':
        if (!['composition', 'refine', 'detail', 'upscale'].includes(value)) {
          throw new CLIError(
            `Invalid phase: ${value}. Must be: composition, refine, detail, or upscale`
          );
        }
        parsed.phase = value as WorkflowPhase;
        i++; // Skip next arg (value)
        break;
      case 'skill':
        if (!['photorealistic', 'art'].includes(value)) {
          throw new CLIError(`Invalid skill: ${value}. Must be: photorealistic or art`);
        }
        parsed.skill = value as Skill;
        i++; // Skip next arg (value)
        break;
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  // Validate required arguments
  if (!parsed.model) {
    throw new CLIError('Missing required argument: --model');
  }

  // Handle --prompt-file: validate file exists (will be read async in main)
  if (parsed.promptFile) {
    if (!existsSync(parsed.promptFile)) {
      throw new CLIError(`Prompt file not found: ${parsed.promptFile}`);
    }
  }

  if (!parsed.prompt && !parsed.promptFile) {
    throw new CLIError('Missing required argument: --prompt or --prompt-file');
  }

  // Validate reference-image is only used with nano-banana-pro
  if (parsed.referenceImage && parsed.model !== 'nano-banana-pro') {
    throw new CLIError('--reference-image is only supported with --model nano-banana-pro');
  }

  // Validate size based on model
  if (parsed.model === 'gpt-image-1') {
    if (!OPENAI_SIZES.includes(parsed.size as OpenAISize)) {
      throw new CLIError(
        `Invalid size for gpt-image-1: ${parsed.size}. Must be: ${OPENAI_SIZES.join(', ')}`
      );
    }
  } else if (parsed.model === 'nano-banana-pro') {
    if (!GEMINI_SIZES.includes(parsed.size as GeminiSize)) {
      throw new CLIError(
        `Invalid size for nano-banana-pro: ${parsed.size}. Must be: ${GEMINI_SIZES.join(', ')}`
      );
    }
    // Validate aspect ratio if provided
    if (parsed.aspectRatio && !GEMINI_ASPECT_RATIOS.includes(parsed.aspectRatio)) {
      throw new CLIError(
        `Invalid aspect-ratio for nano-banana-pro: ${parsed.aspectRatio}. Must be: ${GEMINI_ASPECT_RATIOS.join(', ')}`
      );
    }
    // Default to 16:9 if not specified
    if (!parsed.aspectRatio) {
      parsed.aspectRatio = '16:9';
    }
  } else if (parsed.model === 'sdxl') {
    // SDXL uses same sizes as OpenAI
    if (!SDXL_SIZES.includes(parsed.size as SDXLSize)) {
      throw new CLIError(
        `Invalid size for sdxl: ${parsed.size}. Must be: ${SDXL_SIZES.join(', ')}`
      );
    }
  } else {
    // flux variants, nano-banana use Replicate aspect ratios
    if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
      throw new CLIError(
        `Invalid size for ${parsed.model}: ${parsed.size}. Must be: ${REPLICATE_SIZES.join(', ')}`
      );
    }
  }

  // Validate img2img parameters
  const fluxModels: Model[] = ['flux', 'flux-pro', 'flux-dev', 'flux-schnell'];
  if (parsed.image) {
    // img2img is only supported with sdxl and flux variants
    if (parsed.model !== 'sdxl' && !fluxModels.includes(parsed.model)) {
      throw new CLIError('--image (img2img) is only supported with --model sdxl or flux variants');
    }
  }

  // Apply preset defaults (CLI flags still override)
  if (parsed.preset && parsed.preset !== 'raw') {
    const presetConfig = PRESETS[parsed.preset];
    // Apply preset model if not explicitly set
    if (parsed.model === DEFAULTS.model && presetConfig.model) {
      parsed.model = presetConfig.model;
    }
    // Apply defaults for parameters not explicitly set
    if (parsed.guidance === undefined && presetConfig.guidance !== undefined) {
      parsed.guidance = presetConfig.guidance;
    }
    if (parsed.steps === undefined && presetConfig.steps !== undefined) {
      parsed.steps = presetConfig.steps;
    }
    if (parsed.strength === undefined && presetConfig.strength !== undefined) {
      parsed.strength = presetConfig.strength;
    }
    const emoji =
      parsed.preset === 'photorealistic' ? '📸' : parsed.preset === 'cinematic' ? '🎬' : '🎨';
    console.log(
      `${emoji} ${parsed.preset} preset applied: model=${parsed.model}, guidance=${parsed.guidance}, steps=${parsed.steps}`
    );
  }

  // Apply phase-specific defaults
  if (parsed.phase) {
    const phaseDefaults = PHASE_DEFAULTS[parsed.phase];
    if (phaseDefaults.steps !== undefined && parsed.steps === undefined) {
      parsed.steps = phaseDefaults.steps;
    }
    if (phaseDefaults.strength !== undefined && parsed.strength === undefined) {
      parsed.strength = phaseDefaults.strength;
    }
    if (phaseDefaults.guidance !== undefined && parsed.guidance === undefined) {
      parsed.guidance = phaseDefaults.guidance;
    }
    console.log(`🔄 Phase "${parsed.phase}" defaults applied`);
  }

  // Warn about SDXL-only parameters when used with other models
  if (parsed.negativePrompt && parsed.model !== 'sdxl') {
    console.warn('⚠️  Warning: --negative-prompt is only supported by SDXL. It will be ignored.');
  }
  if (parsed.scheduler && parsed.model !== 'sdxl') {
    console.warn('⚠️  Warning: --scheduler is only supported by SDXL. It will be ignored.');
  }

  // Validate guidance range based on model
  if (parsed.guidance !== undefined) {
    if (parsed.model === 'flux' && (parsed.guidance < 0 || parsed.guidance > 10)) {
      throw new CLIError('Invalid guidance for flux: must be 0-10');
    }
    if (parsed.model === 'sdxl' && (parsed.guidance < 1 || parsed.guidance > 50)) {
      throw new CLIError('Invalid guidance for sdxl: must be 1-50');
    }
  }

  // Validate steps range based on model
  if (parsed.steps !== undefined) {
    if (parsed.model === 'flux' && (parsed.steps < 1 || parsed.steps > 50)) {
      throw new CLIError('Invalid steps for flux: must be 1-50');
    }
    if (parsed.model === 'sdxl' && (parsed.steps < 1 || parsed.steps > 500)) {
      throw new CLIError('Invalid steps for sdxl: must be 1-500');
    }
  }

  return parsed as CLIArgs;
}

// ============================================================================
// YAML Frontmatter Parser
// ============================================================================

interface FrontmatterData {
  model?: Model;
  image?: string;
  strength?: number;
  guidance?: number;
  steps?: number;
  negative_prompt?: string;
  scheduler?: SDXLScheduler;
  size?: Size;
  aspect_ratio?: ReplicateSize;
}

interface ParsedPromptFile {
  frontmatter: FrontmatterData;
  prompt: string;
}

/**
 * Simple YAML frontmatter parser for prompt files
 * Supports basic key: value pairs and multiline strings with |
 */
function parseYamlFrontmatter(content: string): FrontmatterData {
  const data: FrontmatterData = {};
  const lines = content.split('\n');
  let currentKey: string | null = null;
  let multilineValue: string[] = [];
  let isMultiline = false;

  for (const line of lines) {
    // Handle multiline continuation
    if (isMultiline) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        multilineValue.push(line.trim());
        continue;
      }
      // End of multiline, save it
      if (currentKey) {
        (data as Record<string, unknown>)[currentKey] = multilineValue.join('\n');
      }
      isMultiline = false;
      currentKey = null;
      multilineValue = [];
    }

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Parse key: value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Check for multiline indicator
    if (value === '|') {
      isMultiline = true;
      currentKey = key;
      multilineValue = [];
      continue;
    }

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Convert to appropriate type based on key
    switch (key) {
      case 'model':
        if (['flux', 'sdxl', 'nano-banana', 'nano-banana-pro', 'gpt-image-1'].includes(value)) {
          data.model = value as Model;
        }
        break;
      case 'image':
        data.image = value;
        break;
      case 'strength':
        data.strength = Number.parseFloat(value);
        break;
      case 'guidance':
        data.guidance = Number.parseFloat(value);
        break;
      case 'steps':
        data.steps = Number.parseInt(value, 10);
        break;
      case 'negative_prompt':
        data.negative_prompt = value;
        break;
      case 'scheduler':
        if (SDXL_SCHEDULERS.includes(value as SDXLScheduler)) {
          data.scheduler = value as SDXLScheduler;
        }
        break;
      case 'size':
        data.size = value as Size;
        break;
      case 'aspect_ratio':
        data.aspect_ratio = value as ReplicateSize;
        break;
    }
  }

  // Handle trailing multiline
  if (isMultiline && currentKey) {
    (data as Record<string, unknown>)[currentKey] = multilineValue.join('\n');
  }

  return data;
}

/**
 * Parse a prompt file with optional YAML frontmatter
 * Returns extracted frontmatter data and the remaining prompt text
 */
function parsePromptFile(fileContent: string): ParsedPromptFile {
  const trimmedContent = fileContent.trim();

  // Check if file starts with frontmatter delimiter
  if (!trimmedContent.startsWith('---')) {
    return { frontmatter: {}, prompt: trimmedContent };
  }

  // Find closing delimiter
  const closingIndex = trimmedContent.indexOf('---', 3);
  if (closingIndex === -1) {
    // No closing delimiter, treat entire file as prompt
    return { frontmatter: {}, prompt: trimmedContent };
  }

  // Extract frontmatter and prompt
  const frontmatterContent = trimmedContent.slice(3, closingIndex).trim();
  const promptContent = trimmedContent.slice(closingIndex + 3).trim();

  const frontmatter = parseYamlFrontmatter(frontmatterContent);

  return { frontmatter, prompt: promptContent };
}

// ============================================================================
// Prompt Enhancement
// ============================================================================

function enhancePromptForTransparency(prompt: string): string {
  const transparencyPrefix =
    'CRITICAL: Transparent background (PNG with alpha channel) - NO background color, pure transparency. Object floating in transparent space. ';
  return transparencyPrefix + prompt;
}

// ============================================================================
// Background Removal
// ============================================================================

async function removeBackground(imagePath: string): Promise<void> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    throw new CLIError('Missing environment variable: REMOVEBG_API_KEY');
  }

  console.log('🔲 Removing background with remove.bg API...');

  const imageBuffer = await readFile(imagePath);
  const formData = new FormData();
  formData.append('image_file', new Blob([imageBuffer]), 'image.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`remove.bg API error: ${response.status} - ${errorText}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(imagePath, resultBuffer);
  console.log('✅ Background removed successfully');
}

// ============================================================================
// Image Generation
// ============================================================================

interface FluxImg2ImgOptions {
  image?: string;
  strength?: number;
  guidance?: number;
  steps?: number;
  seed?: number;
}

// Result with seed for reproducibility logging
interface FluxGenerationResult {
  outputPath: string;
  seed?: number;
}

// ============================================================================
// Session Logging (Photorealistic & Art Skills)
// ============================================================================

interface GenerationLogEntry {
  timestamp: string;
  session_date: string;
  skill?: Skill;
  phase?: WorkflowPhase;
  prompt: string;
  model: Model;
  seed?: number;
  parameters: {
    guidance?: number;
    steps?: number;
    strength?: number;
    width?: number;
    height?: number;
  };
  input_image?: string;
  mask?: string;
  output_image: string;
  preset?: string;
  size?: Size;
}

const PHOTOREALISTIC_LOG_DIR = join(PAI_DIR, 'history/photorealistic');
const ART_LOG_DIR = join(PAI_DIR, 'history/art');

/**
 * Log a generation to the daily JSONL file.
 * Called automatically after each successful image generation.
 * Logs to photorealistic or art directory based on skill parameter.
 */
function logGeneration(entry: GenerationLogEntry, skill: Skill = 'photorealistic'): void {
  try {
    // Select log directory based on skill
    const logDir = skill === 'art' ? ART_LOG_DIR : PHOTOREALISTIC_LOG_DIR;

    // Ensure log directory exists
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    // Create daily log file path
    const logFile = join(logDir, `${entry.session_date}.jsonl`);

    // Append entry as JSONL (one JSON object per line)
    appendFileSync(logFile, `${JSON.stringify(entry)}\n`);

    console.log(`📝 Logged to ${logFile}`);
  } catch (error) {
    // Don't fail generation if logging fails - just warn
    console.warn('⚠️ Failed to log generation:', error);
  }
}

/**
 * Open generated images with the system's default image viewer.
 * On macOS, uses `open` command which opens images in Preview.
 */
function openImages(paths: string[]): void {
  if (paths.length === 0) return;

  try {
    // On macOS, `open` can accept multiple files
    const proc = spawn('open', paths, {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref(); // Don't wait for the process
    console.log(`📂 Opening ${paths.length} image(s) in Preview...`);
  } catch (error) {
    console.warn('⚠️ Failed to open images:', error);
  }
}

/**
 * Generate a 200px thumbnail using macOS sips command.
 * Saves to thumbs/ subdirectory alongside original image.
 */
async function generateThumbnail(imagePath: string): Promise<string | undefined> {
  try {
    const dir = imagePath.substring(0, imagePath.lastIndexOf('/'));
    const filename = imagePath.substring(imagePath.lastIndexOf('/') + 1);
    const thumbDir = join(dir, 'thumbs');
    const thumbPath = join(thumbDir, filename);

    // Create thumbs directory if needed
    if (!existsSync(thumbDir)) {
      mkdirSync(thumbDir, { recursive: true });
    }

    // Copy original to thumb location first
    const originalBuffer = await readFile(imagePath);
    await writeFile(thumbPath, originalBuffer);

    // Use sips to resize to 200px on longest edge
    return new Promise((resolve) => {
      const proc = spawn('sips', ['--resampleHeightWidthMax', '200', thumbPath], {
        stdio: 'pipe',
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`🖼️  Thumbnail: ${thumbPath}`);
          resolve(thumbPath);
        } else {
          console.warn('⚠️ Failed to generate thumbnail');
          resolve(undefined);
        }
      });

      proc.on('error', () => {
        console.warn('⚠️ sips command not available');
        resolve(undefined);
      });
    });
  } catch (error) {
    console.warn('⚠️ Failed to generate thumbnail:', error);
    return undefined;
  }
}

// Map model names to Replicate model IDs
const FLUX_MODEL_MAP: Record<string, string> = {
  flux: 'black-forest-labs/flux-1.1-pro',
  'flux-pro': 'black-forest-labs/flux-1.1-pro',
  'flux-dev': 'black-forest-labs/flux-dev',
  'flux-schnell': 'black-forest-labs/flux-schnell',
};

async function generateWithFlux(
  prompt: string,
  size: ReplicateSize,
  output: string,
  model: Model = 'flux-pro',
  img2imgOptions?: FluxImg2ImgOptions
): Promise<FluxGenerationResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  const replicate = new Replicate({ auth: token });

  // Generate or use provided seed
  const seed = img2imgOptions?.seed ?? Math.floor(Math.random() * 2147483647);

  // Determine which model to use
  let replicateModel = FLUX_MODEL_MAP[model] || FLUX_MODEL_MAP['flux-pro'];

  // For img2img, flux-dev is required (1.1-pro doesn't support it)
  if (img2imgOptions?.image && (model === 'flux' || model === 'flux-pro')) {
    replicateModel = FLUX_MODEL_MAP['flux-dev'];
  }

  const modelName = replicateModel.split('/')[1];

  // If img2img options provided
  if (img2imgOptions?.image) {
    console.log(`🎨 Generating with ${modelName} (img2img mode)...`);

    // Read image and convert to data URI
    const imageBuffer = await readFile(img2imgOptions.image);
    const ext = img2imgOptions.image.toLowerCase().split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageDataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    const input: Record<string, unknown> = {
      prompt,
      image: imageDataUri,
      aspect_ratio: size,
      output_format: 'png',
      output_quality: 95,
      seed,
    };

    // Add optional parameters if provided
    if (img2imgOptions.strength !== undefined) {
      input.prompt_strength = img2imgOptions.strength;
    }
    if (img2imgOptions.guidance !== undefined) {
      input.guidance = img2imgOptions.guidance;
    }
    if (img2imgOptions.steps !== undefined) {
      input.num_inference_steps = img2imgOptions.steps;
    }

    const result = await replicate.run(replicateModel as `${string}/${string}`, { input });

    // flux-dev returns an array of FileOutput objects
    const resultArray = result as Array<{ url?: () => string }>;
    if (resultArray && resultArray.length > 0) {
      const firstResult = resultArray[0];
      // Handle FileOutput object from Replicate
      if (typeof firstResult === 'object' && firstResult !== null) {
        // FileOutput has a url() method or can be iterated
        const url = firstResult.url ? firstResult.url() : String(firstResult);
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(output, buffer);
      }
    }
    console.log(`✅ Image saved to ${output}`);
    console.log(`🌱 Seed: ${seed} (use --seed ${seed} to reproduce)`);
    return { outputPath: output, seed };
  }

  // Standard text-to-image
  console.log(`🎨 Generating with ${modelName}...`);

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: size,
    output_format: 'png',
    output_quality: 95,
    prompt_upsampling: false,
    seed,
  };

  // Add guidance and steps if provided (for photorealistic preset)
  if (img2imgOptions?.guidance !== undefined) {
    input.guidance = img2imgOptions.guidance;
  }
  if (img2imgOptions?.steps !== undefined) {
    input.num_inference_steps = img2imgOptions.steps;
  }

  const result = await replicate.run(replicateModel as `${string}/${string}`, { input });

  // Handle different return types
  if (Buffer.isBuffer(result)) {
    await writeFile(output, result);
  } else if (Array.isArray(result) && result.length > 0) {
    const firstResult = result[0];
    if (typeof firstResult === 'object' && firstResult !== null) {
      const url = (firstResult as { url?: () => string }).url
        ? (firstResult as { url: () => string }).url()
        : String(firstResult);
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(output, buffer);
    }
  } else {
    await writeFile(output, result as Buffer);
  }

  console.log(`✅ Image saved to ${output}`);
  console.log(`🌱 Seed: ${seed} (use --seed ${seed} to reproduce)`);
  return { outputPath: output, seed };
}

async function generateWithNanoBanana(
  prompt: string,
  size: ReplicateSize,
  output: string
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  const replicate = new Replicate({ auth: token });

  console.log('🍌 Generating with Nano Banana...');

  const result = await replicate.run('google/nano-banana', {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: 'png',
    },
  });

  await writeFile(output, result);
  console.log(`✅ Image saved to ${output}`);
}

async function generateWithGPTImage(
  prompt: string,
  size: OpenAISize,
  output: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new CLIError('Missing environment variable: OPENAI_API_KEY');
  }

  const openai = new OpenAI({ apiKey });

  console.log('🤖 Generating with GPT-image-1...');

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size,
    n: 1,
  });

  const imageData = response.data[0].b64_json;
  if (!imageData) {
    throw new CLIError('No image data returned from OpenAI API');
  }

  const imageBuffer = Buffer.from(imageData, 'base64');
  await writeFile(output, imageBuffer);
  console.log(`✅ Image saved to ${output}`);
}

interface SDXLOptions {
  image?: string;
  strength?: number;
  guidance?: number;
  steps?: number;
  negativePrompt?: string;
  scheduler?: SDXLScheduler;
}

async function generateWithSDXL(
  prompt: string,
  size: SDXLSize,
  output: string,
  options?: SDXLOptions
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  const replicate = new Replicate({ auth: token });

  // Parse size into width and height
  const [width, height] = size.split('x').map(Number);

  const isImg2Img = !!options?.image;

  if (isImg2Img) {
    console.log('🎨 Generating with SDXL (img2img mode)...');
  } else {
    console.log('🎨 Generating with SDXL...');
  }

  const input: Record<string, unknown> = {
    prompt,
    width,
    height,
    num_outputs: 1,
    output_format: 'png',
  };

  // Add optional parameters
  if (options?.negativePrompt) {
    input.negative_prompt = options.negativePrompt;
  }
  if (options?.guidance !== undefined) {
    input.guidance_scale = options.guidance;
  }
  if (options?.steps !== undefined) {
    input.num_inference_steps = options.steps;
  }
  if (options?.scheduler) {
    input.scheduler = options.scheduler;
  }

  // Handle img2img mode
  if (options?.image) {
    // Read image and convert to data URI
    const imageBuffer = await readFile(options.image);
    const ext = options.image.toLowerCase().split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const imageDataUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    input.image = imageDataUri;
    if (options.strength !== undefined) {
      input.prompt_strength = options.strength;
    }
  }

  const result = await replicate.run(
    'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
    { input }
  );

  // SDXL returns an array of URLs
  const resultArray = result as string[];
  if (resultArray && resultArray.length > 0) {
    const imageUrl = resultArray[0];
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(output, buffer);
  }

  console.log(`✅ Image saved to ${output}`);
}

async function generateWithNanoBananaPro(
  prompt: string,
  size: GeminiSize,
  aspectRatio: ReplicateSize,
  output: string,
  referenceImage?: string
): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new CLIError('Missing environment variable: GOOGLE_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });

  if (referenceImage) {
    console.log(
      `🍌✨ Generating with Nano Banana Pro (Gemini 3 Pro) at ${size} ${aspectRatio} with reference image...`
    );
  } else {
    console.log(`🍌✨ Generating with Nano Banana Pro (Gemini 3 Pro) at ${size} ${aspectRatio}...`);
  }

  // Prepare content parts
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Add reference image if provided
  if (referenceImage) {
    // Read image file
    const imageBuffer = await readFile(referenceImage);
    const imageBase64 = imageBuffer.toString('base64');

    // Determine MIME type from extension
    const ext = extname(referenceImage).toLowerCase();
    let mimeType: string;
    switch (ext) {
      case '.png':
        mimeType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      default:
        throw new CLIError(`Unsupported image format: ${ext}. Supported: .png, .jpg, .jpeg, .webp`);
    }

    parts.push({
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    });
  }

  // Add text prompt
  parts.push({ text: prompt });

  // Retry loop with exponential backoff
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Prefix prompt with explicit image generation intent to prevent
      // the model from interpreting narrative prompts as text generation tasks
      const imagePromptPrefix = 'Generate an image depicting the following scene:\n\n';
      const prefixedParts = parts.map((part) => {
        if (part.text && !part.text.startsWith('Generate an image')) {
          return { ...part, text: imagePromptPrefix + part.text };
        }
        return part;
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ parts: prefixedParts }],
        config: {
          // Use both TEXT and IMAGE to allow model to communicate issues,
          // but prefix prompt with explicit image generation intent
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: size,
          },
        },
      });

      // Extract image data from response
      let imageData: string | undefined;
      let textResponse: string | undefined;

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        const responseParts = candidate.content?.parts || [];

        for (const part of responseParts) {
          if (part.inlineData?.data) {
            imageData = part.inlineData.data;
          }
          if (part.text) {
            textResponse = part.text;
          }
        }

        // Check for content filtering or other issues
        if (!imageData) {
          const finishReason = candidate.finishReason;
          const safetyRatings = candidate.safetyRatings;

          console.error('⚠️  No image data in response. Diagnostics:');
          console.error(`   Finish reason: ${finishReason || 'unknown'}`);
          if (safetyRatings) {
            console.error(`   Safety ratings: ${JSON.stringify(safetyRatings)}`);
          }
          if (textResponse) {
            console.error(`   Text response: ${textResponse}`);
          }

          // If content was filtered, don't retry - it won't help
          if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
            throw new CLIError(
              `Content filtered by Gemini API (reason: ${finishReason}). Try adjusting your prompt to be less sensitive.`
            );
          }

          throw new CLIError(
            `No image data returned from Gemini API. Finish reason: ${finishReason || 'unknown'}. ${textResponse ? `Response: "${textResponse.slice(0, 100)}..."` : ''}`
          );
        }
      } else {
        throw new CLIError('No candidates in Gemini API response');
      }

      // Success! Save the image
      const outputBuffer = Buffer.from(imageData, 'base64');
      await writeFile(output, outputBuffer);
      console.log(`✅ Image saved to ${output}`);
      return;
    } catch (error) {
      lastError = error as Error;

      // Handle API-specific errors
      if (error instanceof ApiError) {
        const status = error.status;
        const message = error.message;

        console.error(
          `\n⚠️  Gemini API error (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}):`
        );
        console.error(`   Status: ${status}`);
        console.error(`   Message: ${message}`);

        // Check if retryable
        if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
          // Check for API-provided retry delay
          const apiRetryDelay = extractRetryDelay(error);
          const delay = apiRetryDelay ?? calculateBackoffDelay(attempt);

          console.log(`   ⏳ Retrying in ${(delay / 1000).toFixed(1)}s...`);
          await sleep(delay);
          continue;
        }

        // Non-retryable API error
        if (status === 429) {
          throw new CLIError(
            'Rate limit exceeded (429). Gemini free tier allows 5 requests/minute, 25/day. ' +
              'Wait a minute and try again, or upgrade to a paid tier.'
          );
        }
        if (status === 401) {
          throw new CLIError('Authentication failed (401). Check your GOOGLE_API_KEY.');
        }
        if (status === 400) {
          throw new CLIError(`Invalid request (400): ${message}`);
        }
        throw new CLIError(`Gemini API error (${status}): ${message}`);
      }

      // For CLIError, don't retry - these are our own validation errors
      if (error instanceof CLIError) {
        throw error;
      }

      // Unknown error - retry if we haven't exhausted attempts
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.error(
          `\n⚠️  Unexpected error (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}): ${(error as Error).message}`
        );
        console.log(`   ⏳ Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw new CLIError(
    `Failed after ${RETRY_CONFIG.maxRetries + 1} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`
  );
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load API keys from ${PAI_DIR}/.env
    await loadEnv();

    const args = parseArgs(process.argv);

    // Read prompt from file if --prompt-file was provided
    if (args.promptFile) {
      console.log(`📄 Reading prompt from ${args.promptFile}...`);
      const fileContent = await readFile(args.promptFile, 'utf-8');
      const { frontmatter, prompt: parsedPrompt } = parsePromptFile(fileContent);

      // Set prompt from file
      args.prompt = parsedPrompt;

      // Log if frontmatter was found
      if (Object.keys(frontmatter).length > 0) {
        console.log('📋 Found YAML frontmatter configuration');
      }

      // Merge frontmatter values with CLI args (CLI takes precedence)
      // Model from frontmatter (if not specified on CLI, use frontmatter)
      if (frontmatter.model && args.model === DEFAULTS.model) {
        args.model = frontmatter.model;
        console.log(`   model: ${args.model}`);
      }

      // Size from frontmatter
      if (frontmatter.size && args.size === DEFAULTS.size) {
        args.size = frontmatter.size;
        console.log(`   size: ${args.size}`);
      }

      // Aspect ratio from frontmatter
      if (frontmatter.aspect_ratio && !args.aspectRatio) {
        args.aspectRatio = frontmatter.aspect_ratio;
        console.log(`   aspect_ratio: ${args.aspectRatio}`);
      }

      // img2img parameters from frontmatter (CLI wins if specified)
      if (frontmatter.image && !args.image) {
        // Validate the frontmatter image path
        if (!existsSync(frontmatter.image)) {
          throw new CLIError(`Input image from frontmatter not found: ${frontmatter.image}`);
        }
        args.image = frontmatter.image;
        console.log(`   image: ${args.image}`);
      }

      if (frontmatter.strength !== undefined && args.strength === undefined) {
        args.strength = frontmatter.strength;
        console.log(`   strength: ${args.strength}`);
      }

      if (frontmatter.guidance !== undefined && args.guidance === undefined) {
        args.guidance = frontmatter.guidance;
        console.log(`   guidance: ${args.guidance}`);
      }

      if (frontmatter.steps !== undefined && args.steps === undefined) {
        args.steps = frontmatter.steps;
        console.log(`   steps: ${args.steps}`);
      }

      if (frontmatter.negative_prompt && !args.negativePrompt) {
        args.negativePrompt = frontmatter.negative_prompt;
        console.log(`   negative_prompt: ${args.negativePrompt.slice(0, 50)}...`);
      }

      if (frontmatter.scheduler && !args.scheduler) {
        args.scheduler = frontmatter.scheduler;
        console.log(`   scheduler: ${args.scheduler}`);
      }

      // Validate merged args for consistency
      if (args.image && args.model !== 'sdxl' && args.model !== 'flux') {
        throw new CLIError('img2img (--image) is only supported with model sdxl or flux');
      }

      // Warn about SDXL-only features with wrong model
      if (args.negativePrompt && args.model !== 'sdxl') {
        console.warn('⚠️  Warning: negative_prompt is only supported by SDXL. It will be ignored.');
      }
      if (args.scheduler && args.model !== 'sdxl') {
        console.warn('⚠️  Warning: scheduler is only supported by SDXL. It will be ignored.');
      }
    }

    // Enhance prompt for transparency if requested
    const finalPrompt = args.transparent ? enhancePromptForTransparency(args.prompt) : args.prompt;

    if (args.transparent) {
      console.log('🔲 Transparent background mode enabled');
      console.log(
        '💡 Note: Not all models support transparency natively; may require post-processing\n'
      );
    }

    // Handle creative variations mode
    if (args.creativeVariations && args.creativeVariations > 1) {
      console.log(`🎨 Creative Mode: Generating ${args.creativeVariations} variations...`);
      console.log(
        '💡 Note: CLI mode uses same prompt for all variations (tests model variability)'
      );
      console.log(
        '   For true creative diversity, use the creative workflow in Marvin with be-creative skill\n'
      );

      const basePath = args.output.replace(/\.png$/, '');

      // Build img2img options for flux (includes seed and params even without image for photorealistic)
      const fluxImg2ImgOptions: FluxImg2ImgOptions | undefined =
        args.image ||
        args.seed !== undefined ||
        args.guidance !== undefined ||
        args.steps !== undefined
          ? {
              image: args.image,
              strength: args.strength,
              guidance: args.guidance,
              steps: args.steps,
              seed: args.seed,
            }
          : undefined;

      // Build SDXL options
      const sdxlOptions: SDXLOptions | undefined =
        args.image || args.negativePrompt || args.guidance || args.steps || args.scheduler
          ? {
              image: args.image,
              strength: args.strength,
              guidance: args.guidance,
              steps: args.steps,
              negativePrompt: args.negativePrompt,
              scheduler: args.scheduler,
            }
          : undefined;

      const fluxModels: Model[] = ['flux', 'flux-pro', 'flux-dev', 'flux-schnell'];

      // Determine skill for logging (default based on preset, or explicit --skill flag)
      const logSkill: Skill = args.skill ?? (args.preset === 'artistic' ? 'art' : 'photorealistic');

      // Helper to log each variation
      const logVariation = (varOutput: string, seed?: number) => {
        const now = new Date();
        const sessionDate = now.toISOString().split('T')[0];
        logGeneration(
          {
            timestamp: now.toISOString(),
            session_date: sessionDate,
            skill: logSkill,
            phase: args.phase,
            prompt: finalPrompt,
            model: args.model,
            seed: seed ?? args.seed,
            parameters: {
              guidance: args.guidance,
              steps: args.steps,
              strength: args.strength,
            },
            input_image: args.image,
            output_image: resolve(varOutput),
            preset: args.preset,
            size: args.size,
          },
          logSkill
        );
      };

      // Generate variations sequentially to avoid API rate limits
      const RATE_LIMIT_DELAY_MS = 12000; // 12 seconds between requests (Replicate allows 6/min with low credits)

      for (let i = 1; i <= args.creativeVariations; i++) {
        const varOutput = `${basePath}-v${i}.png`;
        console.log(`Variation ${i}/${args.creativeVariations}: ${varOutput}`);

        if (fluxModels.includes(args.model)) {
          const result = await generateWithFlux(
            finalPrompt,
            args.size as ReplicateSize,
            varOutput,
            args.model,
            fluxImg2ImgOptions
          );
          logVariation(varOutput, result.seed);
        } else if (args.model === 'nano-banana') {
          await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, varOutput);
          logVariation(varOutput);
        } else if (args.model === 'nano-banana-pro') {
          await generateWithNanoBananaPro(
            finalPrompt,
            args.size as GeminiSize,
            args.aspectRatio!,
            varOutput,
            args.referenceImage
          );
          logVariation(varOutput);
        } else if (args.model === 'gpt-image-1') {
          await generateWithGPTImage(finalPrompt, args.size as OpenAISize, varOutput);
          logVariation(varOutput);
        } else if (args.model === 'sdxl') {
          await generateWithSDXL(finalPrompt, args.size as SDXLSize, varOutput, sdxlOptions);
          logVariation(varOutput);
        }

        // Add delay between requests to respect rate limits (skip after last iteration)
        if (i < args.creativeVariations) {
          console.log(`⏳ Waiting ${RATE_LIMIT_DELAY_MS / 1000}s to respect API rate limits...`);
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      }

      console.log(`\n✅ Generated ${args.creativeVariations} variations`);

      // Open images if requested
      if (args.open) {
        const variationPaths = Array.from(
          { length: args.creativeVariations },
          (_, i) => `${basePath}-v${i + 1}.png`
        );
        openImages(variationPaths);
      }

      // Generate thumbnails if requested
      if (args.thumbnail) {
        const variationPaths = Array.from(
          { length: args.creativeVariations },
          (_, i) => `${basePath}-v${i + 1}.png`
        );
        await Promise.all(variationPaths.map(generateThumbnail));
      }
      return;
    }

    // Build img2img options for flux (single image mode, includes seed and params)
    const fluxImg2ImgOptions: FluxImg2ImgOptions | undefined =
      args.image ||
      args.seed !== undefined ||
      args.guidance !== undefined ||
      args.steps !== undefined
        ? {
            image: args.image,
            strength: args.strength,
            guidance: args.guidance,
            steps: args.steps,
            seed: args.seed,
          }
        : undefined;

    // Build SDXL options (single image mode)
    const sdxlOptions: SDXLOptions | undefined =
      args.image || args.negativePrompt || args.guidance || args.steps || args.scheduler
        ? {
            image: args.image,
            strength: args.strength,
            guidance: args.guidance,
            steps: args.steps,
            negativePrompt: args.negativePrompt,
            scheduler: args.scheduler,
          }
        : undefined;

    // Standard single image generation
    const fluxModels: Model[] = ['flux', 'flux-pro', 'flux-dev', 'flux-schnell'];
    let generationResult: FluxGenerationResult | undefined;

    if (fluxModels.includes(args.model)) {
      generationResult = await generateWithFlux(
        finalPrompt,
        args.size as ReplicateSize,
        args.output,
        args.model,
        fluxImg2ImgOptions
      );
    } else if (args.model === 'nano-banana') {
      await generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, args.output);
    } else if (args.model === 'nano-banana-pro') {
      await generateWithNanoBananaPro(
        finalPrompt,
        args.size as GeminiSize,
        args.aspectRatio!,
        args.output,
        args.referenceImage
      );
    } else if (args.model === 'gpt-image-1') {
      await generateWithGPTImage(finalPrompt, args.size as OpenAISize, args.output);
    } else if (args.model === 'sdxl') {
      await generateWithSDXL(finalPrompt, args.size as SDXLSize, args.output, sdxlOptions);
    }

    // Determine skill for logging (default based on preset, or explicit --skill flag)
    const logSkill: Skill = args.skill ?? (args.preset === 'artistic' ? 'art' : 'photorealistic');

    // Auto-log generation for workflow tracking
    const now = new Date();
    const sessionDate = now.toISOString().split('T')[0];
    logGeneration(
      {
        timestamp: now.toISOString(),
        session_date: sessionDate,
        skill: logSkill,
        phase: args.phase,
        prompt: finalPrompt,
        model: args.model,
        seed: generationResult?.seed ?? args.seed,
        parameters: {
          guidance: args.guidance,
          steps: args.steps,
          strength: args.strength,
        },
        input_image: args.image,
        output_image: resolve(args.output),
        preset: args.preset,
        size: args.size,
      },
      logSkill
    );

    // Remove background if requested
    if (args.removeBg) {
      await removeBackground(args.output);
    }

    // Open image if requested
    if (args.open) {
      openImages([args.output]);
    }

    // Generate thumbnail if requested
    if (args.thumbnail) {
      await generateThumbnail(args.output);
    }
  } catch (error) {
    handleError(error);
  }
}

main();
