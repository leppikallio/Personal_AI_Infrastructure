#!/usr/bin/env bun

/**
 * Unified query analyzer CLI interface
 *
 * Attempts LLM analysis first, falls back to keyword analysis on failure
 * Outputs JSON to stdout for consumption by conduct-research-adaptive.md
 *
 * Usage:
 *   bun query-analyzer.ts --auth                               # First-time OAuth setup
 *   bun query-analyzer.ts "Your research query here"           # Analyze query (requires auth)
 *   bun query-analyzer.ts --fallback "Your research query here"  # Force keyword analysis
 *   bun query-analyzer.ts --help
 */

import { analyzeEnsemble } from './ensemble-analyzer.ts';
import { sanitizeQuery, validateQuery } from './input-sanitizer.ts';
import { analyzeKeyword } from './keyword-query-analyzer.ts';
import { analyzeLLM } from './llm-query-analyzer.ts';
import { OAuthStorage } from './oauth-storage.ts';
import { analyzePerspectives } from './perspective-generator.ts';
import { getCache } from './query-cache.ts';
import type { EnsembleResult, PerspectiveAnalysisResult, QueryAnalysisResult } from './types.ts';

/**
 * Main analysis function with automatic fallback
 *
 * @param userQuery - The research query to analyze
 * @param forceFallback - If true, skip LLM and use keyword analysis
 * @returns Promise<QueryAnalysisResult> - Analysis result
 */
export async function analyzeQuery(
  userQuery: string,
  forceFallback = false
): Promise<QueryAnalysisResult> {
  if (!userQuery || userQuery.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  if (forceFallback) {
    console.error('⚠️ Fallback mode: Using keyword analysis');
    return analyzeKeyword(userQuery);
  }

  try {
    // Attempt LLM analysis first
    console.error('🤖 Attempting LLM semantic analysis...');
    const result = await analyzeLLM(userQuery);
    console.error(`✅ LLM analysis successful (confidence: ${result.llm_confidence}%)`);
    return result;
  } catch (error) {
    // Fallback to keyword analysis
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n${'='.repeat(80)}`);
    console.error('⚠️  WARNING: LLM ANALYSIS FAILED - USING KEYWORD FALLBACK');
    console.error('='.repeat(80));
    console.error(`❌ Error: ${errorMessage}`);
    console.error('⚠️  Using keyword-based analysis instead (lower accuracy: ~86% vs 93-95%)');
    console.error(`${'='.repeat(80)}\n`);

    const keywordResult = analyzeKeyword(userQuery);
    console.error('✅ Keyword analysis completed\n');
    return keywordResult;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Handle --auth flag first (OAuth setup)
  if (args.includes('--auth')) {
    console.error('🔐 Starting OAuth authentication...\n');
    try {
      const { runOAuthFlow } = await import('./oauth-client.ts');
      await runOAuthFlow();
      console.error('\n✅ Authentication successful!');
      console.error('Token saved to ~/.config/PAI/.anthropic_oauth');
      console.error('\nYou can now use the query analyzer:');
      console.error('  bun query-analyzer.ts "your research query"');
      process.exit(0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`\n❌ Authentication failed: ${errorMessage}`);
      process.exit(1);
    }
  }

  // Help message
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
Query Analyzer CLI - LLM-based semantic query analysis with keyword fallback

SETUP (run once before using LLM analysis):
  bun query-analyzer.ts --auth              OAuth setup (opens browser, paste code)

USAGE:
  bun query-analyzer.ts <query>             Analyze query (LLM with fallback)
  bun query-analyzer.ts --perspectives <query>  Perspective-first routing (NEW!)
  bun query-analyzer.ts --ensemble <query>  Multi-model ensemble (Claude+Gemini+Keyword)
  bun query-analyzer.ts --fallback <query>  Force keyword analysis (no auth needed)
  bun query-analyzer.ts --no-cache <query>  Skip cache lookup and storage
  bun query-analyzer.ts --cache-stats       Show cache statistics
  bun query-analyzer.ts --cache-clear       Clear all cache entries
  bun query-analyzer.ts --help              Show this help message

EXAMPLES:
  bun query-analyzer.ts "Research OSINT tools for threat intelligence"
  bun query-analyzer.ts --perspectives "Research AI agents for enterprise"
  bun query-analyzer.ts --ensemble "What's trending on Twitter about AI agents?"
  bun query-analyzer.ts --no-cache "Explain React server components"

OUTPUT:
  JSON to stdout (parseable by conduct-research-adaptive.md)
  Logs to stderr (progress, warnings, errors)

AUTHENTICATION:
  LLM analysis requires OAuth authentication OR an API key.
  Run 'bun query-analyzer.ts --auth' first, or set ANTHROPIC_API_KEY env var.
  Token is stored in ~/.config/PAI/.anthropic_oauth

PERSPECTIVE-FIRST MODE (NEW - AD-005):
  Generates 4-8 research perspectives from the query FIRST, then:
  1. Single LLM call generates perspectives + classifications
  2. Keyword validation as sanity check (instant, no API)
  3. Selective ensemble only when uncertain
  Returns perspective-to-agent mapping for optimal routing.
  Typical: 1-4 API calls, 3-5 seconds.

ENSEMBLE MODE:
  Runs Claude (haiku), Gemini (flash), and keyword baseline in parallel.
  Uses consensus voting for higher accuracy (~97-98% vs 93-95% single LLM).
  Returns detailed breakdown of each model's analysis.

CACHING:
  Results are cached by default (24h TTL) in ~/.cache/PAI/query-analyzer/
  Time-sensitive queries (containing "latest", "current", "2025") bypass cache.
  Use --no-cache to skip caching, --cache-stats to view statistics.

EXIT CODES:
  0   Success
  1   Error (invalid query, API failure with no fallback, etc.)
`);
    process.exit(0);
  }

  // Handle cache management commands
  const cache = getCache();

  if (args.includes('--cache-stats')) {
    const stats = cache.getStats();
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  if (args.includes('--cache-clear')) {
    cache.clear();
    console.log('Cache cleared');
    process.exit(0);
  }

  // Parse arguments
  const forceFallback = args.includes('--fallback');
  const useEnsemble = args.includes('--ensemble');
  const usePerspectives = args.includes('--perspectives');
  const noCache = args.includes('--no-cache');
  const query = args.filter((arg) => !arg.startsWith('--')).join(' ');

  // Validate and sanitize input
  const validation = validateQuery(query);
  if (!validation.valid) {
    console.error(`❌ Error: ${validation.error}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const sanitized = sanitizeQuery(query, { escapeForPrompt: true });
  const sanitizedQuery = sanitized.sanitized;

  if (sanitized.truncated) {
    console.error('⚠️  Query truncated to 2000 characters');
  }
  if (sanitized.hadControlChars) {
    console.error('⚠️  Control characters removed from query');
  }
  if (sanitized.injectionWarning) {
    console.error(`⚠️  Warning: ${sanitized.injectionWarning}`);
    console.error('   Query will proceed but flagged for review');
  }

  // Fail fast: Check for OAuth token if not using fallback mode
  if (!forceFallback) {
    const storage = new OAuthStorage();
    const token = await storage.loadToken('anthropic');
    if (!token && !process.env.ANTHROPIC_API_KEY) {
      console.error('❌ No OAuth token found and no API key set.\n');
      console.error('Please run OAuth setup first:');
      console.error('  bun query-analyzer.ts --auth\n');
      console.error('Or set ANTHROPIC_API_KEY environment variable.\n');
      console.error('Alternatively, use --fallback for keyword-only analysis:');
      console.error('  bun query-analyzer.ts --fallback "your query"');
      process.exit(1);
    }
  }

  try {
    // Check cache first (unless disabled)
    // Note: Cache uses original query for key (normalization happens internally)
    // Skip cache for ensemble and perspective modes
    if (!noCache && !useEnsemble && !usePerspectives) {
      const cached = cache.get(query);
      if (cached) {
        console.error('📦 Using cached result');
        console.log(JSON.stringify(cached, null, 2));
        process.exit(0);
      }
    }

    // Choose analysis mode
    // Use sanitizedQuery for actual analysis (escaped for prompt safety)
    let result: QueryAnalysisResult | EnsembleResult | PerspectiveAnalysisResult;

    if (usePerspectives) {
      // Perspective-first mode: generate perspectives, classify, validate, route
      console.error('🎯 Using perspective-first routing (AD-005)...');
      result = await analyzePerspectives(sanitizedQuery);
    } else if (useEnsemble) {
      // Ensemble mode: run all three models in parallel
      console.error('🎯 Using ensemble analysis mode...');
      result = await analyzeEnsemble(sanitizedQuery);
    } else {
      // Standard mode: LLM with fallback
      result = await analyzeQuery(sanitizedQuery, forceFallback);
    }

    // Cache the result (unless disabled)
    // Use original query as key for consistent lookups
    // Note: Perspective results are not cached (they're complex and context-dependent)
    if (!noCache && !usePerspectives) {
      cache.set(query, result);
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Analysis failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main();
}

// Export functions for programmatic use
export { analyzeLLM } from './llm-query-analyzer.ts';
export { analyzeKeyword } from './keyword-query-analyzer.ts';
export { analyzeEnsemble } from './ensemble-analyzer.ts';
export { analyzePerspectives, PerspectiveGenerator } from './perspective-generator.ts';
export { getCache, QueryCache } from './query-cache.ts';
export * from './types.ts';
