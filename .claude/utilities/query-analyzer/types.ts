/**
 * TypeScript types for LLM-based semantic query analyzer
 *
 * Used by both LLM and keyword analyzers to ensure consistent output format
 */

export type DomainName =
  | 'social_media'
  | 'academic'
  | 'technical'
  | 'multimodal'
  | 'security'
  | 'news';

export type DomainScores = {
  [K in DomainName]: number;
};

export type ComplexityLevel = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

export type AgentType =
  | 'perplexity-researcher'
  | 'claude-researcher'
  | 'gemini-researcher'
  | 'grok-researcher';

export type AgentAllocation = {
  [K in AgentType]: number;
};

export interface ExpectedPivot {
  scenario: string;
  likely_pivot: DomainName | 'multiple' | 'minimal';
  trigger: string;
  wave2_specialists: string;
  confidence?: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface QueryAnalysisResult {
  query: string;
  domain_scores: DomainScores;
  primary_domain: DomainName;
  secondary_domains: DomainName[];
  complexity: ComplexityLevel;
  wave1_agent_count: 4 | 5 | 6;
  wave1_agent_allocation: AgentAllocation;
  expected_pivots: ExpectedPivot[];
  reasoning: string;
  analyzer_used: 'llm' | 'keyword';
  llm_confidence?: number;
  timestamp?: string;
}

export interface LLMAnalyzerConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export type AnalyzerSource = 'claude' | 'gemini' | 'keyword';

export interface EnsembleResult {
  query: string;
  final_result: QueryAnalysisResult;
  individual_results: {
    source: AnalyzerSource;
    result: QueryAnalysisResult | null;
    latency_ms: number;
    error?: string;
  }[];
  consensus: {
    primary_domain_agreement: number; // 1-3 models agreed
    complexity_agreement: number;
    resolution_method: 'unanimous' | 'majority' | 'weighted' | 'fallback';
  };
  total_latency_ms: number;
  timestamp: string;
}

export interface EnsembleConfig {
  runAllModels: boolean; // Always run all 3, or threshold-based
  minConfidenceForSingle: number; // If single model confidence >= this, skip others
  geminiModel: string; // Explicitly specify flash
  timeoutMs: number;
}

export interface KeywordDictionary {
  social_media: string[];
  academic: string[];
  technical: string[];
  multimodal: string[];
  security: string[];
  news: string[];
}

export interface DomainAgentMap {
  social_media: AgentType;
  academic: AgentType;
  technical: AgentType;
  multimodal: AgentType;
  security: AgentType;
  news: AgentType;
}

// ============================================================================
// PERSPECTIVE-FIRST ROUTING TYPES (Option B - Fast + Fallback)
// ============================================================================

/**
 * A research perspective generated from the original query
 * Each perspective represents a specific angle/facet to investigate
 */
export interface ResearchPerspective {
  /** The perspective text (e.g., "Technical implementation approaches") */
  text: string;
  /** Primary domain classification from LLM */
  domain: DomainName;
  /** LLM confidence in this classification (0-100) */
  confidence: number;
  /** Recommended agent type for this perspective */
  recommendedAgent: AgentType;
  /** Brief rationale for why this perspective is relevant */
  rationale: string;
}

/**
 * Result of keyword validation against LLM classification
 */
export interface PerspectiveValidation {
  /** The perspective being validated */
  perspective: ResearchPerspective;
  /** Domain detected by keyword analysis */
  keywordDomain: DomainName;
  /** Whether LLM and keyword domains match */
  domainMatch: boolean;
  /** Adjusted confidence after validation */
  adjustedConfidence: number;
  /** Whether this perspective needs ensemble deep analysis */
  needsEnsemble: boolean;
  /** Backup agent if confidence is low */
  backupAgent?: AgentType;
}

/**
 * Full perspective analysis result
 */
export interface PerspectiveAnalysisResult {
  /** Original query */
  query: string;
  /** Generated perspectives with classifications */
  perspectives: ResearchPerspective[];
  /** Validated perspectives with keyword sanity check */
  validatedPerspectives: PerspectiveValidation[];
  /** Overall query complexity */
  overallComplexity: ComplexityLevel;
  /** Whether query is time-sensitive (bypasses some caching) */
  timeSensitive: boolean;
  /** Agent allocation based on perspective-to-agent mapping */
  agentAllocation: AgentAllocation;
  /** Perspectives that triggered ensemble fallback */
  ensembleTriggered: string[];
  /** Total perspectives generated */
  perspectiveCount: number;
  /** Analysis method used */
  analyzer_used: 'perspective-first';
  /** Overall confidence in the analysis */
  overallConfidence: number;
  /** Reasoning for the analysis */
  reasoning: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Configuration for perspective generation
 */
export interface PerspectiveConfig {
  /** Minimum perspectives to generate */
  minPerspectives: number;
  /** Maximum perspectives to generate */
  maxPerspectives: number;
  /** Confidence threshold below which ensemble is triggered */
  ensembleThreshold: number;
  /** Confidence threshold below which backup agent is added */
  backupThreshold: number;
  /** Whether to run ensemble on mismatched perspectives */
  ensembleOnMismatch: boolean;
  /** LLM model to use for perspective generation */
  model: string;
  /** Temperature for LLM (lower = more deterministic) */
  temperature: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Default configuration for perspective generation
 */
export const DEFAULT_PERSPECTIVE_CONFIG: PerspectiveConfig = {
  minPerspectives: 4,
  maxPerspectives: 8,
  ensembleThreshold: 70,
  backupThreshold: 75,
  ensembleOnMismatch: true,
  model: 'claude-haiku-4-5',
  temperature: 0.4,
  timeoutMs: 15000,
};

// ============================================================================
// PLATFORM COVERAGE TYPES (AD-006, AD-007, AD-008)
// ============================================================================

/**
 * Platform requirement for a research perspective
 * Each perspective reasons about WHERE to find that specific angle
 */
export interface PlatformRequirement {
  /** Platform name (e.g., "x", "linkedin", "bluesky", "github", "reddit", "arxiv") */
  name: string;
  /** Why this platform for this specific perspective */
  reason: string;
}

/**
 * Valid platform names for research
 */
export const VALID_PLATFORMS = [
  'x',
  'linkedin',
  'bluesky',
  'github',
  'reddit',
  'arxiv',
  'youtube',
  'hackernews',
] as const;

export type PlatformName = (typeof VALID_PLATFORMS)[number];

/**
 * Enhanced perspective with platform requirements (AD-006)
 * Extends ResearchPerspective with WHERE information
 */
export interface EnhancedPerspective extends ResearchPerspective {
  /** Platforms where this perspective's information is likely found */
  platforms: PlatformRequirement[];
}

/**
 * Coverage tracking per perspective (AD-008)
 */
export interface PerspectiveCoverage {
  /** The perspective text */
  perspective: string;
  /** Platforms expected to be searched */
  platforms_expected: string[];
  /** Platforms actually searched by agent */
  platforms_searched: string[];
  /** Platforms not searched */
  platforms_missed: string[];
  /** True if at least 1 expected platform was searched */
  coverage_met: boolean;
  /** Notes for human judgment on potential follow-up */
  potential_insights: string;
}

/**
 * Full platform coverage analysis result
 */
export interface PlatformCoverageResult {
  /** Coverage per perspective */
  perspectiveCoverage: PerspectiveCoverage[];
  /** Overall coverage percentage */
  overallCoveragePercent: number;
  /** Perspectives with no platform coverage (Wave 2 trigger) */
  uncoveredPerspectives: string[];
  /** Recommendations for follow-up research */
  recommendations: string[];
}
