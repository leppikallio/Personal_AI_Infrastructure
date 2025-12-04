/**
 * Perspective-First Routing - Option B (Fast + Fallback)
 *
 * Generates research perspectives from a query, classifies each perspective,
 * validates with keyword analysis, and triggers ensemble only when uncertain.
 *
 * Architecture (AD-005):
 * 1. Single LLM call generates perspectives + classifications
 * 2. Keyword validation as instant sanity check
 * 3. Selective ensemble only when LLM/keyword disagree or confidence < threshold
 *
 * Typical: 1-4 API calls, 3-5 seconds
 * Worst case: 1 + (N × 3) where N = mismatched perspectives
 */

import { DOMAIN_AGENT_MAP } from './domain-keywords.ts';
import { analyzeEnsemble } from './ensemble-analyzer.ts';
import { analyzeKeyword } from './keyword-query-analyzer.ts';
import { getValidToken } from './oauth-client.ts';
import type {
  AgentAllocation,
  AgentType,
  ComplexityLevel,
  DomainName,
  EnhancedPerspective,
  PerspectiveAnalysisResult,
  PerspectiveConfig,
  PerspectiveValidation,
  PlatformRequirement,
  ResearchPerspective,
} from './types.ts';
import { VALID_PLATFORMS } from './types.ts';

// Re-export default config
export { DEFAULT_PERSPECTIVE_CONFIG } from './types.ts';

/**
 * LLM prompt for generating perspectives + classifications in a single call
 */
const PERSPECTIVE_PROMPT = `You are an expert research query analyst. Given a research query, generate multiple research perspectives that cover different angles of investigation.

Each perspective should:
1. Represent a distinct research angle/facet
2. Be classified into ONE primary domain
3. Have an appropriate specialist agent assigned

**Domains:**
- social_media: X/Twitter, Reddit, community discussions, trending topics, public opinion
- academic: Research papers, scholarly articles, peer-reviewed studies, citations
- technical: Code, APIs, implementation, tools, frameworks, system architecture
- multimodal: Videos, images, visual content, diagrams, YouTube tutorials
- security: OSINT, threat intelligence, vulnerabilities, cybersecurity
- news: Current events, breaking news, latest developments

**Agent Mapping:**
- social_media → grok-researcher (native X/Twitter access)
- academic → perplexity-researcher (deep search, citations)
- technical → claude-researcher (technical analysis)
- multimodal → gemini-researcher (video, visual content)
- security → perplexity-researcher (threat intel research)
- news → perplexity-researcher (current events)

**CRITICAL**: Your response MUST be valid JSON only. No markdown code blocks.

**Output Format** (JSON only):
{
  "perspectives": [
    {
      "text": "<perspective description - what to research>",
      "domain": "<primary domain>",
      "confidence": <0-100>,
      "recommendedAgent": "<agent-type>",
      "rationale": "<why this perspective is relevant>",
      "platforms": [
        { "name": "<platform>", "reason": "<why this platform for this perspective>" }
      ]
    }
  ],
  "overall_complexity": "<SIMPLE|MODERATE|COMPLEX>",
  "time_sensitive": <true|false>,
  "reasoning": "<brief explanation of perspective choices>"
}

**Platforms** (select 1-3 per perspective):
- x: Developer discussions, real-time reactions, breaking news, AI community
- linkedin: Enterprise/B2B discussions, professional insights, hiring trends
- bluesky: AI/tech community migration, researcher discussions
- github: Code, implementations, issues, discussions, repos
- reddit: Community discussions, deep technical threads
- arxiv: Academic papers, research foundations, preprints
- youtube: Tutorials, demos, conference talks, visual content
- hackernews: Tech community sentiment, startup news, engineering culture

**Rules:**
- Generate 4-8 perspectives depending on query complexity
- SIMPLE queries: 4 perspectives
- MODERATE queries: 5-6 perspectives
- COMPLEX queries: 6-8 perspectives
- Each perspective gets ONE domain classification
- Each perspective MUST include 1-3 relevant platforms with reasoning
- Platform selection should match the specific angle of investigation
- Confidence reflects how certain you are about the domain classification
- Ensure diverse perspectives covering different angles
- Time-sensitive if query contains "latest", "current", "trending", "2025", "today"

**Examples:**

Query: "Research AI agents for enterprise productivity"
→ 6 perspectives:
  1. "Technical architectures and frameworks" → technical, claude-researcher, platforms: [github, reddit]
  2. "Enterprise adoption challenges and ROI" → academic, perplexity-researcher, platforms: [arxiv, linkedin]
  3. "Market landscape and vendor comparison" → news, perplexity-researcher, platforms: [hackernews]
  4. "Academic research on agent reasoning" → academic, perplexity-researcher, platforms: [arxiv]
  5. "User experience and workflow integration" → multimodal, gemini-researcher, platforms: [youtube]
  6. "Community discussions and practitioner insights" → social_media, grok-researcher, platforms: [x, bluesky, reddit]

Query: "What's trending on Twitter about AI?"
→ 4 perspectives:
  1. "Current trending discussions and hashtags" → social_media, grok-researcher, platforms: [x]
  2. "Technical developments driving discussions" → technical, claude-researcher, platforms: [github, hackernews]
  3. "News and announcements being shared" → news, perplexity-researcher, platforms: [hackernews]
  4. "Visual content and memes being shared" → multimodal, gemini-researcher, platforms: [x, youtube]`;

/**
 * Perspective Generator class
 */
export class PerspectiveGenerator {
  private config: PerspectiveConfig;
  private useOAuth: boolean;
  private apiKey: string | null = null;

  constructor(config: Partial<PerspectiveConfig> = {}) {
    // Import default config from types
    const defaults: PerspectiveConfig = {
      minPerspectives: 4,
      maxPerspectives: 8,
      ensembleThreshold: 70,
      backupThreshold: 75,
      ensembleOnMismatch: true,
      model: 'claude-haiku-4-5',
      temperature: 0.4,
      timeoutMs: 15000,
    };
    this.config = { ...defaults, ...config };

    // Determine auth method
    this.useOAuth = !process.env.ANTHROPIC_API_KEY;
    if (!this.useOAuth) {
      this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    }
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }
    return await getValidToken();
  }

  /**
   * Build headers for API request
   */
  private buildHeaders(token: string, useBearer: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };

    if (useBearer) {
      headers.Authorization = `Bearer ${token}`;
      headers['anthropic-beta'] = 'oauth-2025-04-20';
    } else {
      headers['x-api-key'] = token;
    }

    return headers;
  }

  /**
   * Generate perspectives using single LLM call
   */
  async generatePerspectives(userQuery: string): Promise<{
    perspectives: ResearchPerspective[];
    overallComplexity: ComplexityLevel;
    timeSensitive: boolean;
    reasoning: string;
  }> {
    const token = await this.getAuthToken();
    const headers = this.buildHeaders(token, this.useOAuth);

    const requestBody = {
      model: this.config.model,
      max_tokens: 2000,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: `${PERSPECTIVE_PROMPT}\n\nQuery to analyze: "${userQuery}"`,
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorBody}`);
      }

      const responseData = await response.json();
      const content = responseData.content[0];

      if (content.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }

      let responseText = content.text.trim();

      // Strip markdown code blocks if present
      if (responseText.startsWith('```')) {
        const match = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
        if (match) {
          responseText = match[1].trim();
        }
      }

      const parsed = JSON.parse(responseText);

      // Validate and transform perspectives (now includes platforms - AD-006)
      const perspectives: EnhancedPerspective[] = parsed.perspectives.map((p: any) => ({
        text: String(p.text),
        domain: this.validateDomain(p.domain),
        confidence: Math.min(100, Math.max(0, Number(p.confidence) || 70)),
        recommendedAgent: this.validateAgent(p.recommendedAgent),
        rationale: String(p.rationale || ''),
        platforms: this.validatePlatforms(p.platforms || []),
      }));

      return {
        perspectives,
        overallComplexity: this.validateComplexity(parsed.overall_complexity),
        timeSensitive: Boolean(parsed.time_sensitive),
        reasoning: String(parsed.reasoning || ''),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Perspective generation timeout after ${this.config.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Validate perspective against keyword analysis
   */
  validatePerspective(perspective: ResearchPerspective): PerspectiveValidation {
    // Run keyword analysis on the perspective text
    const keywordResult = analyzeKeyword(perspective.text);
    const keywordDomain = keywordResult.primary_domain;

    // Check if domains match
    const domainMatch = perspective.domain === keywordDomain;

    // Adjust confidence based on match
    let adjustedConfidence = perspective.confidence;
    if (domainMatch) {
      // Match boosts confidence
      adjustedConfidence = Math.min(100, adjustedConfidence + 10);
    } else {
      // Mismatch penalizes confidence
      adjustedConfidence = Math.max(0, adjustedConfidence - 20);
    }

    // Determine if ensemble is needed
    const needsEnsemble =
      (!domainMatch && this.config.ensembleOnMismatch) ||
      adjustedConfidence < this.config.ensembleThreshold;

    // Determine backup agent if confidence is low
    let backupAgent: AgentType | undefined;
    if (adjustedConfidence < this.config.backupThreshold) {
      // Use a general-purpose agent as backup
      backupAgent = 'perplexity-researcher';
    }

    return {
      perspective,
      keywordDomain,
      domainMatch,
      adjustedConfidence,
      needsEnsemble,
      backupAgent,
    };
  }

  /**
   * Run ensemble analysis on uncertain perspectives
   */
  async resolveUncertainPerspectives(
    validations: PerspectiveValidation[]
  ): Promise<PerspectiveValidation[]> {
    const results: PerspectiveValidation[] = [];

    for (const validation of validations) {
      if (validation.needsEnsemble) {
        console.error(
          `  🔄 Running ensemble for: "${validation.perspective.text.substring(0, 50)}..."`
        );

        try {
          // Run ensemble on this perspective
          const ensembleResult = await analyzeEnsemble(validation.perspective.text);

          // Use ensemble's primary domain
          const ensembleDomain = ensembleResult.final_result.primary_domain;

          // Update the validation with ensemble results
          const updatedValidation: PerspectiveValidation = {
            ...validation,
            perspective: {
              ...validation.perspective,
              domain: ensembleDomain,
              recommendedAgent: DOMAIN_AGENT_MAP[ensembleDomain],
            },
            keywordDomain: ensembleDomain, // Ensemble is authoritative
            domainMatch: true, // Ensemble resolves the conflict
            adjustedConfidence: Math.min(
              100,
              validation.adjustedConfidence + 15 // Ensemble boosts confidence
            ),
            needsEnsemble: false, // Resolved
          };

          results.push(updatedValidation);
        } catch (error) {
          console.error(`  ⚠️ Ensemble failed, keeping original: ${error}`);
          results.push({
            ...validation,
            needsEnsemble: false, // Mark as resolved even if failed
          });
        }
      } else {
        results.push(validation);
      }
    }

    return results;
  }

  /**
   * Calculate agent allocation from validated perspectives
   */
  calculateAgentAllocation(validations: PerspectiveValidation[]): AgentAllocation {
    const allocation: AgentAllocation = {
      'perplexity-researcher': 0,
      'claude-researcher': 0,
      'gemini-researcher': 0,
      'grok-researcher': 0,
    };

    for (const validation of validations) {
      const agent = validation.perspective.recommendedAgent;
      allocation[agent]++;

      // Add backup agent if present
      if (validation.backupAgent && validation.backupAgent !== agent) {
        allocation[validation.backupAgent]++;
      }
    }

    return allocation;
  }

  /**
   * Full perspective-first analysis
   */
  async analyze(userQuery: string): Promise<PerspectiveAnalysisResult> {
    console.error('🎯 Starting perspective-first analysis...');

    // Step 1: Generate perspectives (single LLM call)
    console.error('  📝 Generating perspectives...');
    const { perspectives, overallComplexity, timeSensitive, reasoning } =
      await this.generatePerspectives(userQuery);
    console.error(`  ✅ Generated ${perspectives.length} perspectives`);

    // Step 2: Validate each perspective with keyword analysis
    console.error('  🔍 Validating perspectives with keyword analysis...');
    let validations = perspectives.map((p) => this.validatePerspective(p));

    const mismatchCount = validations.filter((v) => !v.domainMatch).length;
    const lowConfidenceCount = validations.filter(
      (v) => v.adjustedConfidence < this.config.ensembleThreshold
    ).length;
    console.error(`  📊 ${mismatchCount} mismatches, ${lowConfidenceCount} low confidence`);

    // Step 3: Run ensemble on uncertain perspectives (selective)
    const ensembleNeeded = validations.filter((v) => v.needsEnsemble);
    const ensembleTriggered: string[] = [];

    if (ensembleNeeded.length > 0) {
      console.error(`  🔄 Running ensemble on ${ensembleNeeded.length} uncertain perspectives...`);
      ensembleNeeded.forEach((v) => ensembleTriggered.push(v.perspective.text));
      validations = await this.resolveUncertainPerspectives(validations);
    } else {
      console.error('  ✅ All perspectives validated, no ensemble needed');
    }

    // Step 4: Calculate agent allocation
    const agentAllocation = this.calculateAgentAllocation(validations);

    // Step 5: Calculate overall confidence
    const overallConfidence =
      validations.reduce((sum, v) => sum + v.adjustedConfidence, 0) / validations.length;

    console.error(`  ✅ Analysis complete (confidence: ${Math.round(overallConfidence)}%)`);

    return {
      query: userQuery,
      perspectives,
      validatedPerspectives: validations,
      overallComplexity,
      timeSensitive,
      agentAllocation,
      ensembleTriggered,
      perspectiveCount: perspectives.length,
      analyzer_used: 'perspective-first',
      overallConfidence: Math.round(overallConfidence),
      reasoning,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validation helpers
   */
  private validateDomain(domain: any): DomainName {
    const validDomains: DomainName[] = [
      'social_media',
      'academic',
      'technical',
      'multimodal',
      'security',
      'news',
    ];
    if (!validDomains.includes(domain)) {
      return 'technical'; // Default fallback
    }
    return domain;
  }

  private validateAgent(agent: any): AgentType {
    const validAgents: AgentType[] = [
      'perplexity-researcher',
      'claude-researcher',
      'gemini-researcher',
      'grok-researcher',
    ];
    if (!validAgents.includes(agent)) {
      return 'perplexity-researcher'; // Default fallback
    }
    return agent;
  }

  private validateComplexity(complexity: any): ComplexityLevel {
    const valid: ComplexityLevel[] = ['SIMPLE', 'MODERATE', 'COMPLEX'];
    if (!valid.includes(complexity)) {
      return 'MODERATE'; // Default fallback
    }
    return complexity;
  }

  /**
   * Validate platforms array (AD-006)
   * Filters to only valid platform names and ensures proper structure
   */
  private validatePlatforms(platforms: any[]): PlatformRequirement[] {
    if (!Array.isArray(platforms)) {
      return [];
    }

    return platforms
      .filter((p: any) => p && typeof p.name === 'string')
      .map((p: any) => ({
        name: VALID_PLATFORMS.includes(p.name.toLowerCase() as any)
          ? p.name.toLowerCase()
          : 'unknown',
        reason: String(p.reason || ''),
      }))
      .filter((p: PlatformRequirement) => p.name !== 'unknown');
  }
}

/**
 * Convenience function for one-off perspective analysis
 */
export async function analyzePerspectives(
  userQuery: string,
  config?: Partial<PerspectiveConfig>
): Promise<PerspectiveAnalysisResult> {
  const generator = new PerspectiveGenerator(config);
  return generator.analyze(userQuery);
}
