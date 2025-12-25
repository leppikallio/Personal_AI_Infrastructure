/**
 * Platform Coverage Validator (AD-008)
 *
 * Validates that research agents searched expected platforms for each perspective.
 * Integrates with existing AD-008 platform coverage validation system.
 *
 * Triggers Wave 2 when perspectives have 0% platform coverage (no expected platforms searched).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { EnhancedPerspective, PlatformCoverageResult } from '../query-analyzer/types.ts';
import type { SpecialistRecommendation } from './types.ts';

// ============================================================================
// PLATFORM COVERAGE VALIDATION
// ============================================================================

/**
 * Load platform coverage result from file
 *
 * @param sessionDir - Session directory path
 * @param wave - Wave number (1 or 2)
 * @returns Platform coverage result or null if file doesn't exist
 */
async function loadPlatformCoverage(
  sessionDir: string,
  wave: 1 | 2
): Promise<PlatformCoverageResult | null> {
  const filePath = `${sessionDir}/analysis/wave-${wave}-platform-coverage.json`;

  if (!existsSync(filePath)) {
    console.warn(`⚠️ Platform coverage file not found: ${filePath}`);
    return null;
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const result: PlatformCoverageResult = JSON.parse(content);
    return result;
  } catch (error) {
    console.error(`❌ Failed to load platform coverage: ${error}`);
    return null;
  }
}

/**
 * Validate platform coverage and identify uncovered perspectives
 *
 * @param coverage - Platform coverage result
 * @returns Uncovered perspective texts and recommendations
 */
function validateCoverage(coverage: PlatformCoverageResult): {
  uncoveredPerspectives: string[];
  recommendations: SpecialistRecommendation[];
  triggered: boolean;
  reason: string;
} {
  const uncoveredPerspectives: string[] = [];
  const recommendations: SpecialistRecommendation[] = [];

  // Find perspectives with no platform coverage
  for (const perspCov of coverage.perspectiveCoverage) {
    if (!perspCov.coverage_met) {
      uncoveredPerspectives.push(perspCov.perspective);

      // Generate specialist recommendation based on potential insights
      const recommendation: SpecialistRecommendation = {
        agentType: inferAgentFromInsights(perspCov.potential_insights),
        track: 'standard',
        focus: `Platform coverage gap: ${perspCov.perspective}`,
        platforms: perspCov.platforms_missed,
        rationale: `Perspective "${perspCov.perspective}" had 0% platform coverage (expected: ${perspCov.platforms_expected.join(', ')}, searched: none). Potential insights: ${perspCov.potential_insights}`,
        priority: 'HIGH',
        source: 'platform_gap',
      };

      recommendations.push(recommendation);
    }
  }

  const triggered = uncoveredPerspectives.length > 0;
  const reason = triggered
    ? `${uncoveredPerspectives.length} perspective(s) have 0% platform coverage (no expected platforms searched)`
    : 'All perspectives have adequate platform coverage';

  return {
    uncoveredPerspectives,
    recommendations,
    triggered,
    reason,
  };
}

/**
 * Infer best agent type from potential insights text
 *
 * Heuristics:
 * - LinkedIn/professional → perplexity-researcher
 * - Academic/papers → perplexity-researcher
 * - Code/GitHub → claude-researcher
 * - Video/YouTube → gemini-researcher
 * - X/Twitter → grok-researcher
 *
 * @param insights - Potential insights text
 * @returns Recommended agent type
 */
function inferAgentFromInsights(insights: string): SpecialistRecommendation['agentType'] {
  const lower = insights.toLowerCase();

  if (lower.includes('linkedin') || lower.includes('professional')) {
    return 'perplexity-researcher';
  }

  if (lower.includes('arxiv') || lower.includes('academic') || lower.includes('paper')) {
    return 'perplexity-researcher';
  }

  if (lower.includes('github') || lower.includes('code') || lower.includes('implementation')) {
    return 'claude-researcher';
  }

  if (lower.includes('youtube') || lower.includes('video') || lower.includes('visual')) {
    return 'gemini-researcher';
  }

  if (lower.includes('twitter') || lower.includes('x.com') || lower.includes('social')) {
    return 'grok-researcher';
  }

  // Default to perplexity for general research
  return 'perplexity-researcher';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate platform coverage for a wave
 *
 * @param sessionDir - Session directory path
 * @param wave - Wave number (1 or 2)
 * @returns Validation result with recommendations
 */
export async function validatePlatformCoverage(
  sessionDir: string,
  wave: 1 | 2
): Promise<{
  coverage: PlatformCoverageResult | null;
  uncoveredPerspectives: string[];
  recommendations: SpecialistRecommendation[];
  triggered: boolean;
  reason: string;
}> {
  console.log(`🔍 Validating platform coverage for Wave ${wave}...`);

  // Load platform coverage result
  const coverage = await loadPlatformCoverage(sessionDir, wave);

  if (!coverage) {
    console.warn('⚠️ Platform coverage validation skipped (file not found)');
    return {
      coverage: null,
      uncoveredPerspectives: [],
      recommendations: [],
      triggered: false,
      reason: 'Platform coverage file not found (AD-008 not run)',
    };
  }

  // Validate coverage
  const validation = validateCoverage(coverage);

  console.log('✅ Platform coverage validation complete');
  console.log(`   Overall coverage: ${coverage.overallCoveragePercent}%`);
  console.log(`   Uncovered perspectives: ${validation.uncoveredPerspectives.length}`);

  if (validation.triggered) {
    console.warn('⚠️ Wave 2 triggered by platform coverage gaps');
    for (const persp of validation.uncoveredPerspectives) {
      console.warn(`   - ${persp}`);
    }
  }

  return {
    coverage,
    ...validation,
  };
}

/**
 * Generate specialist recommendations for uncovered perspectives
 *
 * This is a convenience function for generating Wave 2 perspectives
 * based on platform coverage gaps.
 *
 * @param coverage - Platform coverage result
 * @returns Enhanced perspectives for Wave 2
 */
export function generatePlatformSpecialists(
  coverage: PlatformCoverageResult
): EnhancedPerspective[] {
  const perspectives: EnhancedPerspective[] = [];

  for (const perspCov of coverage.perspectiveCoverage) {
    if (!perspCov.coverage_met) {
      // Infer domain from platform recommendations
      let domain: EnhancedPerspective['domain'] = 'technical'; // Default
      const missedPlatforms = perspCov.platforms_missed.join(' ').toLowerCase();

      if (missedPlatforms.includes('linkedin')) domain = 'social_media';
      else if (missedPlatforms.includes('arxiv')) domain = 'academic';
      else if (missedPlatforms.includes('github')) domain = 'technical';
      else if (missedPlatforms.includes('youtube')) domain = 'multimodal';
      else if (missedPlatforms.includes('x') || missedPlatforms.includes('twitter'))
        domain = 'social_media';

      const agentType = inferAgentFromInsights(perspCov.potential_insights);

      perspectives.push({
        text: perspCov.perspective,
        domain,
        confidence: 85, // High confidence for platform gap fill
        recommendedAgent: agentType,
        rationale: `Platform coverage gap: ${perspCov.platforms_expected.join(', ')} not searched`,
        platforms: perspCov.platforms_missed.map((name) => ({
          name,
          reason: 'Missing from Wave 1 coverage for this perspective',
        })),
      });
    }
  }

  return perspectives;
}
