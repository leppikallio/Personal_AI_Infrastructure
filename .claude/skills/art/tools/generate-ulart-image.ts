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

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { ApiError, GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Replicate from 'replicate';

// ============================================================================
// Environment Loading
// ============================================================================

/**
 * Load environment variables from ${PAI_DIR}/.env
 * This ensures API keys are available regardless of how the CLI is invoked
 */
async function loadEnv(): Promise<void> {
  const envPath = resolve(process.env.HOME!, '.claude/.env');
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

type Model = 'flux' | 'nano-banana' | 'nano-banana-pro' | 'gpt-image-1';
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
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: 'flux' as Model,
  size: '16:9' as Size,
  output: '/tmp/ul-image.png',
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

Generate Unsupervised Learning branded images using Flux 1.1 Pro, Nano Banana, or GPT-image-1.

USAGE:
  generate-ulart-image --model <model> --prompt "<prompt>" [OPTIONS]

REQUIRED:
  --model <model>      Model to use: flux, nano-banana, nano-banana-pro, gpt-image-1
  --prompt <text>      Image generation prompt (quote if contains spaces)
  --prompt-file <path> Read prompt from file (alternative to --prompt)
                       Supports .txt, .md - ideal for long narrative prompts

OPTIONS:
  --size <size>              Image size/aspect ratio (default: 16:9)
                             Replicate (flux, nano-banana): 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 21:9
                             OpenAI (gpt-image-1): 1024x1024, 1536x1024, 1024x1536
                             Gemini (nano-banana-pro): 1K, 2K, 4K (resolution); aspect ratio inferred from context or defaults to 16:9
  --aspect-ratio <ratio>     Aspect ratio for Gemini nano-banana-pro (default: 16:9)
                             Options: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
  --output <path>            Output file path (default: /tmp/ul-image.png)
  --reference-image <path>   Reference image for style/composition guidance (Nano Banana Pro only)
                             Accepts: PNG, JPEG, WebP images
                             Model will use this image as visual reference while following text prompt
  --transparent              Enable transparent background (adds transparency instructions to prompt)
                             Note: Not all models support transparency natively; may require post-processing
  --remove-bg                Remove background after generation using remove.bg API
                             Creates true transparency by removing the generated background
  --creative-variations <n>  Generate N variations (appends -v1, -v2, etc. to output filename)
                             Use with Marvin's be-creative skill for true prompt diversity
                             CLI mode: generates N images with same prompt (tests model variability)
  --help, -h                 Show this help message

EXAMPLES:
  # Generate blog header with Nano Banana Pro (16:9, 2K quality)
  generate-ulart-image --model nano-banana-pro --prompt "Abstract UL illustration..." --size 2K --aspect-ratio 16:9

  # Generate high-res 4K image with Nano Banana Pro
  generate-ulart-image --model nano-banana-pro --prompt "Editorial cover..." --size 4K --aspect-ratio 3:2

  # Generate blog header with original Nano Banana (16:9)
  generate-ulart-image --model nano-banana --prompt "Abstract UL illustration..." --size 16:9

  # Generate square image with Flux
  generate-ulart-image --model flux --prompt "Minimal geometric art..." --size 1:1 --output /tmp/header.png

  # Generate portrait with GPT-image-1
  generate-ulart-image --model gpt-image-1 --prompt "Editorial cover..." --size 1024x1536

  # Generate 3 creative variations (for testing model variability)
  generate-ulart-image --model gpt-image-1 --prompt "..." --creative-variations 3 --output /tmp/essay.png
  # Outputs: /tmp/essay-v1.png, /tmp/essay-v2.png, /tmp/essay-v3.png

  # Generate with reference image for style guidance (Nano Banana Pro only)
  generate-ulart-image --model nano-banana-pro --prompt "Tokyo Night themed illustration..." \\
    --reference-image /tmp/style-reference.png --size 2K --aspect-ratio 16:9

NOTE: For true creative diversity with different prompts, use the creative workflow in Marvin which
integrates the be-creative skill. CLI creative mode generates multiple images with the SAME prompt.

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for flux and nano-banana models
  OPENAI_API_KEY       Required for gpt-image-1 model
  GOOGLE_API_KEY       Required for nano-banana-pro model
  REMOVEBG_API_KEY     Required for --remove-bg flag

ERROR CODES:
  0  Success
  1  General error (invalid arguments, API error, file write error)

MORE INFO:
  Documentation: ${PAI_DIR}/skills/art/README.md
  Source: ${PAI_DIR}/skills/art/tools/generate-ulart-image.ts
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

    // Handle flags with values
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case 'model':
        if (
          value !== 'flux' &&
          value !== 'nano-banana' &&
          value !== 'nano-banana-pro' &&
          value !== 'gpt-image-1'
        ) {
          throw new CLIError(
            `Invalid model: ${value}. Must be: flux, nano-banana, nano-banana-pro, or gpt-image-1`
          );
        }
        parsed.model = value;
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
  } else {
    if (!REPLICATE_SIZES.includes(parsed.size as ReplicateSize)) {
      throw new CLIError(
        `Invalid size for ${parsed.model}: ${parsed.size}. Must be: ${REPLICATE_SIZES.join(', ')}`
      );
    }
  }

  return parsed as CLIArgs;
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

async function generateWithFlux(
  prompt: string,
  size: ReplicateSize,
  output: string
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  const replicate = new Replicate({ auth: token });

  console.log('🎨 Generating with Flux 1.1 Pro...');

  const result = await replicate.run('black-forest-labs/flux-1.1-pro', {
    input: {
      prompt,
      aspect_ratio: size,
      output_format: 'png',
      output_quality: 95,
      prompt_upsampling: false,
    },
  });

  await writeFile(output, result);
  console.log(`✅ Image saved to ${output}`);
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
      args.prompt = (await readFile(args.promptFile, 'utf-8')).trim();
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
      const promises: Promise<void>[] = [];

      for (let i = 1; i <= args.creativeVariations; i++) {
        const varOutput = `${basePath}-v${i}.png`;
        console.log(`Variation ${i}/${args.creativeVariations}: ${varOutput}`);

        if (args.model === 'flux') {
          promises.push(generateWithFlux(finalPrompt, args.size as ReplicateSize, varOutput));
        } else if (args.model === 'nano-banana') {
          promises.push(generateWithNanoBanana(finalPrompt, args.size as ReplicateSize, varOutput));
        } else if (args.model === 'nano-banana-pro') {
          promises.push(
            generateWithNanoBananaPro(
              finalPrompt,
              args.size as GeminiSize,
              args.aspectRatio!,
              varOutput,
              args.referenceImage
            )
          );
        } else if (args.model === 'gpt-image-1') {
          promises.push(generateWithGPTImage(finalPrompt, args.size as OpenAISize, varOutput));
        }
      }

      await Promise.all(promises);
      console.log(`\n✅ Generated ${args.creativeVariations} variations`);
      return;
    }

    // Standard single image generation
    if (args.model === 'flux') {
      await generateWithFlux(finalPrompt, args.size as ReplicateSize, args.output);
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
    }

    // Remove background if requested
    if (args.removeBg) {
      await removeBackground(args.output);
    }
  } catch (error) {
    handleError(error);
  }
}

main();
