/**
 * Quality Analyzer Module Exports
 *
 * Public API for research quality analysis and pivot decision system.
 */

// Types
export type {
  AgentQualityScore,
  AgentQualityAggregate,
  QualityBand,
  AgentMetadata,
  DomainSignal,
  DomainSignalAnalysis,
  KeywordDictionaries,
  CoverageGap,
  CoverageGapAnalysis,
  SpecialistRecommendation,
  PivotDecision,
  PivotDecisionConfig,
  QualityAnalysisInput,
  QualityAnalysisOutput,
} from './types.ts';

export {
  DEFAULT_KEYWORD_DICTIONARIES,
  DEFAULT_PIVOT_CONFIG,
} from './types.ts';

// Agent Quality Scoring
export {
  scoreAgent,
  scoreAgents,
  scoreWave,
  calculateAggregate,
} from './agent-quality-scorer.ts';

// Domain Signal Detection
export {
  detectDomainSignals,
  detectWaveSignals,
} from './domain-signal-detector.ts';

// Coverage Gap Analysis
export {
  analyzeCoverageGaps,
  analyzeWaveGaps,
} from './coverage-gap-analyzer.ts';

// Platform Coverage Validation
export {
  validatePlatformCoverage,
  generatePlatformSpecialists,
} from './platform-coverage-validator.ts';

// Pivot Decision Engine
export { makePivotDecision } from './pivot-decision-engine.ts';
