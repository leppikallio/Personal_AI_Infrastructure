#!/usr/bin/env bun

/**
 * generate-ulart-video - UL Video Generation CLI (Image-to-Video)
 *
 * Generate videos from static images using AI models via Replicate API.
 * Supports multiple I2V models with runtime selection.
 *
 * Usage:
 *   generate-ulart-video --model kling --image /path/to/image.png --prompt "slow pan..." --output /tmp/video.mp4
 *
 * @see ${PAI_DIR}/skills/art/README.md
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import Replicate from 'replicate';

// ============================================================================
// Environment Loading
// ============================================================================

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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Silently continue if .env doesn't exist
  }
}

// ============================================================================
// Types & Model Configuration
// ============================================================================

/**
 * Model configuration defines how to call each Replicate model
 */
interface ModelConfig {
  id: string; // Replicate model ID
  name: string; // Human-readable name
  description: string;
  maxDuration: number; // Max seconds
  durations: number[]; // Supported durations
  aspectRatios: string[]; // Supported aspect ratios (for T2V, ignored for I2V)
  supportsNegativePrompt: boolean;
  supportsCfgScale: boolean;
  supportsTailImage: boolean; // For seamless loops
  inputMapping: (args: GenerationArgs) => Record<string, unknown>;
}

type ModelKey = 'kling' | 'kling-turbo' | 'wan25' | 'wan25-fast' | 'wan22-fast';

/**
 * Model registry - add new models here
 */
const MODELS: Record<ModelKey, ModelConfig> = {
  // Kling v2.5 Turbo Pro - Premium quality, 1.3M runs
  kling: {
    id: 'kwaivgi/kling-v2.5-turbo-pro',
    name: 'Kling v2.5 Turbo Pro',
    description: 'Premium I2V with cinematic depth and smooth motion',
    maxDuration: 10,
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsNegativePrompt: true,
    supportsCfgScale: true,
    supportsTailImage: true,
    inputMapping: (args) => ({
      prompt: args.prompt,
      start_image: args.imageUrl, // Kling uses start_image, not image_url
      duration: args.duration,
      ...(args.negativePrompt && { negative_prompt: args.negativePrompt }),
      ...(args.cfgScale && { cfg_scale: args.cfgScale }),
      ...(args.tailImageUrl && { end_image: args.tailImageUrl }), // end_image for seamless loops
    }),
  },

  // Kling v2.5 Turbo (non-pro, faster/cheaper)
  'kling-turbo': {
    id: 'kwaivgi/kling-v2.5-turbo',
    name: 'Kling v2.5 Turbo',
    description: 'Faster Kling variant, good balance of speed/quality',
    maxDuration: 10,
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsNegativePrompt: true,
    supportsCfgScale: true,
    supportsTailImage: true,
    inputMapping: (args) => ({
      prompt: args.prompt,
      start_image: args.imageUrl, // Kling uses start_image, not image_url
      duration: args.duration,
      ...(args.negativePrompt && { negative_prompt: args.negativePrompt }),
      ...(args.cfgScale && { cfg_scale: args.cfgScale }),
      ...(args.tailImageUrl && { end_image: args.tailImageUrl }), // end_image for seamless loops
    }),
  },

  // Wan 2.5 I2V - 93K runs, supports audio
  wan25: {
    id: 'wan-video/wan-2.5-i2v',
    name: 'Wan 2.5 I2V',
    description: 'Alibaba Wan 2.5 with background audio support, up to 1080p',
    maxDuration: 10,
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsNegativePrompt: false,
    supportsCfgScale: false,
    supportsTailImage: false,
    inputMapping: (args) => ({
      prompt: args.prompt,
      image: args.imageUrl,
      num_frames: args.duration === 5 ? 81 : 161, // ~16fps
      resolution: args.resolution || '720p',
    }),
  },

  // Wan 2.5 I2V Fast - Speed optimized
  'wan25-fast': {
    id: 'wan-video/wan-2.5-i2v-fast',
    name: 'Wan 2.5 I2V Fast',
    description: 'Speed-optimized Wan 2.5, good for iteration',
    maxDuration: 10,
    durations: [5, 10],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsNegativePrompt: false,
    supportsCfgScale: false,
    supportsTailImage: false,
    inputMapping: (args) => ({
      prompt: args.prompt,
      image: args.imageUrl,
      num_frames: args.duration === 5 ? 81 : 161,
      resolution: args.resolution || '720p',
    }),
  },

  // Wan 2.2 I2V Fast - 3.6M runs, most popular budget option
  'wan22-fast': {
    id: 'wan-video/wan-2.2-i2v-fast',
    name: 'Wan 2.2 I2V Fast',
    description: 'Budget-friendly, very fast, 3.6M runs',
    maxDuration: 5,
    durations: [5],
    aspectRatios: ['16:9', '9:16', '1:1'],
    supportsNegativePrompt: false,
    supportsCfgScale: false,
    supportsTailImage: false,
    inputMapping: (args) => ({
      prompt: args.prompt,
      image: args.imageUrl,
      num_frames: 81,
    }),
  },
};

const MODEL_KEYS = Object.keys(MODELS) as ModelKey[];
const DEFAULT_MODEL: ModelKey = 'kling';

interface GenerationArgs {
  prompt: string;
  imageUrl: string;
  duration: number;
  negativePrompt?: string;
  cfgScale?: number;
  tailImageUrl?: string;
  resolution?: string;
}

interface CLIArgs {
  model: ModelKey;
  image: string;
  prompt: string;
  promptFile?: string; // Read prompt from file (--prompt-file)
  duration: number;
  output: string;
  negativePrompt?: string;
  cfgScale?: number;
  tailImage?: string;
  resolution?: string;
}

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
// Help Text
// ============================================================================

function showHelp(): void {
  const modelList = MODEL_KEYS.map((key) => {
    const m = MODELS[key];
    return `    ${key.padEnd(12)} ${m.name} - ${m.description} (max ${m.maxDuration}s)`;
  }).join('\n');

  console.log(`
generate-ulart-video - UL Video Generation CLI (Image-to-Video)

Generate videos from static images using AI models via Replicate API.
Supports multiple I2V models with runtime selection.

USAGE:
  generate-ulart-video --model <model> --image <path> --prompt "<motion>" [OPTIONS]

REQUIRED:
  --model <model>      Model to use (default: ${DEFAULT_MODEL})
  --image <path>       Input image file path (PNG, JPEG, WebP)
  --prompt <text>      Motion/action description for the video
  --prompt-file <path> Read prompt from file (alternative to --prompt)
                       Supports .txt, .md - ideal for long narrative prompts

AVAILABLE MODELS:
${modelList}

OPTIONS:
  --duration <sec>     Video duration in seconds (default: 5)
                       Available durations depend on model (typically 5 or 10)
  --output <path>      Output file path (default: /tmp/ul-video.mp4)
  --negative-prompt    Things to avoid in the video (Kling only)
  --cfg-scale <n>      CFG scale 0-1 (Kling only, default: 0.5)
  --tail-image <path>  End frame image for seamless loops (Kling only)
  --resolution <res>   Resolution: 480p, 720p, 1080p (Wan models only)
  --help, -h           Show this help message

EXAMPLES:
  # Generate 5s video with Kling (default, premium quality)
  generate-ulart-video --model kling --image /tmp/hero.png \\
    --prompt "slow cinematic pan across the landscape, subtle fog movement" \\
    --duration 5 --output /tmp/hero-video.mp4

  # Generate 10s video with Wan 2.5 (budget-friendly)
  generate-ulart-video --model wan25 --image /tmp/hero.png \\
    --prompt "gentle camera movement, atmospheric lighting shifts" \\
    --duration 10 --resolution 1080p

  # Create seamless loop with Kling tail image
  generate-ulart-video --model kling --image /tmp/start.png \\
    --tail-image /tmp/start.png --prompt "smooth continuous motion" \\
    --duration 10

  # Quick iteration with fast model
  generate-ulart-video --model wan22-fast --image /tmp/test.png \\
    --prompt "subtle movement" --output /tmp/test.mp4

WORKFLOW (Image → Video):
  1. Generate static image with generate-ulart-image
  2. Use this tool to animate the image
  3. For loops: use same image as --tail-image (Kling)

ENVIRONMENT VARIABLES:
  REPLICATE_API_TOKEN  Required for all models

ERROR CODES:
  0  Success
  1  General error (invalid arguments, API error, file error)

MORE INFO:
  Documentation: ${PAI_DIR}/skills/art/README.md
  Source: ${PAI_DIR}/skills/art/tools/generate-ulart-video.ts
`);
  process.exit(0);
}

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
  }

  const parsed: Partial<CLIArgs> = {
    model: DEFAULT_MODEL,
    duration: 5,
    output: '/tmp/ul-video.mp4',
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];

    if (!flag.startsWith('--')) {
      throw new CLIError(`Invalid flag: ${flag}. Flags must start with --`);
    }

    const key = flag.slice(2);
    const value = args[i + 1];

    if (!value || value.startsWith('--')) {
      throw new CLIError(`Missing value for flag: ${flag}`);
    }

    switch (key) {
      case 'model':
        if (!MODEL_KEYS.includes(value as ModelKey)) {
          throw new CLIError(`Invalid model: ${value}. Must be one of: ${MODEL_KEYS.join(', ')}`);
        }
        parsed.model = value as ModelKey;
        i++;
        break;
      case 'image':
        parsed.image = value;
        i++;
        break;
      case 'prompt':
        parsed.prompt = value;
        i++;
        break;
      case 'prompt-file':
        parsed.promptFile = value;
        i++;
        break;
      case 'duration': {
        const dur = Number.parseInt(value, 10);
        if (Number.isNaN(dur) || dur < 1) {
          throw new CLIError(`Invalid duration: ${value}`);
        }
        parsed.duration = dur;
        i++;
        break;
      }
      case 'output':
        parsed.output = value;
        i++;
        break;
      case 'negative-prompt':
        parsed.negativePrompt = value;
        i++;
        break;
      case 'cfg-scale': {
        const cfg = Number.parseFloat(value);
        if (Number.isNaN(cfg) || cfg < 0 || cfg > 1) {
          throw new CLIError(`Invalid cfg-scale: ${value}. Must be 0-1`);
        }
        parsed.cfgScale = cfg;
        i++;
        break;
      }
      case 'tail-image':
        parsed.tailImage = value;
        i++;
        break;
      case 'resolution':
        if (!['480p', '720p', '1080p'].includes(value)) {
          throw new CLIError(`Invalid resolution: ${value}. Must be: 480p, 720p, 1080p`);
        }
        parsed.resolution = value;
        i++;
        break;
      default:
        throw new CLIError(`Unknown flag: ${flag}`);
    }
  }

  // Validate required arguments
  if (!parsed.image) {
    throw new CLIError('Missing required argument: --image');
  }

  // Handle --prompt-file: read file contents as prompt
  if (parsed.promptFile) {
    if (!existsSync(parsed.promptFile)) {
      throw new CLIError(`Prompt file not found: ${parsed.promptFile}`);
    }
    // Will be read async in main() - store path for now
  }

  if (!parsed.prompt && !parsed.promptFile) {
    throw new CLIError('Missing required argument: --prompt or --prompt-file');
  }

  // Validate image exists
  if (!existsSync(parsed.image)) {
    throw new CLIError(`Image file not found: ${parsed.image}`);
  }

  // Validate model supports the requested duration
  const modelConfig = MODELS[parsed.model!];
  if (!modelConfig.durations.includes(parsed.duration!)) {
    const available = modelConfig.durations.join(', ');
    throw new CLIError(
      `Model ${parsed.model} doesn't support ${parsed.duration}s duration. Available: ${available}s`
    );
  }

  // Warn about unsupported options
  if (parsed.negativePrompt && !modelConfig.supportsNegativePrompt) {
    console.warn(`⚠️  Warning: --negative-prompt is not supported by ${parsed.model}, ignoring`);
    parsed.negativePrompt = undefined;
  }

  if (parsed.cfgScale && !modelConfig.supportsCfgScale) {
    console.warn(`⚠️  Warning: --cfg-scale is not supported by ${parsed.model}, ignoring`);
    parsed.cfgScale = undefined;
  }

  if (parsed.tailImage && !modelConfig.supportsTailImage) {
    console.warn(`⚠️  Warning: --tail-image is not supported by ${parsed.model}, ignoring`);
    parsed.tailImage = undefined;
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Image Upload Helper
// ============================================================================

/**
 * Upload image to a temporary hosting service for Replicate
 * Replicate requires publicly accessible URLs for input images
 */
async function uploadImageForReplicate(imagePath: string): Promise<string> {
  const imageBuffer = await readFile(imagePath);
  const ext = extname(imagePath).toLowerCase();

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

  // Use Replicate's file upload API
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  console.log(`📤 Uploading ${basename(imagePath)} to Replicate...`);

  // Create a file upload using Replicate's files API with multipart/form-data
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('content', blob, basename(imagePath));

  const response = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type - fetch will set it with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new CLIError(`Failed to upload image: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as { urls: { get: string } };
  console.log('✅ Image uploaded successfully');

  return result.urls.get;
}

// ============================================================================
// Video Generation
// ============================================================================

async function generateVideo(args: CLIArgs): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new CLIError('Missing environment variable: REPLICATE_API_TOKEN');
  }

  const modelConfig = MODELS[args.model];
  const replicate = new Replicate({ auth: token });

  console.log(`\n🎬 Generating video with ${modelConfig.name}...`);
  console.log(`   Model: ${modelConfig.id}`);
  console.log(`   Duration: ${args.duration}s`);
  console.log(
    `   Prompt: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`
  );

  // Upload input image
  const imageUrl = await uploadImageForReplicate(args.image);

  // Upload tail image if provided
  let tailImageUrl: string | undefined;
  if (args.tailImage) {
    console.log('📤 Uploading tail image for seamless loop...');
    tailImageUrl = await uploadImageForReplicate(args.tailImage);
  }

  // Build generation args
  const genArgs: GenerationArgs = {
    prompt: args.prompt,
    imageUrl,
    duration: args.duration,
    negativePrompt: args.negativePrompt,
    cfgScale: args.cfgScale,
    tailImageUrl,
    resolution: args.resolution,
  };

  // Map to model-specific input format
  const input = modelConfig.inputMapping(genArgs);

  console.log('\n⏳ Running model (this may take 1-5 minutes)...');

  // Run the model
  const output = await replicate.run(modelConfig.id as `${string}/${string}`, { input });

  // Handle output - Replicate returns various formats depending on model
  let videoUrl = '';

  // Debug: log raw output structure
  console.log('\n📦 Debug output:');
  console.log(`   Type: ${typeof output}`);
  console.log(`   Constructor: ${output?.constructor?.name || 'unknown'}`);
  console.log(`   IsArray: ${Array.isArray(output)}`);
  if (output && typeof output === 'object') {
    console.log(`   Keys: ${Object.keys(output).join(', ') || '(none)'}`);
  }
  console.log(`   Raw: ${JSON.stringify(output, null, 2)?.slice(0, 500)}`);

  // Handle different output types
  let videoBuffer: Buffer;

  // Check if output is a FileOutput (ReadableStream) - handle by reading stream directly
  if (output && typeof output === 'object' && output.constructor?.name === 'FileOutput') {
    console.log('\n📥 Reading video stream (FileOutput)...');

    // FileOutput has a blob() method that returns Promise<Blob>
    const fileOutput = output as { blob: () => Promise<Blob> };
    if (typeof fileOutput.blob === 'function') {
      const blob = await fileOutput.blob();
      videoBuffer = Buffer.from(await blob.arrayBuffer());
      console.log(`   Read ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB from stream`);
    } else {
      // Try to read as ReadableStream
      const stream = output as ReadableStream<Uint8Array>;
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      videoBuffer = Buffer.alloc(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        videoBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      console.log(`   Read ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB from stream`);
    }
  } else {
    // Extract URL based on output type
    if (typeof output === 'string' && output.startsWith('http')) {
      // Direct URL string
      videoUrl = output;
    } else if (output && typeof output === 'object') {
      // Check for FileOutput-like object with url() method
      if (typeof (output as { url?: () => string }).url === 'function') {
        videoUrl = (output as { url: () => string }).url();
      }
      // Check for object with url property
      else if ('url' in output && typeof (output as { url: unknown }).url === 'string') {
        videoUrl = (output as { url: string }).url;
      }
      // Check for object with video property (some models)
      else if ('video' in output && typeof (output as { video: unknown }).video === 'string') {
        videoUrl = (output as { video: string }).video;
      }
      // Check for array of URLs
      else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === 'string' && first.startsWith('http')) {
          videoUrl = first;
        } else if (first && typeof first === 'object' && 'url' in first) {
          videoUrl = (first as { url: string }).url;
        }
      }
    }

    // Validate URL before trying to download
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      throw new CLIError(
        `Failed to extract video URL from model output.\nOutput type: ${typeof output}\nConstructor: ${output?.constructor?.name}\nRaw output: ${JSON.stringify(output, null, 2)?.slice(0, 1000)}`
      );
    }

    console.log(`\n📥 Downloading video from: ${videoUrl.slice(0, 80)}...`);

    // Download the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new CLIError(`Failed to download video: ${videoResponse.status}`);
    }

    videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  }
  await writeFile(args.output, videoBuffer);

  const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Video saved to ${args.output} (${sizeMB} MB)`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);

    // Read prompt from file if --prompt-file was provided
    if (args.promptFile) {
      console.log(`📄 Reading prompt from ${args.promptFile}...`);
      args.prompt = (await readFile(args.promptFile, 'utf-8')).trim();
    }

    await generateVideo(args);
  } catch (error) {
    handleError(error);
  }
}

main();
