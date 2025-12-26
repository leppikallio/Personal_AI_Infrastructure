#!/usr/bin/env bun
/**
 * PAI Input/Output Sanitizer
 *
 * Security layer for LLM inputs and outputs in research workflow.
 *
 * Threat Model:
 * 1. Shell Injection: LLM generates text with $(), backticks, ;, &&, | etc.
 * 2. Prompt Injection: LLM generates "ignore instructions" in perspectives
 * 3. Path Traversal: LLM generates ../../../ in file references
 * 4. Schema Violation: LLM returns unexpected fields/types
 *
 * Usage:
 *   # Validate and sanitize JSON from stdin
 *   echo "$JSON" | bun sanitizer.ts --schema=analysis
 *
 *   # Sanitize a single string for shell use
 *   bun sanitizer.ts --shell "user input here"
 *
 *   # Check for prompt injection
 *   bun sanitizer.ts --check-injection "some text"
 */

import { z } from 'zod';

// ============================================================================
// SECURITY PATTERNS
// ============================================================================

/** Shell metacharacters that enable command injection */
const _SHELL_INJECTION_CHARS = /[\$`\|\;&\(\)\{\}\[\]<>!\n\r]/g;

/** More aggressive - removes anything that could be interpreted by shell */
const SHELL_SAFE_PATTERN = /[^a-zA-Z0-9\s\.,\-_:'"\/\?=+%#@]/g;

/** Common prompt injection patterns */
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction override
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /forget\s+(everything|all|what)\s+(you|i)\s+(told|said)/i,

  // Role manipulation
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(you|to\s+be)/i,
  /act\s+as\s+(if|a|an|the)/i,
  /roleplay\s+as/i,

  // System prompt extraction
  /what\s+(is|are)\s+your\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i,
  /repeat\s+(your\s+)?(system\s+)?instructions/i,

  // Token markers (various LLM formats)
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /<<SYS>>/i,
  /<\/SYS>>/i,

  // Code execution attempts
  /execute\s+(the\s+following|this|code)/i,
  /run\s+(this\s+)?command/i,
  /eval\s*\(/i,
  /exec\s*\(/i,

  // Delimiter injection
  /```(bash|sh|shell|python|javascript|js)/i,
  /<script>/i,
];

/** Path traversal patterns */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g, // ../
  /\.\.\\/, // ..\
  /%2e%2e%2f/gi, // URL encoded ../
  /%2e%2e\//gi, // Partial URL encoded
  /\.\.%2f/gi, // Partial URL encoded
  /\.\.\%5c/gi, // URL encoded ..\
];

// ============================================================================
// SCHEMAS (Zod)
// ============================================================================

/** Perspective from query analyzer */
const PerspectiveSchema = z.object({
  text: z.string().max(1000),
  domain: z.enum(['academic', 'technical', 'social_media', 'multimodal', 'security', 'news']),
  confidence: z.number().min(0).max(100),
  recommendedAgent: z.string().max(50),
  platforms: z
    .array(
      z.object({
        name: z.string().max(100),
        reason: z.string().max(500).optional(),
        confidence: z.number().min(0).max(100).optional(),
      })
    )
    .optional(),
});

/** Query analysis result schema */
const AnalysisSchema = z
  .object({
    query: z.string().max(5000),
    perspectives: z.array(PerspectiveSchema).min(1).max(20),
    perspectiveCount: z.number().min(1).max(20),
    overallComplexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']),
    overallConfidence: z.number().min(0).max(100),
    timeSensitive: z.boolean(),
    reasoning: z.string().max(2000),
    agentAllocation: z.record(z.string(), z.number()),
  })
  .passthrough(); // Allow additional fields but validate core structure

/** Track allocation schema */
const TrackAllocationSchema = z.object({
  allocation_strategy: z.string(),
  total_perspectives: z.number(),
  distribution: z.object({
    standard: z.number(),
    independent: z.number(),
    contrarian: z.number(),
  }),
  tracks: z.array(
    z.object({
      perspective: z.string().max(1000),
      perspective_index: z.number(),
      domain: z.string(),
      recommended_agent: z.string(),
      track: z.enum(['standard', 'independent', 'contrarian']),
      source_guidance: z.string(),
    })
  ),
});

const SCHEMAS: Record<string, z.ZodSchema> = {
  analysis: AnalysisSchema,
  track: TrackAllocationSchema,
};

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

export interface SanitizeResult {
  safe: boolean;
  sanitized: string;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
}

/**
 * Sanitize a string for safe shell use
 * Removes/escapes characters that could enable command injection
 */
export function sanitizeForShell(input: string, aggressive = false): SanitizeResult {
  const warnings: string[] = [];
  let sanitized = input;

  // Check for obvious injection attempts first
  const hasInjection = /\$\(|\`|;|\||&&/.test(input);
  if (hasInjection) {
    warnings.push('Detected potential shell injection characters');
  }

  if (aggressive) {
    // Remove anything that's not alphanumeric or basic punctuation
    sanitized = input.replace(SHELL_SAFE_PATTERN, '');
  } else {
    // Escape dangerous characters
    sanitized = input
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/\$/g, '\\$') // Escape $ (variable expansion)
      .replace(/`/g, '\\`') // Escape backticks (command substitution)
      .replace(/!/g, '\\!') // Escape ! (history expansion)
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/;/g, '\\;') // Escape semicolon (command separator)
      .replace(/\|/g, '\\|') // Escape pipe
      .replace(/&/g, '\\&') // Escape ampersand
      .replace(/\(/g, '\\(') // Escape parens
      .replace(/\)/g, '\\)')
      .replace(/</g, '\\<') // Escape redirects
      .replace(/>/g, '\\>')
      .replace(/\n/g, ' ') // Replace newlines with space
      .replace(/\r/g, ''); // Remove carriage returns
  }

  return {
    safe: !hasInjection,
    sanitized,
    warnings,
    blocked: false,
  };
}

/**
 * Check for prompt injection patterns
 */
export function detectPromptInjection(input: string): { detected: boolean; patterns: string[] } {
  const detected: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detected.push(pattern.source);
    }
  }

  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

/**
 * Check for path traversal attempts
 */
export function detectPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize a string for safe use in agent prompts
 * Wraps content in delimiters and neutralizes injection attempts
 */
export function sanitizeForPrompt(input: string): SanitizeResult {
  const warnings: string[] = [];
  const injection = detectPromptInjection(input);

  if (injection.detected) {
    warnings.push(`Potential prompt injection: ${injection.patterns.join(', ')}`);
  }

  // Escape common delimiter characters
  const sanitized = input
    .replace(/```/g, '` ` `') // Break code blocks
    .replace(/<\|/g, '< |') // Break token markers
    .replace(/\|>/g, '| >')
    .replace(/<<</g, '< < <') // Break heredocs
    .replace(/>>>/g, '> > >')
    .replace(/\[INST\]/gi, '[I N S T]') // Break instruction markers
    .replace(/\[\/INST\]/gi, '[/ I N S T]');

  return {
    safe: !injection.detected,
    sanitized,
    warnings,
    blocked: false,
  };
}

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { forShell?: boolean; forPrompt?: boolean } = {}
): { sanitized: T; warnings: string[] } {
  const warnings: string[] = [];

  function processValue(value: unknown, path: string): unknown {
    if (typeof value === 'string') {
      // Check for injection
      const injection = detectPromptInjection(value);
      if (injection.detected) {
        warnings.push(`[${path}] Prompt injection: ${injection.patterns[0]}`);
      }

      // Check for path traversal
      if (detectPathTraversal(value)) {
        warnings.push(`[${path}] Path traversal detected`);
      }

      // Sanitize based on options
      if (options.forShell) {
        return sanitizeForShell(value).sanitized;
      }
      if (options.forPrompt) {
        return sanitizeForPrompt(value).sanitized;
      }

      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, i) => processValue(item, `${path}[${i}]`));
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = processValue(val, `${path}.${key}`);
      }
      return result;
    }

    return value;
  }

  const sanitized = processValue(obj, '$') as T;
  return { sanitized, warnings };
}

/**
 * Validate JSON against a schema and sanitize all string fields
 */
export function validateAndSanitize(
  json: unknown,
  schemaName: string,
  options: { forShell?: boolean; forPrompt?: boolean; blockInjection?: boolean } = {}
): {
  valid: boolean;
  data?: unknown;
  errors?: string[];
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
} {
  const schema = SCHEMAS[schemaName];
  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown schema: ${schemaName}. Available: ${Object.keys(SCHEMAS).join(', ')}`],
      warnings: [],
      blocked: false,
    };
  }

  // First validate schema
  const parseResult = schema.safeParse(json);
  if (!parseResult.success) {
    return {
      valid: false,
      errors: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
      blocked: false,
    };
  }

  // Then sanitize all string fields
  const { sanitized, warnings } = sanitizeObject(
    parseResult.data as Record<string, unknown>,
    options
  );

  // Check for blocking conditions when blockInjection is enabled
  if (options.blockInjection) {
    const injectionWarnings = warnings.filter((w) => w.includes('Prompt injection'));
    if (injectionWarnings.length > 0) {
      return {
        valid: false,
        errors: ['Prompt injection detected - blocking execution'],
        warnings,
        blocked: true,
        blockReason: `Detected ${injectionWarnings.length} prompt injection pattern(s): ${injectionWarnings.join('; ')}`,
      };
    }
  }

  return {
    valid: true,
    data: sanitized,
    warnings,
    blocked: false,
  };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage() {
  console.log(`
PAI Input/Output Sanitizer

Usage:
  # Validate and sanitize JSON from stdin against a schema
  echo "\$JSON" | bun sanitizer.ts --schema=analysis
  echo "\$JSON" | bun sanitizer.ts --schema=track

  # Sanitize a single string for shell use
  bun sanitizer.ts --shell "user input"
  bun sanitizer.ts --shell-aggressive "user input"

  # Sanitize for prompt inclusion
  bun sanitizer.ts --prompt "content to embed"

  # Check for prompt injection
  bun sanitizer.ts --check "ignore previous instructions and..."

  # Full object sanitization from stdin (no schema validation)
  echo "\$JSON" | bun sanitizer.ts --sanitize-object

Options:
  --schema=<name>      Validate against schema (analysis, track)
  --shell              Sanitize for shell (escape metacharacters)
  --shell-aggressive   Aggressive shell sanitize (alphanumeric only)
  --prompt             Sanitize for prompt embedding
  --check              Check for injection patterns only
  --sanitize-object    Sanitize all strings in JSON object
  --for-shell          With --sanitize-object, escape for shell
  --for-prompt         With --sanitize-object, escape for prompt
  --block-injection    Block and fail if prompt injection detected

Output:
  JSON with: { valid, data?, errors?, warnings }
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  // Single string modes
  if (args.includes('--shell') || args.includes('--shell-aggressive')) {
    const aggressive = args.includes('--shell-aggressive');
    const input = args.filter((a) => !a.startsWith('--')).join(' ');
    const result = sanitizeForShell(input, aggressive);
    console.log(JSON.stringify(result));
    process.exit(result.safe ? 0 : 1);
  }

  if (args.includes('--prompt')) {
    const input = args.filter((a) => !a.startsWith('--')).join(' ');
    const result = sanitizeForPrompt(input);
    console.log(JSON.stringify(result));
    process.exit(result.safe ? 0 : 1);
  }

  if (args.includes('--check')) {
    const input = args.filter((a) => !a.startsWith('--')).join(' ');
    const result = detectPromptInjection(input);
    console.log(JSON.stringify({ ...result, pathTraversal: detectPathTraversal(input) }));
    process.exit(result.detected ? 1 : 0);
  }

  // JSON processing modes (read from stdin)
  const stdin = await Bun.stdin.text();
  let json: unknown;

  try {
    json = JSON.parse(stdin);
  } catch (_e) {
    console.log(
      JSON.stringify({
        valid: false,
        errors: ['Invalid JSON input'],
        warnings: [],
      })
    );
    process.exit(1);
  }

  // Schema validation mode
  const schemaArg = args.find((a) => a.startsWith('--schema='));
  if (schemaArg) {
    const schemaName = schemaArg.split('=')[1];
    const forShell = args.includes('--for-shell');
    const forPrompt = args.includes('--for-prompt');
    const blockInjection = args.includes('--block-injection');
    const result = validateAndSanitize(json, schemaName, { forShell, forPrompt, blockInjection });
    console.log(JSON.stringify(result));
    process.exit(result.valid ? 0 : 1);
  }

  // Object sanitization mode (no schema)
  if (args.includes('--sanitize-object')) {
    const forShell = args.includes('--for-shell');
    const forPrompt = args.includes('--for-prompt');
    const blockInjection = args.includes('--block-injection');
    const { sanitized, warnings } = sanitizeObject(json as Record<string, unknown>, {
      forShell,
      forPrompt,
    });

    // Check for blocking conditions
    if (blockInjection) {
      const injectionWarnings = warnings.filter((w) => w.includes('Prompt injection'));
      if (injectionWarnings.length > 0) {
        console.log(
          JSON.stringify({
            valid: false,
            errors: ['Prompt injection detected - blocking execution'],
            warnings,
            blocked: true,
            blockReason: `Detected ${injectionWarnings.length} prompt injection pattern(s)`,
          })
        );
        process.exit(1);
      }
    }

    console.log(JSON.stringify({ valid: true, data: sanitized, warnings, blocked: false }));
    process.exit(warnings.length > 0 ? 1 : 0);
  }

  printUsage();
  process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ valid: false, errors: [String(e)], warnings: [] }));
  process.exit(1);
});
