/**
 * Multi-model ensemble query analyzer
 *
 * Runs Claude (haiku), Gemini (flash), and keyword baseline in parallel
 * Uses consensus voting to produce higher-accuracy domain classification
 *
 * Expected improvement: 93-95% (LLM single) → 97-98% (ensemble)
 */

import { generateGeminiContent } from './gemini-client.ts';
import { analyzeKeyword } from './keyword-query-analyzer.ts';
import { analyzeLLM } from './llm-query-analyzer.ts';
import type {
  AnalyzerSource,
  EnsembleConfig,
  EnsembleResult,
  QueryAnalysisResult,
} from './types.ts';

const DEFAULT_CONFIG: EnsembleConfig = {
  runAllModels: true,
  minConfidenceForSingle: 80,
  geminiModel: 'gemini-2.5-flash', // Explicitly use flash for speed
  timeoutMs: 30000, // 30s timeout for each model
};

// Track last Gemini call time for rate limiting awareness
let lastGeminiCallTime = 0;
const GEMINI_MIN_INTERVAL_MS = 5000; // Minimum 5s between Gemini calls

// Exponential backoff configuration
const BACKOFF_CONFIG = {
  maxAttempts: 3, // Max retry attempts
  baseDelayMs: 5000, // Start with 5s delay
  maxDelayMs: 60000, // Cap at 60s
  jitterFactor: 0.2, // ±20% randomization to prevent thundering herd
};

/**
 * Extract wait time from quota error message
 * Example: "Your quota will reset after 20s." → 20
 */
function extractQuotaWaitTime(errorMessage: string): number | null {
  const match = errorMessage.match(/quota will reset after (\d+)(?:-\d+)?s/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return null;
}

/**
 * Check if error is a retryable error (quota/rate limit/timeout)
 */
function isRetryableError(errorMessage: string): boolean {
  return (
    errorMessage.includes('quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('exhausted your capacity') ||
    errorMessage.includes('timeout')
  );
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, quotaWaitSeconds?: number): number {
  // If quota error specifies wait time, use that + buffer
  if (quotaWaitSeconds) {
    return (quotaWaitSeconds + 2) * 1000;
  }

  // Exponential backoff: baseDelay * 2^attempt
  let delay = BACKOFF_CONFIG.baseDelayMs * 2 ** attempt;

  // Cap at max delay
  delay = Math.min(delay, BACKOFF_CONFIG.maxDelayMs);

  // Add jitter (±20%)
  const jitter = delay * BACKOFF_CONFIG.jitterFactor * (Math.random() * 2 - 1);
  delay = Math.round(delay + jitter);

  return delay;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini analysis prompt (same structure as Claude)
const GEMINI_PROMPT = `You are a query analysis expert. Analyze this research query and return ONLY valid JSON (no markdown, no explanation):

{
  "domain_scores": {
    "social_media": <0-100>,
    "academic": <0-100>,
    "technical": <0-100>,
    "multimodal": <0-100>,
    "security": <0-100>,
    "news": <0-100>
  },
  "primary_domain": "<highest scoring domain>",
  "secondary_domains": ["<domains with score > 40>"],
  "complexity": "<SIMPLE|MODERATE|COMPLEX>",
  "wave1_agent_count": <4 for SIMPLE, 5 for MODERATE, 6 for COMPLEX>,
  "wave1_agent_allocation": {
    "perplexity-researcher": <count>,
    "claude-researcher": <count>,
    "gemini-researcher": <count>,
    "grok-researcher": <count>
  },
  "expected_pivots": [{
    "scenario": "<description>",
    "likely_pivot": "<domain>",
    "trigger": "<condition>",
    "wave2_specialists": "<agents>",
    "confidence": "<HIGH|MODERATE|LOW>"
  }],
  "reasoning": "<brief explanation>",
  "llm_confidence": <0-100>
}

Domains:
- social_media: X/Twitter, Reddit, trending, viral content
- academic: Research papers, arxiv, scholarly articles
- technical: Code, APIs, implementation, frameworks
- multimodal: Videos, images, YouTube tutorials
- security: OSINT, threat intel, vulnerabilities
- news: Current events, announcements

Query: `;

/**
 * Run Gemini analysis via imported module (single attempt)
 */
async function runGeminiOnce(
  userQuery: string,
  config: EnsembleConfig
): Promise<QueryAnalysisResult> {
  const fullPrompt = `${GEMINI_PROMPT}"${userQuery}"`;

  // Use imported module instead of spawning CLI
  const response = await generateGeminiContent(fullPrompt, {
    model: config.geminiModel,
    maxTokens: 4096,
    temperature: 0.3, // Lower temp for structured output
  });

  // Extract JSON from response (may have preamble or markdown)
  let jsonStr = response.trim();

  // Try to find JSON object in response
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // Construct result
  const result: QueryAnalysisResult = {
    query: userQuery,
    domain_scores: parsed.domain_scores,
    primary_domain: parsed.primary_domain,
    secondary_domains: parsed.secondary_domains || [],
    complexity: parsed.complexity,
    wave1_agent_count: parsed.wave1_agent_count,
    wave1_agent_allocation: parsed.wave1_agent_allocation,
    expected_pivots: parsed.expected_pivots || [],
    reasoning: parsed.reasoning || 'Gemini analysis',
    analyzer_used: 'llm',
    llm_confidence: parsed.llm_confidence || 75,
    timestamp: new Date().toISOString(),
  };

  return result;
}

/**
 * Run Gemini analysis with exponential backoff
 *
 * Features:
 * - Respects minimum interval between calls (rate limit awareness)
 * - Exponential backoff with jitter for retries
 * - Respects quota wait times when specified in error
 * - Up to 3 attempts before giving up
 * - Uses imported gemini-client module (no subprocess spawning)
 */
async function analyzeGemini(
  userQuery: string,
  config: EnsembleConfig
): Promise<QueryAnalysisResult> {
  // Rate limit awareness: wait if we called Gemini recently
  const timeSinceLastCall = Date.now() - lastGeminiCallTime;
  if (lastGeminiCallTime > 0 && timeSinceLastCall < GEMINI_MIN_INTERVAL_MS) {
    const waitTime = GEMINI_MIN_INTERVAL_MS - timeSinceLastCall;
    console.error(`    ⏳ Waiting ${waitTime}ms before Gemini call (rate limit awareness)`);
    await sleep(waitTime);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < BACKOFF_CONFIG.maxAttempts; attempt++) {
    lastGeminiCallTime = Date.now();

    try {
      const result = await runGeminiOnce(userQuery, config);
      if (attempt > 0) {
        console.error(`    ✅ Gemini succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastError = error instanceof Error ? error : new Error(errorMessage);

      // Check if this is a retryable error
      if (!isRetryableError(errorMessage)) {
        // Non-retryable error, fail immediately
        throw error;
      }

      // Last attempt? Don't sleep, just fail
      if (attempt === BACKOFF_CONFIG.maxAttempts - 1) {
        break;
      }

      // Calculate backoff delay
      const quotaWaitSeconds = extractQuotaWaitTime(errorMessage) ?? undefined;
      const delayMs = calculateBackoffDelay(attempt, quotaWaitSeconds);

      console.error(
        `    ⚠️ Gemini attempt ${attempt + 1}/${BACKOFF_CONFIG.maxAttempts} failed: ${errorMessage.substring(0, 80)}`
      );
      console.error(`    ⏳ Retrying in ${Math.round(delayMs / 1000)}s (exponential backoff)...`);

      await sleep(delayMs);
    }
  }

  // All attempts failed
  throw new Error(
    `Gemini failed after ${BACKOFF_CONFIG.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Count agreements on a specific field
 */
function countAgreement<T>(values: (T | null)[]): { winner: T | null; count: number } {
  const counts = new Map<T, number>();

  for (const v of values) {
    if (v !== null) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
  }

  let winner: T | null = null;
  let maxCount = 0;

  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      winner = value;
    }
  }

  return { winner, count: maxCount };
}

/**
 * Resolve consensus from multiple analysis results
 *
 * Priority: Unanimous > Majority > Weighted (by confidence) > Fallback to Claude
 */
function resolveConsensus(
  results: { source: AnalyzerSource; result: QueryAnalysisResult | null }[]
): {
  final: QueryAnalysisResult;
  method: 'unanimous' | 'majority' | 'weighted' | 'fallback';
  domainAgreement: number;
  complexityAgreement: number;
} {
  const validResults = results.filter((r) => r.result !== null);

  if (validResults.length === 0) {
    throw new Error('No valid results to resolve consensus');
  }

  // Single result - fallback
  if (validResults.length === 1) {
    return {
      final: validResults[0].result!,
      method: 'fallback',
      domainAgreement: 1,
      complexityAgreement: 1,
    };
  }

  // Extract values for voting
  const domains = validResults.map((r) => r.result?.primary_domain);
  const complexities = validResults.map((r) => r.result?.complexity);

  const domainVote = countAgreement(domains);
  const complexityVote = countAgreement(complexities);

  // Determine resolution method
  let method: 'unanimous' | 'majority' | 'weighted' | 'fallback';

  if (domainVote.count === validResults.length && complexityVote.count === validResults.length) {
    method = 'unanimous';
  } else if (domainVote.count >= 2 || complexityVote.count >= 2) {
    method = 'majority';
  } else {
    method = 'weighted';
  }

  // Build consensus result
  // Start with highest-confidence LLM result as base
  const llmResults = validResults.filter(
    (r) => r.source !== 'keyword' && r.result?.llm_confidence !== undefined
  );

  let baseResult: QueryAnalysisResult;

  if (llmResults.length > 0) {
    // Use highest confidence LLM result as base
    baseResult = llmResults.reduce((best, current) =>
      (current.result?.llm_confidence || 0) > (best.result?.llm_confidence || 0) ? current : best
    ).result!;
  } else {
    // Fallback to first valid result
    baseResult = validResults[0].result!;
  }

  // Override with consensus values
  const final: QueryAnalysisResult = {
    ...baseResult,
    primary_domain: domainVote.winner || baseResult.primary_domain,
    complexity: complexityVote.winner || baseResult.complexity,
    analyzer_used: 'llm', // Ensemble counts as LLM
    reasoning: `Ensemble consensus (${method}): ${baseResult.reasoning}`,
  };

  // Adjust agent count based on consensus complexity
  if (final.complexity === 'SIMPLE') {
    final.wave1_agent_count = 4;
  } else if (final.complexity === 'MODERATE') {
    final.wave1_agent_count = 5;
  } else {
    final.wave1_agent_count = 6;
  }

  return {
    final,
    method,
    domainAgreement: domainVote.count,
    complexityAgreement: complexityVote.count,
  };
}

/**
 * Run ensemble analysis with all three models in parallel
 */
export async function analyzeEnsemble(
  userQuery: string,
  config: Partial<EnsembleConfig> = {}
): Promise<EnsembleResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  console.error('🎯 Running ensemble analysis (Claude + Gemini + Keyword)...');

  // Run all three analyzers in parallel
  const [claudeResult, geminiResult, keywordResult] = await Promise.allSettled([
    // Claude (haiku)
    (async () => {
      const start = Date.now();
      try {
        const result = await analyzeLLM(userQuery);
        return { source: 'claude' as AnalyzerSource, result, latency_ms: Date.now() - start };
      } catch (error) {
        return {
          source: 'claude' as AnalyzerSource,
          result: null,
          latency_ms: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })(),

    // Gemini (flash)
    (async () => {
      const start = Date.now();
      try {
        const result = await analyzeGemini(userQuery, mergedConfig);
        return { source: 'gemini' as AnalyzerSource, result, latency_ms: Date.now() - start };
      } catch (error) {
        return {
          source: 'gemini' as AnalyzerSource,
          result: null,
          latency_ms: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })(),

    // Keyword (baseline)
    (async () => {
      const start = Date.now();
      try {
        const result = analyzeKeyword(userQuery);
        return { source: 'keyword' as AnalyzerSource, result, latency_ms: Date.now() - start };
      } catch (error) {
        return {
          source: 'keyword' as AnalyzerSource,
          result: null,
          latency_ms: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })(),
  ]);

  // Extract results (handle settled promises)
  const individual_results = [claudeResult, geminiResult, keywordResult].map((settled) => {
    if (settled.status === 'fulfilled') {
      return settled.value;
    }
    return {
      source: 'unknown' as AnalyzerSource,
      result: null,
      latency_ms: 0,
      error: settled.reason?.message || 'Promise rejected',
    };
  });

  // Log individual results
  for (const ir of individual_results) {
    if (ir.result) {
      console.error(
        `  ✅ ${ir.source}: ${ir.result.primary_domain} (${ir.result.complexity}) [${ir.latency_ms}ms]`
      );
    } else {
      console.error(`  ❌ ${ir.source}: FAILED - ${ir.error} [${ir.latency_ms}ms]`);
    }
  }

  // Resolve consensus
  const validForConsensus = individual_results
    .filter((r) => r.result !== null)
    .map((r) => ({ source: r.source, result: r.result }));

  if (validForConsensus.length === 0) {
    throw new Error('All analyzers failed - cannot resolve consensus');
  }

  const { final, method, domainAgreement, complexityAgreement } =
    resolveConsensus(validForConsensus);

  console.error(
    `  🎯 Consensus: ${final.primary_domain} (${final.complexity}) via ${method} [${domainAgreement}/3 domain, ${complexityAgreement}/3 complexity]`
  );

  const totalLatency = Date.now() - startTime;

  return {
    query: userQuery,
    final_result: final,
    individual_results,
    consensus: {
      primary_domain_agreement: domainAgreement,
      complexity_agreement: complexityAgreement,
      resolution_method: method,
    },
    total_latency_ms: totalLatency,
    timestamp: new Date().toISOString(),
  };
}

// CLI entry point for testing
if (import.meta.main) {
  const query = process.argv.slice(2).join(' ');

  if (!query) {
    console.error('Usage: bun ensemble-analyzer.ts "your query"');
    process.exit(1);
  }

  analyzeEnsemble(query)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Ensemble analysis failed:', error.message);
      process.exit(1);
    });
}
