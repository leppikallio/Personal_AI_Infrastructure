/**
 * LLM-based semantic query analyzer using Claude Haiku
 *
 * Provides semantic understanding of research queries to determine:
 * - Domain relevance (social_media, academic, technical, multimodal, security, news)
 * - Query complexity (SIMPLE, MODERATE, COMPLEX)
 * - Wave 1 agent allocation (4-6 agents)
 * - Expected pivot scenarios
 *
 * Target accuracy: 93-95% (vs 86% keyword-based)
 * Latency: 500-1000ms
 * Cost: ~$0.005/query
 */

// Using fetch directly instead of Anthropic SDK for OAuth Bearer token support
import { getValidToken } from './oauth-client.ts';
import type {
  AgentAllocation,
  ComplexityLevel,
  DomainName,
  DomainScores,
  ExpectedPivot,
  LLMAnalyzerConfig,
  QueryAnalysisResult,
} from './types.ts';

const DEFAULT_CONFIG: LLMAnalyzerConfig = {
  apiKey: '', // OAuth will provide token dynamically
  model: 'claude-haiku-4-5',
  temperature: 0.3,
  maxTokens: 2000,
  timeoutMs: 10000,
};

/**
 * Analysis prompt for Claude Haiku
 *
 * Instructs the model to analyze queries semantically and return structured JSON
 */
const ANALYSIS_PROMPT = `You are a query analysis expert for a multi-agent research system. Analyze the user's research query and determine:

1. **Domain Relevance** (score 0-100 for each):
   - social_media: X/Twitter, Reddit, community discussions, trending topics, public opinion
   - academic: Research papers, scholarly articles, peer-reviewed studies, citations
   - technical: Code, APIs, implementation, tools, frameworks, system architecture
   - multimodal: Videos, images, visual content, diagrams, YouTube tutorials
   - security: OSINT, threat intelligence, vulnerabilities, cybersecurity, pentesting
   - news: Current events, breaking news, latest developments, announcements

2. **Complexity Level**:
   - SIMPLE: Focused, single-domain query (4 agents)
   - MODERATE: Multi-faceted query or moderate depth (5 agents)
   - COMPLEX: Multi-domain or deep technical query (6 agents)

3. **Agent Allocation Strategy**:
   - perplexity-researcher: Academic research, threat intel, deep search
   - claude-researcher: Technical analysis, implementation details, architecture
   - gemini-researcher: Multimodal content, videos, visual materials
   - grok-researcher: X/Twitter native access, social media insights

4. **Expected Pivots**: Predict likely Wave 2 specialist needs based on query composition

**CRITICAL**: Your response MUST be valid JSON only. No markdown code blocks, no explanations outside JSON.

**Output Format** (JSON only):
{
  "domain_scores": {
    "social_media": <0-100>,
    "academic": <0-100>,
    "technical": <0-100>,
    "multimodal": <0-100>,
    "security": <0-100>,
    "news": <0-100>
  },
  "primary_domain": "<domain_name>",
  "secondary_domains": ["<domain1>", "<domain2>"],
  "complexity": "<SIMPLE|MODERATE|COMPLEX>",
  "wave1_agent_count": <4|5|6>,
  "wave1_agent_allocation": {
    "perplexity-researcher": <count>,
    "claude-researcher": <count>,
    "gemini-researcher": <count>,
    "grok-researcher": <count>
  },
  "expected_pivots": [
    {
      "scenario": "<description>",
      "likely_pivot": "<domain_name|multiple|minimal>",
      "trigger": "<what Wave 1 finding would cause this>",
      "wave2_specialists": "<agent types and counts>",
      "confidence": "<HIGH|MODERATE|LOW>"
    }
  ],
  "reasoning": "<brief explanation of your analysis>",
  "llm_confidence": <0-100>
}

**Allocation Rules**:
- Primary domain specialist: ~35% of agents (round appropriately)
- Maintain diversity: No single agent type should exceed 50%
- Total agents must match wave1_agent_count
- At least 3 different agent types for MODERATE/COMPLEX queries

**Examples**:

Query: "Research OSINT tools for threat intelligence"
→ Security: 75, Technical: 65, Academic: 40
→ COMPLEX (multi-domain, deep technical)
→ 6 agents: 2 perplexity (security), 2 claude (technical), 1 gemini, 1 grok

Query: "What's trending on Twitter about AI agents?"
→ Social Media: 85, Technical: 50, Academic: 20
→ MODERATE (social focus with technical context)
→ 5 agents: 2 grok (social), 1 claude (technical), 1 perplexity, 1 gemini

Query: "Explain React server components implementation"
→ Technical: 90, Multimodal: 30, Academic: 10
→ MODERATE (focused technical with potential tutorial content)
→ 5 agents: 2 claude (technical), 1 gemini (tutorials), 1 perplexity, 1 grok`;

export class LLMQueryAnalyzer {
  private config: LLMAnalyzerConfig;
  private useOAuth: boolean;
  private apiKey: string | null = null;

  constructor(config: Partial<LLMAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Determine auth method:
    // 1. If apiKey provided in config, use it (API key mode)
    // 2. If ANTHROPIC_API_KEY env var exists, use it (API key mode)
    // 3. Otherwise, use OAuth (OAuth mode)
    this.useOAuth = !this.config.apiKey && !process.env.ANTHROPIC_API_KEY;

    if (!this.useOAuth) {
      // API key mode - store key for later use
      this.apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    }
  }

  /**
   * Get auth token (either API key or OAuth token)
   */
  private async getAuthToken(): Promise<string> {
    if (this.apiKey) {
      return this.apiKey;
    }

    // OAuth mode - get token
    return await getValidToken();
  }

  /**
   * Build headers for Anthropic API request
   */
  private buildHeaders(token: string, useBearer: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'User-Agent': 'ai-sdk/anthropic',
    };

    if (useBearer) {
      // OAuth mode - use Bearer token
      headers.Authorization = `Bearer ${token}`;
      headers['anthropic-beta'] = 'oauth-2025-04-20';
    } else {
      // API key mode - use x-api-key header
      headers['x-api-key'] = token;
    }

    return headers;
  }

  /**
   * Analyze query using Claude Haiku semantic understanding
   *
   * @param userQuery - The research query to analyze
   * @returns Promise<QueryAnalysisResult> - Structured analysis result
   * @throws Error if LLM call fails or response is invalid
   */
  async analyze(userQuery: string): Promise<QueryAnalysisResult> {
    try {
      // Get auth token (OAuth or API key)
      const token = await this.getAuthToken();

      // Build headers based on auth method
      const headers = this.buildHeaders(token, this.useOAuth);

      // Build request body
      const requestBody = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: `${ANALYSIS_PROMPT}\n\nQuery to analyze: "${userQuery}"`,
          },
        ],
      };

      // Make API request using fetch
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
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        const responseData = await response.json();

        // Extract text content from response
        const content = responseData.content[0];
        if (content.type !== 'text') {
          throw new Error('Expected text response from Claude');
        }

        let responseText = content.text.trim();

        // Strip markdown code blocks if present (```json ... ```)
        if (responseText.startsWith('```')) {
          const codeBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (codeBlockMatch) {
            responseText = codeBlockMatch[1].trim();
          }
        }

        // Parse JSON response
        let parsedResponse: any;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (_parseError) {
          throw new Error(
            `Failed to parse LLM response as JSON: ${responseText.substring(0, 200)}`
          );
        }

        // Validate and construct result
        const result: QueryAnalysisResult = {
          query: userQuery,
          domain_scores: this.validateDomainScores(parsedResponse.domain_scores),
          primary_domain: this.validateDomainName(parsedResponse.primary_domain),
          secondary_domains: this.validateSecondaryDomains(parsedResponse.secondary_domains),
          complexity: this.validateComplexity(parsedResponse.complexity),
          wave1_agent_count: this.validateAgentCount(parsedResponse.wave1_agent_count),
          wave1_agent_allocation: this.validateAgentAllocation(
            parsedResponse.wave1_agent_allocation,
            parsedResponse.wave1_agent_count
          ),
          expected_pivots: this.validateExpectedPivots(parsedResponse.expected_pivots),
          reasoning: parsedResponse.reasoning || 'No reasoning provided',
          analyzer_used: 'llm',
          llm_confidence: parsedResponse.llm_confidence || 80,
          timestamp: new Date().toISOString(),
        };

        return result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeoutMs}ms`);
        }
        throw fetchError;
      }
    } catch (error) {
      // Wrap and rethrow for fallback handling
      if (error instanceof Error) {
        throw new Error(`LLM analysis failed: ${error.message}`);
      }
      throw new Error('LLM analysis failed with unknown error');
    }
  }

  /**
   * Validation helpers
   */

  private validateDomainScores(scores: any): DomainScores {
    const domains: DomainName[] = [
      'social_media',
      'academic',
      'technical',
      'multimodal',
      'security',
      'news',
    ];

    const result: Partial<DomainScores> = {};

    for (const domain of domains) {
      const score = scores[domain];
      if (typeof score !== 'number' || score < 0 || score > 100) {
        throw new Error(`Invalid domain score for ${domain}: ${score}`);
      }
      result[domain] = score;
    }

    return result as DomainScores;
  }

  private validateDomainName(domain: any): DomainName {
    const validDomains: DomainName[] = [
      'social_media',
      'academic',
      'technical',
      'multimodal',
      'security',
      'news',
    ];

    if (!validDomains.includes(domain)) {
      throw new Error(`Invalid primary domain: ${domain}`);
    }

    return domain;
  }

  private validateSecondaryDomains(domains: any): DomainName[] {
    if (!Array.isArray(domains)) {
      throw new Error('Secondary domains must be an array');
    }

    return domains.map((d) => this.validateDomainName(d));
  }

  private validateComplexity(complexity: any): ComplexityLevel {
    const validLevels: ComplexityLevel[] = ['SIMPLE', 'MODERATE', 'COMPLEX'];

    if (!validLevels.includes(complexity)) {
      throw new Error(`Invalid complexity level: ${complexity}`);
    }

    return complexity;
  }

  private validateAgentCount(count: any): 4 | 5 | 6 {
    if (![4, 5, 6].includes(count)) {
      throw new Error(`Invalid agent count: ${count}. Must be 4, 5, or 6.`);
    }

    return count;
  }

  private validateAgentAllocation(allocation: any, expectedTotal: number): AgentAllocation {
    const agents = [
      'perplexity-researcher',
      'claude-researcher',
      'gemini-researcher',
      'grok-researcher',
    ];

    const result: Partial<AgentAllocation> = {};
    let total = 0;

    for (const agent of agents) {
      const count = allocation[agent];
      if (typeof count !== 'number' || count < 0) {
        throw new Error(`Invalid agent count for ${agent}: ${count}`);
      }
      result[agent as keyof AgentAllocation] = count;
      total += count;
    }

    if (total !== expectedTotal) {
      throw new Error(
        `Agent allocation total (${total}) does not match expected count (${expectedTotal})`
      );
    }

    return result as AgentAllocation;
  }

  private validateExpectedPivots(pivots: any): ExpectedPivot[] {
    if (!Array.isArray(pivots)) {
      throw new Error('Expected pivots must be an array');
    }

    return pivots.map((pivot) => {
      if (!pivot.scenario || !pivot.likely_pivot || !pivot.trigger) {
        throw new Error('Invalid pivot structure: missing required fields');
      }

      return {
        scenario: String(pivot.scenario),
        likely_pivot: pivot.likely_pivot,
        trigger: String(pivot.trigger),
        wave2_specialists: String(pivot.wave2_specialists),
        confidence: pivot.confidence || 'MODERATE',
      };
    });
  }
}

/**
 * Convenience function for one-off LLM analysis
 */
export async function analyzeLLM(
  userQuery: string,
  config?: Partial<LLMAnalyzerConfig>
): Promise<QueryAnalysisResult> {
  const analyzer = new LLMQueryAnalyzer(config);
  return analyzer.analyze(userQuery);
}
