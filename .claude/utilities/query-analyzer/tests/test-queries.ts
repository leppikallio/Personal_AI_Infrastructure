/**
 * Test queries with expected outcomes
 *
 * Based on dry run testing from query-analyzer.md validation
 */

export interface TestQuery {
  id: string;
  query: string;
  expected: {
    primary_domain: 'social_media' | 'academic' | 'technical' | 'multimodal' | 'security' | 'news';
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
    wave1_agent_count: 4 | 5 | 6;
    primary_specialist:
      | 'perplexity-researcher'
      | 'claude-researcher'
      | 'gemini-researcher'
      | 'grok-researcher';
    min_agent_diversity: number; // Minimum different agent types
  };
  notes?: string;
}

export const TEST_QUERIES: TestQuery[] = [
  {
    id: 'OSINT-001',
    query: 'Research OSINT tools for threat intelligence',
    expected: {
      primary_domain: 'security',
      complexity: 'COMPLEX',
      wave1_agent_count: 6,
      primary_specialist: 'perplexity-researcher',
      min_agent_diversity: 3,
    },
    notes:
      'Security domain with technical and academic secondary. High probability of social media pivot.',
  },

  {
    id: 'TECH-001',
    query: 'Explain React server components implementation',
    expected: {
      primary_domain: 'technical',
      complexity: 'MODERATE',
      wave1_agent_count: 5,
      primary_specialist: 'claude-researcher',
      min_agent_diversity: 3,
    },
    notes: 'Pure technical query. Minimal pivots expected, possibly multimodal for tutorials.',
  },

  {
    id: 'SOCIAL-001',
    query: "What's trending on Twitter about AI agents?",
    expected: {
      primary_domain: 'social_media',
      complexity: 'MODERATE',
      wave1_agent_count: 5,
      primary_specialist: 'grok-researcher',
      min_agent_diversity: 3,
    },
    notes:
      'Social media dominant with technical secondary. Minimal pivots (already in target domain).',
  },

  {
    id: 'MULTI-001',
    query: 'Research quantum computing breakthroughs and public perception',
    expected: {
      primary_domain: 'academic',
      complexity: 'COMPLEX',
      wave1_agent_count: 6,
      primary_specialist: 'perplexity-researcher',
      min_agent_diversity: 4,
    },
    notes: 'Multi-domain query (academic + technical + social). High pivot probability.',
  },

  {
    id: 'NEWS-001',
    query: 'Latest developments in OpenAI leadership changes',
    expected: {
      primary_domain: 'news',
      complexity: 'MODERATE',
      wave1_agent_count: 5,
      primary_specialist: 'perplexity-researcher',
      min_agent_diversity: 3,
    },
    notes:
      'News primary but strong contextual social relevance. LLM should detect social better than keywords.',
  },

  {
    id: 'COMPARE-001',
    query: 'Compare Python vs JavaScript for backend development',
    expected: {
      primary_domain: 'technical',
      complexity: 'COMPLEX',
      wave1_agent_count: 6,
      primary_specialist: 'claude-researcher',
      min_agent_diversity: 3,
    },
    notes:
      'Technical comparison with academic secondary. Possible social pivot for developer opinions.',
  },

  {
    id: 'ACADEMIC-001',
    query: 'Latest research papers on transformer architecture improvements',
    expected: {
      primary_domain: 'academic',
      complexity: 'MODERATE',
      wave1_agent_count: 5,
      primary_specialist: 'perplexity-researcher',
      min_agent_diversity: 3,
    },
    notes: 'Pure academic query with technical secondary.',
  },

  {
    id: 'MULTIMODAL-001',
    query: 'Find video tutorials on Kubernetes deployment and architecture diagrams',
    expected: {
      primary_domain: 'multimodal',
      complexity: 'MODERATE',
      wave1_agent_count: 5,
      primary_specialist: 'gemini-researcher',
      min_agent_diversity: 3,
    },
    notes:
      'Multimodal primary with technical secondary. Gemini should dominate for video/visual content.',
  },
];

/**
 * Validation helper to check if result matches expectations
 */
export function validateResult(
  testQuery: TestQuery,
  result: any
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check primary domain
  if (result.primary_domain !== testQuery.expected.primary_domain) {
    errors.push(
      `Primary domain mismatch: expected ${testQuery.expected.primary_domain}, got ${result.primary_domain}`
    );
  }

  // Check complexity (allow some flexibility - LLM might assess differently)
  const complexityMap = { SIMPLE: 1, MODERATE: 2, COMPLEX: 3 };
  const expectedComplexity = complexityMap[testQuery.expected.complexity];
  const actualComplexity = complexityMap[result.complexity];
  const complexityDiff = Math.abs(expectedComplexity - actualComplexity);

  if (complexityDiff > 1) {
    errors.push(
      `Complexity mismatch: expected ${testQuery.expected.complexity}, got ${result.complexity} (difference > 1 level)`
    );
  }

  // Check agent count matches complexity
  if (result.wave1_agent_count !== testQuery.expected.wave1_agent_count) {
    // Allow ±1 agent for LLM flexibility
    const countDiff = Math.abs(result.wave1_agent_count - testQuery.expected.wave1_agent_count);
    if (countDiff > 1) {
      errors.push(
        `Agent count mismatch: expected ${testQuery.expected.wave1_agent_count}, got ${result.wave1_agent_count}`
      );
    }
  }

  // Check primary specialist has highest allocation
  const allocation = result.wave1_agent_allocation;
  const maxCount = Math.max(...Object.values(allocation));
  const primarySpecialistCount = allocation[testQuery.expected.primary_specialist];

  if (primarySpecialistCount < maxCount) {
    errors.push(
      `Primary specialist (${testQuery.expected.primary_specialist}) does not have highest allocation`
    );
  }

  // Check agent diversity
  const activeAgents = Object.values(allocation).filter((count: any) => count > 0).length;
  if (activeAgents < testQuery.expected.min_agent_diversity) {
    errors.push(
      `Agent diversity too low: expected at least ${testQuery.expected.min_agent_diversity} types, got ${activeAgents}`
    );
  }

  // Check allocation totals correctly
  const totalAllocated = Object.values(allocation).reduce(
    (sum: number, count: any) => sum + count,
    0
  );
  if (totalAllocated !== result.wave1_agent_count) {
    errors.push(
      `Allocation total (${totalAllocated}) does not match agent count (${result.wave1_agent_count})`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
