/**
 * Comprehensive Unit Tests for Tier Classifier
 * Part of M10: Source Quality Framework
 *
 * Tests all functions: extractDomain, classifyDomain, classifyMultiple, getTierCategory
 * Covers: URL parsing, tier classification, subdomain matching, edge cases, statistics
 */

import { describe, expect, test } from 'bun:test';
import {
  classifyDomain,
  classifyMultiple,
  extractDomain,
  getTierCategory,
} from './tier-classifier';

// ============================================================================
// DOMAIN EXTRACTION TESTS
// ============================================================================

describe('extractDomain', () => {
  test('extracts domain from full HTTPS URL', () => {
    expect(extractDomain('https://arxiv.org/abs/123')).toBe('arxiv.org');
  });

  test('extracts domain from HTTP URL', () => {
    expect(extractDomain('http://example.com/page')).toBe('example.com');
  });

  test('removes www prefix', () => {
    expect(extractDomain('https://www.github.com')).toBe('github.com');
  });

  test('handles bare domain', () => {
    expect(extractDomain('arxiv.org')).toBe('arxiv.org');
  });

  test('handles protocol-relative URL', () => {
    expect(extractDomain('//medium.com/article')).toBe('medium.com');
  });

  test('handles invalid URL gracefully', () => {
    const result = extractDomain('not a url');
    expect(result).toBeDefined(); // Should not throw
  });

  test('handles empty string', () => {
    const result = extractDomain('');
    expect(result).toBe(''); // Returns empty string
  });

  test('normalizes to lowercase', () => {
    expect(extractDomain('https://ArXiv.ORG')).toBe('arxiv.org');
  });

  test('handles URL with path and query parameters', () => {
    expect(extractDomain('https://github.com/user/repo?tab=readme')).toBe('github.com');
  });

  test('handles subdomain with www', () => {
    expect(extractDomain('https://www.blog.example.com')).toBe('blog.example.com');
  });

  test('handles domain with port', () => {
    expect(extractDomain('https://localhost:8080/page')).toBe('localhost');
  });

  test('handles complex URL with hash', () => {
    expect(extractDomain('https://example.com/page#section')).toBe('example.com');
  });
});

// ============================================================================
// TIER 1 CLASSIFICATION TESTS (Independent)
// ============================================================================

describe('classifyDomain - Tier 1 (Independent)', () => {
  test('classifies arxiv.org as tier1', () => {
    const result = classifyDomain('https://arxiv.org/abs/123');
    expect(result.tier).toBe('tier1_independent');
    expect(result.confidence).toBe('known');
    expect(result.category).toBe('academic');
  });

  test('classifies nist.gov as tier1', () => {
    const result = classifyDomain('https://nist.gov/publications');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('standards');
  });

  test('classifies schneier.com as tier1', () => {
    const result = classifyDomain('https://schneier.com/blog');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('researcher');
  });

  test('classifies IEEE as tier1', () => {
    const result = classifyDomain('https://ieeexplore.ieee.org/document/123');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('academic');
  });

  test('classifies nature.com as tier1', () => {
    const result = classifyDomain('https://nature.com/articles/xyz');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('academic');
  });

  test('classifies wired.com as tier1', () => {
    const result = classifyDomain('https://wired.com/story/tech-article');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('journalism');
  });

  test('classifies krebsonsecurity.com as tier1', () => {
    const result = classifyDomain('https://krebsonsecurity.com/2024/01/article');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('researcher');
  });

  test('classifies OWASP as tier1', () => {
    const result = classifyDomain('https://owasp.org/www-project-top-ten/');
    expect(result.tier).toBe('tier1_independent');
    expect(result.category).toBe('standards');
  });
});

// ============================================================================
// TIER 2 CLASSIFICATION TESTS (Quasi-Independent)
// ============================================================================

describe('classifyDomain - Tier 2 (Quasi-Independent)', () => {
  test('classifies github.com as tier2', () => {
    const result = classifyDomain('https://github.com/repo');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.category).toBe('community');
  });

  test('classifies darkreading.com as tier2', () => {
    const result = classifyDomain('https://darkreading.com/article');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.category).toBe('quasi_independent'); // No specific pattern match
  });

  test('classifies stackoverflow.com as tier2', () => {
    const result = classifyDomain('https://stackoverflow.com/questions/123');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.category).toBe('community');
  });

  test('classifies bleepingcomputer.com as tier2', () => {
    const result = classifyDomain('https://bleepingcomputer.com/news/security/');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.category).toBe('news');
  });

  test('classifies mozilla.org as tier2', () => {
    const result = classifyDomain('https://mozilla.org/en-US/');
    expect(result.tier).toBe('tier2_quasi');
  });

  test('classifies eff.org as tier2', () => {
    const result = classifyDomain('https://eff.org/deeplinks/2024/01/article');
    expect(result.tier).toBe('tier2_quasi');
  });
});

// ============================================================================
// TIER 3 CLASSIFICATION TESTS (Vendor)
// ============================================================================

describe('classifyDomain - Tier 3 (Vendor)', () => {
  test('classifies crowdstrike.com as tier3', () => {
    const result = classifyDomain('https://crowdstrike.com/blog');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('security_vendor');
  });

  test('classifies aws.amazon.com as tier3', () => {
    const result = classifyDomain('https://aws.amazon.com/security');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('cloud_vendor');
  });

  test('classifies openai.com as tier3', () => {
    const result = classifyDomain('https://openai.com/research');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('ai_vendor');
  });

  test('classifies gartner.com as tier3', () => {
    const result = classifyDomain('https://gartner.com/en/research');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('consulting');
  });

  test('classifies paloaltonetworks.com as tier3', () => {
    const result = classifyDomain('https://paloaltonetworks.com/products');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('security_vendor');
  });

  test('classifies azure.microsoft.com as tier3', () => {
    const result = classifyDomain('https://azure.microsoft.com/en-us/');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('cloud_vendor');
  });

  test('classifies anthropic.com as tier3', () => {
    const result = classifyDomain('https://anthropic.com/research');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('ai_vendor');
  });

  test('classifies snyk.io as tier3', () => {
    const result = classifyDomain('https://snyk.io/blog');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.category).toBe('security_vendor');
  });
});

// ============================================================================
// TIER 4 CLASSIFICATION TESTS (Suspect)
// ============================================================================

describe('classifyDomain - Tier 4 (Suspect)', () => {
  test('classifies medium.com as tier4', () => {
    const result = classifyDomain('https://medium.com/@user/article');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('aggregator');
  });

  test('classifies techradar.com as tier4', () => {
    const result = classifyDomain('https://techradar.com/best/tools');
    expect(result.tier).toBe('tier4_suspect');
  });

  test('classifies geeksforgeeks.org as tier4', () => {
    const result = classifyDomain('https://geeksforgeeks.org/data-structures');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('tutorial_mill');
  });

  test('classifies quora.com as tier4', () => {
    const result = classifyDomain('https://quora.com/question/12345');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('user_generated');
  });

  test('classifies dev.to as tier4', () => {
    const result = classifyDomain('https://dev.to/user/article');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('aggregator');
  });

  test('classifies w3schools.com as tier4', () => {
    const result = classifyDomain('https://w3schools.com/html/');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('tutorial_mill');
  });

  test('classifies reddit.com as tier4', () => {
    const result = classifyDomain('https://reddit.com/r/programming');
    expect(result.tier).toBe('tier4_suspect');
    expect(result.category).toBe('user_generated');
  });
});

// ============================================================================
// DEFAULT CLASSIFICATION TESTS (Unknown Domains)
// ============================================================================

describe('classifyDomain - Default (Unknown domains)', () => {
  test('defaults unknown domain to tier2', () => {
    const result = classifyDomain('https://totally-unknown-site.xyz');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.confidence).toBe('default');
    expect(result.category).toBe('unknown');
  });

  test('defaults another unknown to tier2', () => {
    const result = classifyDomain('https://my-personal-blog.io');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.confidence).toBe('default');
  });

  test('defaults personal domain to tier2', () => {
    const result = classifyDomain('https://johndoe.com/blog');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.confidence).toBe('default');
  });
});

// ============================================================================
// SUBDOMAIN MATCHING TESTS
// ============================================================================

describe('classifyDomain - Subdomain matching', () => {
  test('matches blog.crowdstrike.com to crowdstrike.com', () => {
    const result = classifyDomain('https://blog.crowdstrike.com/article');
    expect(result.tier).toBe('tier3_vendor');
    expect(result.domain).toBe('blog.crowdstrike.com');
  });

  test('matches docs.github.com to github.com', () => {
    const result = classifyDomain('https://docs.github.com/en');
    expect(result.tier).toBe('tier2_quasi');
  });

  test('matches research.google.com subdomain', () => {
    const result = classifyDomain('https://research.google.com/pubs');
    expect(result).toBeDefined();
  });

  test('matches cloud.google.com to tier3', () => {
    const result = classifyDomain('https://cloud.google.com/security');
    expect(result.tier).toBe('tier3_vendor');
  });

  test('matches blog.openai.com to openai.com', () => {
    const result = classifyDomain('https://blog.openai.com/research');
    expect(result.tier).toBe('tier3_vendor');
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('classifyDomain - Edge cases', () => {
  test('handles empty string', () => {
    const result = classifyDomain('');
    expect(result.domain).toBe('');
    expect(result.tier).toBe('tier2_quasi');
    expect(result.confidence).toBe('default');
  });

  test('handles malformed URL', () => {
    const result = classifyDomain('htp:/broken-url');
    expect(result).toBeDefined();
    expect(result.tier).toBeDefined();
  });

  test('handles URL with special characters', () => {
    const result = classifyDomain('https://example.com/path?query=value&param=123#anchor');
    expect(result.domain).toBe('example.com');
  });

  test('handles bare domain without protocol', () => {
    const result = classifyDomain('crowdstrike.com');
    expect(result.tier).toBe('tier3_vendor');
  });

  test('handles URL with username and password', () => {
    const result = classifyDomain('https://user:pass@example.com/page');
    expect(result.domain).toBe('example.com');
  });
});

// ============================================================================
// CLASSIFY MULTIPLE TESTS
// ============================================================================

describe('classifyMultiple', () => {
  test('classifies multiple URLs and calculates statistics', () => {
    const urls = [
      'https://arxiv.org/abs/123', // tier1
      'https://github.com/repo', // tier2
      'https://crowdstrike.com/blog', // tier3
      'https://medium.com/article', // tier4
    ];

    const result = classifyMultiple(urls);

    expect(result.classifications).toHaveLength(4);
    expect(result.summary.total).toBe(4);
    expect(result.summary.byTier.tier1_independent).toBe(1);
    expect(result.summary.byTier.tier2_quasi).toBe(1);
    expect(result.summary.byTier.tier3_vendor).toBe(1);
    expect(result.summary.byTier.tier4_suspect).toBe(1);
  });

  test('calculates vendor percentage correctly', () => {
    const urls = [
      'https://crowdstrike.com', // tier3
      'https://paloaltonetworks.com', // tier3
      'https://arxiv.org', // tier1
      'https://github.com', // tier2
    ];

    const result = classifyMultiple(urls);
    expect(result.summary.vendorPercentage).toBe(0.5); // 2/4 = 0.5
  });

  test('calculates independent percentage correctly', () => {
    const urls = [
      'https://arxiv.org', // tier1
      'https://nist.gov', // tier1
      'https://github.com', // tier2
      'https://crowdstrike.com', // tier3
    ];

    const result = classifyMultiple(urls);
    expect(result.summary.independentPercentage).toBe(0.5); // 2/4 = 0.5
  });

  test('handles empty array', () => {
    const result = classifyMultiple([]);
    expect(result.classifications).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.vendorPercentage).toBe(0);
    expect(result.summary.independentPercentage).toBe(0);
  });

  test('handles all tier1 sources', () => {
    const urls = [
      'https://arxiv.org',
      'https://ieee.org',
      'https://schneier.com',
      'https://nist.gov',
    ];

    const result = classifyMultiple(urls);
    expect(result.summary.byTier.tier1_independent).toBe(4);
    expect(result.summary.independentPercentage).toBe(1.0);
    expect(result.summary.vendorPercentage).toBe(0);
  });

  test('handles all tier3 vendors', () => {
    const urls = [
      'https://crowdstrike.com',
      'https://aws.amazon.com',
      'https://openai.com',
      'https://gartner.com',
    ];

    const result = classifyMultiple(urls);
    expect(result.summary.byTier.tier3_vendor).toBe(4);
    expect(result.summary.vendorPercentage).toBe(1.0);
    expect(result.summary.independentPercentage).toBe(0);
  });

  test('handles mixed known and unknown domains', () => {
    const urls = [
      'https://arxiv.org', // tier1
      'https://unknown-site.xyz', // tier2 default
      'https://crowdstrike.com', // tier3
      'https://another-unknown.com', // tier2 default
    ];

    const result = classifyMultiple(urls);
    expect(result.summary.byTier.tier1_independent).toBe(1);
    expect(result.summary.byTier.tier2_quasi).toBe(2); // 2 defaults
    expect(result.summary.byTier.tier3_vendor).toBe(1);
  });

  test('handles duplicate URLs correctly', () => {
    const urls = ['https://arxiv.org', 'https://arxiv.org', 'https://arxiv.org'];

    const result = classifyMultiple(urls);
    expect(result.summary.total).toBe(3);
    expect(result.summary.byTier.tier1_independent).toBe(3);
  });
});

// ============================================================================
// GET TIER CATEGORY TESTS
// ============================================================================

describe('getTierCategory', () => {
  test('returns correct description for tier1', () => {
    const desc = getTierCategory('tier1_independent');
    expect(desc).toContain('Independent');
    expect(desc).toContain('academic');
  });

  test('returns correct description for tier2', () => {
    const desc = getTierCategory('tier2_quasi');
    expect(desc).toContain('Quasi-Independent');
    expect(desc).toContain('associations');
  });

  test('returns correct description for tier3', () => {
    const desc = getTierCategory('tier3_vendor');
    expect(desc).toContain('Vendor');
    expect(desc).toContain('product vendors');
  });

  test('returns correct description for tier4', () => {
    const desc = getTierCategory('tier4_suspect');
    expect(desc).toContain('Suspect');
    expect(desc).toContain('SEO');
  });
});

// ============================================================================
// INTEGRATION TESTS - Real-world scenarios
// ============================================================================

describe('Integration - Real-world scenarios', () => {
  test('scenario: AI security research mix', () => {
    const urls = [
      'https://arxiv.org/abs/2401.12345', // tier1 - academic
      'https://openai.com/research/alignment', // tier3 - vendor
      'https://anthropic.com/index/core-views', // tier3 - vendor
      'https://trailofbits.github.io/security', // tier1 - researcher (exact match)
      'https://medium.com/@security/ai-risks', // tier4 - aggregator
    ];

    const result = classifyMultiple(urls);

    expect(result.summary.total).toBe(5);
    expect(result.summary.byTier.tier1_independent).toBe(2);
    expect(result.summary.byTier.tier3_vendor).toBe(2);
    expect(result.summary.byTier.tier4_suspect).toBe(1);
    expect(result.summary.vendorPercentage).toBe(0.4); // 40%
  });

  test('scenario: Cybersecurity news mix', () => {
    const urls = [
      'https://krebsonsecurity.com/2024/01/breach', // tier1
      'https://darkreading.com/attacks/ransomware', // tier2
      'https://crowdstrike.com/blog/threat-intel', // tier3
      'https://bleepingcomputer.com/news/security', // tier2
      'https://techradar.com/best/antivirus', // tier4
    ];

    const result = classifyMultiple(urls);

    expect(result.summary.byTier.tier1_independent).toBe(1);
    expect(result.summary.byTier.tier2_quasi).toBe(2);
    expect(result.summary.byTier.tier3_vendor).toBe(1);
    expect(result.summary.byTier.tier4_suspect).toBe(1);
  });

  test('scenario: Cloud security documentation', () => {
    const urls = [
      'https://nist.gov/cyberframework', // tier1 - standards
      'https://aws.amazon.com/security/best', // tier3 - vendor
      'https://cloud.google.com/security/compliance', // tier3 - vendor
      'https://owasp.org/www-community/controls', // tier1 - standards
      'https://docs.microsoft.com/azure/security', // tier3 - vendor
    ];

    const result = classifyMultiple(urls);

    expect(result.summary.byTier.tier1_independent).toBe(2);
    expect(result.summary.byTier.tier3_vendor).toBe(3);
    expect(result.summary.vendorPercentage).toBe(0.6); // 60%
  });
});
