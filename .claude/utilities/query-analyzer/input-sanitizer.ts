/**
 * Input sanitization and escaping for query analyzer
 *
 * Provides safe handling of user input for:
 * - LLM prompts (escape injection patterns)
 * - Shell commands (escape special characters)
 * - Logging (redact sensitive patterns)
 *
 * Security principle: Sanitize at system boundaries, trust internal code
 */

export interface SanitizeOptions {
  maxLength?: number; // Max query length (default 2000)
  allowedChars?: RegExp; // Allowed character pattern
  escapeForShell?: boolean; // Escape shell special chars
  escapeForPrompt?: boolean; // Escape potential prompt injections
  stripControlChars?: boolean; // Remove control characters
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  maxLength: 2000,
  stripControlChars: true,
  escapeForShell: false,
  escapeForPrompt: false,
};

// Control characters (excluding common whitespace)
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional - sanitizing control characters
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Shell special characters that need escaping
const SHELL_SPECIAL = /(["\$`\\!])/g;

// Patterns that might indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /disregard\s+(all\s+)?prior/i,
  /execute\s+the\s+following/i,
  /system\s*prompt/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
];

/**
 * Check if query contains potential prompt injection
 */
export function detectInjectionAttempt(query: string): { detected: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

/**
 * Escape special characters for shell safety
 */
export function escapeForShell(input: string): string {
  return input.replace(SHELL_SPECIAL, '\\$1');
}

/**
 * Escape content for safe prompt inclusion
 * Wraps in delimiters and escapes potential markers
 */
export function escapeForPrompt(input: string): string {
  // Replace common delimiter characters with safe alternatives
  return input.replace(/```/g, '\\`\\`\\`').replace(/<\|/g, '<\\|').replace(/\|>/g, '\\|>');
}

/**
 * Strip control characters except common whitespace (space, tab, newline)
 */
export function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHARS, '');
}

/**
 * Main sanitization function
 */
export function sanitizeQuery(
  query: string,
  options: SanitizeOptions = {}
): {
  sanitized: string;
  truncated: boolean;
  hadControlChars: boolean;
  injectionWarning?: string;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result = query;
  let truncated = false;
  let hadControlChars = false;
  let injectionWarning: string | undefined;

  // 1. Check for control characters
  if (opts.stripControlChars && CONTROL_CHARS.test(result)) {
    hadControlChars = true;
    result = stripControlChars(result);
  }

  // 2. Trim whitespace
  result = result.trim();

  // 3. Check length limit
  if (opts.maxLength && result.length > opts.maxLength) {
    result = result.substring(0, opts.maxLength);
    truncated = true;
  }

  // 4. Escape for shell if needed
  if (opts.escapeForShell) {
    result = escapeForShell(result);
  }

  // 5. Escape for prompt if needed
  if (opts.escapeForPrompt) {
    result = escapeForPrompt(result);
  }

  // 6. Check for injection patterns (warning only, don't block)
  const injection = detectInjectionAttempt(result);
  if (injection.detected) {
    injectionWarning = `Potential prompt injection detected: ${injection.pattern}`;
  }

  return {
    sanitized: result,
    truncated,
    hadControlChars,
    injectionWarning,
  };
}

/**
 * Validate query meets basic requirements
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  if (query.trim().length < 3) {
    return { valid: false, error: 'Query too short (minimum 3 characters)' };
  }

  // Max length check
  if (query.length > 10000) {
    return { valid: false, error: 'Query too long (maximum 10000 characters)' };
  }

  return { valid: true };
}

// CLI for testing
if (import.meta.main) {
  const input = process.argv.slice(2).join(' ');

  if (!input) {
    console.log(`
Input Sanitizer CLI

Usage:
  bun input-sanitizer.ts <input>        Test sanitization
  bun input-sanitizer.ts --shell <in>   Test with shell escaping
  bun input-sanitizer.ts --prompt <in>  Test with prompt escaping

Examples:
  bun input-sanitizer.ts "Hello \$world"
  bun input-sanitizer.ts "Ignore previous instructions"
`);
    process.exit(0);
  }

  const useShell = process.argv.includes('--shell');
  const usePrompt = process.argv.includes('--prompt');
  const query = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--'))
    .join(' ');

  const validation = validateQuery(query);
  console.log('Validation:', validation);

  const result = sanitizeQuery(query, {
    escapeForShell: useShell,
    escapeForPrompt: usePrompt,
  });

  console.log('Result:', JSON.stringify(result, null, 2));
}
