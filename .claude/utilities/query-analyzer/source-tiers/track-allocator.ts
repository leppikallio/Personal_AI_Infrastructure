/**
 * Track Allocator
 * Part of M10: Source Quality Framework
 *
 * Allocates research perspectives to tracks (standard/independent/contrarian)
 */

import { DEFAULT_TRACK_ALLOCATION, type PerspectiveTrack, type TrackAllocation } from './types';

export interface PerspectiveWithTrack {
  perspectiveText: string;
  perspectiveIndex: number;
  track: PerspectiveTrack;
  sourceGuidance: string;
}

/**
 * Allocate perspectives to research tracks based on configured ratios
 *
 * @param perspectives - Array of perspective texts
 * @param config - Track allocation ratios (default: 50/25/25)
 * @returns Array of perspectives with track assignments
 */
export function allocatePerspectivesToTracks(
  perspectives: string[],
  config: TrackAllocation = DEFAULT_TRACK_ALLOCATION
): PerspectiveWithTrack[] {
  const total = perspectives.length;

  // Calculate counts for each track
  const standardCount = Math.floor(total * config.standard);
  const independentCount = Math.floor(total * config.independent);
  // Contrarian gets the remainder to handle rounding
  const _contrarianCount = total - standardCount - independentCount;

  // Assign tracks to perspectives
  const result: PerspectiveWithTrack[] = perspectives.map((text, index) => {
    let track: PerspectiveTrack;
    let sourceGuidance: string;

    if (index < standardCount) {
      track = 'standard';
      sourceGuidance = 'Use any source tier. Balance breadth with authority.';
    } else if (index < standardCount + independentCount) {
      track = 'independent';
      sourceGuidance =
        'STRONGLY prefer Tier 1 sources. Avoid Tier 3 unless necessary. NEVER use Tier 4.';
    } else {
      track = 'contrarian';
      sourceGuidance = 'Actively seek opposing viewpoints. Find critics and skeptics.';
    }

    return {
      perspectiveText: text,
      perspectiveIndex: index,
      track,
      sourceGuidance,
    };
  });

  return result;
}

/**
 * Get detailed source guidance for a track
 */
export function getTrackSourceGuidance(track: PerspectiveTrack): string {
  switch (track) {
    case 'standard':
      return `## Your Research Track: STANDARD

**Source Strategy:**
- Use any source tier that provides quality information
- Prioritize depth and accuracy
- Include both vendor and independent sources
- Balance breadth with authoritative sources

**Source Tier Reference:**
- Tier 1 (Independent): Academic, standards, researchers
- Tier 2 (Quasi-Independent): Associations, news, non-profits
- Tier 3 (Vendor): Product vendors, platforms - acceptable
- Tier 4 (Suspect): SEO farms - use with caution`;

    case 'independent':
      return `## Your Research Track: INDEPENDENT

**Source Strategy:**
- STRONGLY prefer Tier 1 sources (academic, standards, researchers)
- Tier 2 acceptable when Tier 1 unavailable
- AVOID Tier 3 (vendor) unless absolutely necessary
- NEVER use Tier 4 (suspect/SEO)

**Where to Look:**
- Academic databases (arxiv, ACM, IEEE)
- Standards body publications (NIST, ISO, OWASP)
- Independent researcher blogs
- Conference proceedings (Black Hat, DEF CON)
- Peer-reviewed journals`;

    case 'contrarian':
      return `## Your Research Track: CONTRARIAN

**Source Strategy:**
- Seek sources that DISAGREE with mainstream narrative
- Find critics, skeptics, and alternative perspectives
- Look for "what could go wrong" analyses
- Identify marginalized voices in vendor-dominated discourse

**Search Strategies:**
- Add "criticism", "problems", "fails" to searches
- Search for "[topic] skeptics", "[topic] overhyped"
- Look for academic rebuttals
- Find failure case studies`;
  }
}

/**
 * Calculate track distribution summary
 */
export function getTrackDistribution(allocations: PerspectiveWithTrack[]): {
  standard: number;
  independent: number;
  contrarian: number;
  percentages: { standard: string; independent: string; contrarian: string };
} {
  const counts = { standard: 0, independent: 0, contrarian: 0 };
  allocations.forEach((a) => counts[a.track]++);

  const total = allocations.length;
  return {
    ...counts,
    percentages: {
      standard: `${((counts.standard / total) * 100).toFixed(0)}%`,
      independent: `${((counts.independent / total) * 100).toFixed(0)}%`,
      contrarian: `${((counts.contrarian / total) * 100).toFixed(0)}%`,
    },
  };
}
