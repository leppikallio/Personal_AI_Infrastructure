/**
 * Pivot Decision Engine
 *
 * 5-component decision matrix for Wave 2 launch:
 * 1. Agent Quality Assessment - Poor scores trigger retries/specialists
 * 2. Domain Signal Detection - Strong signals trigger specialists
 * 3. Coverage Gap Analysis - Multiple gaps trigger fill specialists
 * 4. Platform Coverage Validation (AD-008) - Uncovered perspectives trigger specialists
 * 5. Source Quality (M10) - Imbalanced sources trigger rebalancing agents
 *
 * Aggregates recommendations and makes final Wave 2 launch decision.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { SourceQualityReport } from '../query-analyzer/source-tiers/types.ts';
import type { AgentType, EnhancedPerspective } from '../query-analyzer/types.ts';
import type {
  AgentQualityAggregate,
  CoverageGapAnalysis,
  DomainSignalAnalysis,
  PivotDecision,
  PivotDecisionConfig,
  SpecialistRecommendation,
} from './types.ts';
import { DEFAULT_PIVOT_CONFIG } from './types.ts';

// ============================================================================
// COMPONENT ANALYSIS
// ============================================================================

/**
 * Analyze Component 1: Agent Quality
 *
 * Decision rules:
 * - ANY score <40: CRITICAL - retry/replace agent
 * - AVG score <60: Consider Wave 2
 * - AVG score ≥60: Quality acceptable
 *
 * @param quality - Agent quality aggregate
 * @param config - Pivot decision configuration
 * @returns Component analysis result
 */
function analyzeQuality(
  quality: AgentQualityAggregate,
  config: PivotDecisionConfig
): PivotDecision['components']['quality'] {
  const recommendations: SpecialistRecommendation[] = [];
  let triggered = false;
  let reason = 'All agents met quality threshold';

  // Check for failed agents (<40)
  if (quality.failedAgents.length > 0) {
    triggered = true;
    reason = `${quality.failedAgents.length} agent(s) scored below ${config.retryThreshold} (retry threshold)`;

    for (const agentId of quality.failedAgents) {
      const agentScore = quality.scores.find((s) => s.agentId === agentId);
      if (agentScore) {
        recommendations.push({
          agentType: agentScore.agentType,
          track: agentScore.track,
          focus: `Retry/replacement for low-quality agent: ${agentId} (score: ${agentScore.totalScore})`,
          platforms: [],
          rationale: `Agent ${agentId} scored ${agentScore.totalScore}/100, below retry threshold (${config.retryThreshold})`,
          priority: 'CRITICAL',
          source: 'quality_failure',
        });
      }
    }
  }

  // Check average quality
  if (quality.averageScore < config.wave2ConsiderationThreshold) {
    if (!triggered) {
      triggered = true;
      reason = `Average quality ${quality.averageScore}/100 below Wave 2 threshold (${config.wave2ConsiderationThreshold})`;
    } else {
      reason += ` and average quality ${quality.averageScore}/100 is low`;
    }
  }

  return {
    triggered,
    reason,
    failedAgents: quality.failedAgents,
    recommendations,
  };
}

/**
 * Analyze Component 2: Domain Signals
 *
 * Decision rules:
 * - Strength ≥150: HIGH - launch 3 specialists
 * - Strength 100-149: MEDIUM - launch 2 specialists
 * - Strength 50-99: LOW - launch 1 specialist
 *
 * @param signals - Domain signal analysis
 * @param config - Pivot decision configuration
 * @returns Component analysis result
 */
function analyzeDomainSignals(
  signals: DomainSignalAnalysis,
  config: PivotDecisionConfig
): PivotDecision['components']['domainSignals'] {
  const recommendations: SpecialistRecommendation[] = [];
  let triggered = false;
  let reason = 'No strong domain signals detected';
  const strongSignals = signals.signals.filter((s) => s.strength >= config.mediumSignalThreshold);

  if (strongSignals.length > 0) {
    triggered = true;
    reason = `${strongSignals.length} strong domain signal(s) detected`;

    // Convert domain signal recommendations to specialist recommendations
    for (const rec of signals.recommendations) {
      recommendations.push({
        agentType: rec.agentType,
        track: 'standard',
        focus: `${rec.domain} specialist: ${rec.rationale}`,
        platforms: [],
        rationale: rec.rationale,
        priority: rec.priority,
        source: 'domain_signal',
      });
    }
  }

  return {
    triggered,
    reason,
    strongSignals,
    recommendations,
  };
}

/**
 * Analyze Component 3: Coverage Gaps
 *
 * Decision rules:
 * - ≥2 HIGH priority gaps: Launch specialists
 * - ≥3 MEDIUM priority gaps: Launch specialists
 * - Otherwise: No action
 *
 * @param gaps - Coverage gap analysis
 * @param config - Pivot decision configuration
 * @returns Component analysis result
 */
function analyzeCoverageGaps(
  gaps: CoverageGapAnalysis,
  config: PivotDecisionConfig
): PivotDecision['components']['coverageGaps'] {
  const recommendations: SpecialistRecommendation[] = [];
  let triggered = false;
  let reason = 'No critical coverage gaps';
  const criticalGaps = gaps.highPriorityGaps;

  if (criticalGaps.length >= config.gapCountThreshold || gaps.mediumPriorityGaps.length >= 3) {
    triggered = true;
    reason = `${criticalGaps.length} HIGH priority gap(s) and ${gaps.mediumPriorityGaps.length} MEDIUM priority gap(s)`;

    // Convert gap recommendations to specialist recommendations
    for (const rec of gaps.recommendations) {
      if (!rec.agentType || !rec.track) continue;

      recommendations.push({
        agentType: rec.agentType,
        track: rec.track,
        focus: rec.focus,
        platforms: [],
        rationale: `Coverage gap: ${rec.gap}`,
        priority: 'HIGH',
        source: 'coverage_gap',
      });
    }
  }

  return {
    triggered,
    reason,
    criticalGaps,
    recommendations,
  };
}

/**
 * Analyze Component 4: Platform Coverage (AD-008)
 *
 * Decision rules:
 * - ANY uncovered perspective: Launch specialists
 * - Otherwise: No action
 *
 * @param platformCoverage - Platform coverage validation result
 * @param config - Pivot decision configuration
 * @returns Component analysis result
 */
function analyzePlatformCoverage(
  platformCoverage: {
    uncoveredPerspectives: string[];
    recommendations: SpecialistRecommendation[];
    triggered: boolean;
    reason: string;
  },
  _config: PivotDecisionConfig
): PivotDecision['components']['platformCoverage'] {
  return {
    triggered: platformCoverage.triggered,
    reason: platformCoverage.reason,
    uncoveredPerspectives: platformCoverage.uncoveredPerspectives,
    recommendations: platformCoverage.recommendations,
  };
}

/**
 * Analyze Component 5: Source Quality (M10)
 *
 * Decision rules:
 * - Vendor % >40%: Rebalancing agents needed
 * - Independent % <10%: Independent track agents needed
 * - Tier 4 >0: Quality concerns
 *
 * @param sourceQuality - Source quality report (if available)
 * @param config - Pivot decision configuration
 * @returns Component analysis result
 */
async function analyzeSourceQuality(
  sessionDir: string,
  wave: 1 | 2,
  config: PivotDecisionConfig
): Promise<PivotDecision['components']['sourceQuality']> {
  const recommendations: SpecialistRecommendation[] = [];
  let triggered = false;
  let reason = 'Source quality not evaluated (M10 file not found)';
  const qualityGate = null;

  // Try to load source quality report
  const sourceQualityPath = `${sessionDir}/analysis/wave-${wave}-source-quality.json`;

  if (!existsSync(sourceQualityPath)) {
    return {
      triggered: false,
      reason,
      qualityGate: null,
      recommendations: [],
    };
  }

  try {
    const content = await readFile(sourceQualityPath, 'utf-8');
    const sourceQuality: SourceQualityReport = JSON.parse(content);

    // Check vendor percentage
    if (sourceQuality.vendorPercentage > config.vendorPercentageThreshold) {
      triggered = true;
      reason = `Vendor sources ${sourceQuality.vendorPercentage}% > ${config.vendorPercentageThreshold}% threshold`;

      recommendations.push({
        agentType: 'perplexity-researcher',
        track: 'independent',
        focus: 'Independent source rebalancing (academic, standards)',
        platforms: ['arxiv'],
        rationale: `Vendor source percentage (${sourceQuality.vendorPercentage}%) exceeds threshold`,
        priority: 'HIGH',
        source: 'source_imbalance',
      });
    }

    // Check independent percentage
    if (sourceQuality.independentPercentage < config.independentMinimum) {
      if (!triggered) {
        triggered = true;
        reason = `Independent sources ${sourceQuality.independentPercentage}% < ${config.independentMinimum}% minimum`;
      } else {
        reason += ` and independent sources ${sourceQuality.independentPercentage}% too low`;
      }

      recommendations.push({
        agentType: 'perplexity-researcher',
        track: 'independent',
        focus: 'Independent track: academic papers, standards, peer-reviewed sources',
        platforms: ['arxiv'],
        rationale: `Independent source percentage (${sourceQuality.independentPercentage}%) below minimum`,
        priority: 'HIGH',
        source: 'source_imbalance',
      });
    }

    if (!triggered) {
      reason = 'Source quality acceptable';
    }
  } catch (error) {
    console.error(`Failed to load source quality: ${error}`);
  }

  return {
    triggered,
    reason,
    qualityGate,
    recommendations,
  };
}

// ============================================================================
// SPECIALIST AGGREGATION
// ============================================================================

/**
 * Deduplicate and prioritize specialist recommendations
 *
 * Rules:
 * - CRITICAL priority wins
 * - Same agent type + track → merge into single recommendation
 * - Combine rationales
 *
 * @param recommendations - All specialist recommendations
 * @returns Deduplicated and prioritized recommendations
 */
function aggregateSpecialists(
  recommendations: SpecialistRecommendation[]
): SpecialistRecommendation[] {
  const grouped = new Map<string, SpecialistRecommendation>();

  for (const rec of recommendations) {
    const key = `${rec.agentType}-${rec.track}`;
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, rec);
    } else {
      // Merge: highest priority wins, combine rationales
      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
      const existingPriority = priorities.indexOf(existing.priority);
      const newPriority = priorities.indexOf(rec.priority);

      if (newPriority < existingPriority) {
        existing.priority = rec.priority;
      }

      // Combine rationales
      if (!existing.rationale.includes(rec.rationale)) {
        existing.rationale += `; ${rec.rationale}`;
      }

      // Merge platforms
      for (const platform of rec.platforms) {
        if (!existing.platforms.includes(platform)) {
          existing.platforms.push(platform);
        }
      }

      // Combine focus
      if (!existing.focus.includes(rec.focus)) {
        existing.focus += ` | ${rec.focus}`;
      }
    }
  }

  // Sort by priority
  const sorted = Array.from(grouped.values()).sort((a, b) => {
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
    return priorities.indexOf(a.priority) - priorities.indexOf(b.priority);
  });

  return sorted;
}

/**
 * Calculate agent allocation from specialists
 *
 * @param specialists - Specialist recommendations
 * @returns Agent allocation map
 */
function calculateAllocation(specialists: SpecialistRecommendation[]): Record<AgentType, number> {
  const allocation: Record<AgentType, number> = {
    'perplexity-researcher': 0,
    'claude-researcher': 0,
    'gemini-researcher': 0,
    'grok-researcher': 0,
  };

  for (const specialist of specialists) {
    allocation[specialist.agentType]++;
  }

  return allocation;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Make pivot decision based on all 5 components
 *
 * @param input - Quality analysis input data
 * @param config - Optional pivot decision configuration
 * @returns Pivot decision result
 */
export async function makePivotDecision(
  input: {
    sessionDir: string;
    wave: 1 | 2;
    quality: AgentQualityAggregate;
    domainSignals: DomainSignalAnalysis;
    coverageGaps: CoverageGapAnalysis;
    platformCoverage: {
      uncoveredPerspectives: string[];
      recommendations: SpecialistRecommendation[];
      triggered: boolean;
      reason: string;
    };
  },
  config: PivotDecisionConfig = DEFAULT_PIVOT_CONFIG
): Promise<PivotDecision> {
  console.log('🎯 Making pivot decision...');

  // Analyze each component
  const qualityAnalysis = analyzeQuality(input.quality, config);
  const domainSignalAnalysis = analyzeDomainSignals(input.domainSignals, config);
  const coverageGapAnalysis = analyzeCoverageGaps(input.coverageGaps, config);
  const platformCoverageAnalysis = analyzePlatformCoverage(input.platformCoverage, config);
  const sourceQualityAnalysis = await analyzeSourceQuality(input.sessionDir, input.wave, config);

  // Collect all recommendations
  const allRecommendations: SpecialistRecommendation[] = [
    ...qualityAnalysis.recommendations,
    ...domainSignalAnalysis.recommendations,
    ...coverageGapAnalysis.recommendations,
    ...platformCoverageAnalysis.recommendations,
    ...sourceQualityAnalysis.recommendations,
  ];

  // Aggregate and deduplicate
  const specialists = aggregateSpecialists(allRecommendations);
  const specialistAllocation = calculateAllocation(specialists);

  // Determine if Wave 2 should launch
  const anyTriggered =
    qualityAnalysis.triggered ||
    domainSignalAnalysis.triggered ||
    coverageGapAnalysis.triggered ||
    platformCoverageAnalysis.triggered ||
    sourceQualityAnalysis.triggered;

  const shouldLaunchWave2 = anyTriggered && specialists.length > 0;

  // Calculate confidence
  let confidence = 0;
  const triggeredComponents = [
    qualityAnalysis.triggered,
    domainSignalAnalysis.triggered,
    coverageGapAnalysis.triggered,
    platformCoverageAnalysis.triggered,
    sourceQualityAnalysis.triggered,
  ].filter(Boolean).length;

  if (triggeredComponents === 0) {
    confidence = 10; // Low confidence - nothing triggered
  } else if (triggeredComponents === 1) {
    confidence = 60; // Moderate confidence - single component
  } else if (triggeredComponents === 2) {
    confidence = 80; // High confidence - two components agree
  } else {
    confidence = 95; // Very high confidence - 3+ components agree
  }

  // Build rationale
  const rationale: string[] = [];
  if (qualityAnalysis.triggered) rationale.push(`Quality: ${qualityAnalysis.reason}`);
  if (domainSignalAnalysis.triggered) rationale.push(`Signals: ${domainSignalAnalysis.reason}`);
  if (coverageGapAnalysis.triggered) rationale.push(`Gaps: ${coverageGapAnalysis.reason}`);
  if (platformCoverageAnalysis.triggered)
    rationale.push(`Platforms: ${platformCoverageAnalysis.reason}`);
  if (sourceQualityAnalysis.triggered) rationale.push(`Sources: ${sourceQualityAnalysis.reason}`);

  if (!shouldLaunchWave2) {
    rationale.push('Wave 1 coverage is sufficient - no Wave 2 needed');
  }

  // Generate Wave 2 perspectives (placeholder - would be filled by orchestrator)
  const perspectives: EnhancedPerspective[] = [];

  console.log('\n📊 Pivot Decision Summary:');
  console.log(`   Launch Wave 2: ${shouldLaunchWave2 ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${confidence}%`);
  console.log(`   Triggered components: ${triggeredComponents}/5`);
  console.log(`   Specialists: ${specialists.length}`);
  if (specialists.length > 0) {
    console.log(
      `   Allocation: ${Object.entries(specialistAllocation)
        .filter(([_, count]) => count > 0)
        .map(([agent, count]) => `${agent}=${count}`)
        .join(', ')}`
    );
  }

  return {
    shouldLaunchWave2,
    confidence,
    rationale,
    specialists,
    specialistAllocation,
    perspectives,
    components: {
      quality: qualityAnalysis,
      domainSignals: domainSignalAnalysis,
      coverageGaps: coverageGapAnalysis,
      platformCoverage: platformCoverageAnalysis,
      sourceQuality: sourceQualityAnalysis,
    },
  };
}
