#!/usr/bin/env bun
/**
 * AI Image Upscaler
 * Uses Gemini 3 Pro (Nano Banana Pro) to upscale images while maintaining composition.
 *
 * This is a thin wrapper around generate-ulart-image.ts --reference-image
 *
 * Usage:
 *   bun upscale-image.ts --input <path> --output <path> [--size 2K|4K]
 *
 * Examples:
 *   bun upscale-image.ts --input photo.png --output photo-4k.png --size 4K
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { GoogleGenAI } from '@google/genai';

// ============================================================================
// Types
// ============================================================================

interface CLIArgs {
  input: string;
  output: string;
  size: '2K' | '4K';
  aspectRatio: string;
}

class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';
  }
}

// ============================================================================
// Environment (copied from generate-ulart-image.ts)
// ============================================================================

async function loadEnv(): Promise<void> {
  const envPaths = [`${process.env.HOME}/.claude/.env`, `${process.env.HOME}/.env`, '.env'];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = await readFile(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
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
        }
      }
    }
  }
}

// ============================================================================
// CLI Parsing
// ============================================================================

function printUsage(): void {
  console.log(`
AI Image Upscaler - Uses Gemini 3 Pro for AI upscaling

Usage:
  bun upscale-image.ts --input <path> --output <path> [options]

Required:
  --input <path>       Input image to upscale
  --output <path>      Output path for upscaled image

Options:
  --size <2K|4K>       Output size (default: 4K)
  --aspect-ratio <r>   Aspect ratio (default: 16:9)
  --help               Show this help

Examples:
  # Upscale to 4K (default)
  bun upscale-image.ts --input photo.jpg --output photo-4k.png

  # Upscale to 2K with specific aspect ratio
  bun upscale-image.ts --input thumb.png --output hero.png --size 2K --aspect-ratio 2:1
`);
}

function parseArgs(argv: string[]): CLIArgs {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const parsed: Partial<CLIArgs> = {
    size: '4K',
    aspectRatio: '16:9',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        parsed.input = value;
        i++;
        break;
      case '--output':
      case '-o':
        parsed.output = value;
        i++;
        break;
      case '--size':
        if (value !== '2K' && value !== '4K') {
          throw new CLIError(`Invalid size: ${value}. Use 2K or 4K`);
        }
        parsed.size = value as '2K' | '4K';
        i++;
        break;
      case '--aspect-ratio':
        parsed.aspectRatio = value;
        i++;
        break;
    }
  }

  if (!parsed.input) {
    throw new CLIError('Missing required argument: --input');
  }
  if (!parsed.output) {
    throw new CLIError('Missing required argument: --output');
  }
  if (!existsSync(parsed.input)) {
    throw new CLIError(`Input file not found: ${parsed.input}`);
  }

  return parsed as CLIArgs;
}

// ============================================================================
// Upscaling (following generate-ulart-image.ts pattern exactly)
// ============================================================================

async function upscaleImage(args: CLIArgs): Promise<void> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new CLIError(
      'Missing API key. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  // Read input image
  console.log(`📷 Reading ${basename(args.input)}...`);
  const imageBuffer = await readFile(args.input);
  const imageBase64 = imageBuffer.toString('base64');

  // Determine MIME type
  const ext = extname(args.input).toLowerCase();
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
      throw new CLIError(`Unsupported format: ${ext}. Use .png, .jpg, or .webp`);
  }

  // Build parts array - image FIRST, then prompt (following existing tool)
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
    {
      text: 'Generate an image depicting the following scene:\n\nUpscale this image to higher resolution. Maintain the EXACT same composition, colors, subjects, and details. Do not add, remove, or modify any elements. Simply increase the resolution and enhance fine details.',
    },
  ];

  console.log(`🔍 Upscaling to ${args.size} (${args.aspectRatio})...`);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{ parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: args.aspectRatio,
        imageSize: args.size,
      },
    },
  });

  // Extract image from response
  let imageData: string | undefined;
  const candidate = response.candidates?.[0];

  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        imageData = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageData) {
    const finishReason = candidate?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new CLIError('Image blocked by safety filters');
    }
    throw new CLIError(`No image in response. Finish reason: ${finishReason || 'unknown'}`);
  }

  // Save output
  const outputBuffer = Buffer.from(imageData, 'base64');
  await writeFile(args.output, outputBuffer);

  console.log(`✅ Saved to ${args.output}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await loadEnv();
    const args = parseArgs(process.argv);
    await upscaleImage(args);
  } catch (error) {
    if (error instanceof CLIError) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main();
