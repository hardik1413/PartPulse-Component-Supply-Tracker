/**
 * MPN Normalizer
 * Normalizes manufacturer part numbers for deterministic matching
 * without destroying the original displayed value.
 */

export interface NormalizedMpnResult {
  original: string;
  normalized: string;
  baseCore: string;
  hasReelOrPackagingSuffix: boolean;
  packagingSuffix?: string;
}

// Common distributor or packaging suffixes that shouldn't prevent base MPN matching
const PACKAGING_SUFFIXES = [
  /-(?:TR|T&R|REEL|TAPE|CUT|CT|ND|1-ND|DKR-ND|CT-ND)$/i,
  /#PBF$/i,
  /#TRPBF$/i,
  /-ND$/i,
  /-R$/i,
  /-REEL$/i,
  /-T$/i,
  /\+T$/i,
];

/**
 * Normalizes an MPN for matching.
 * - Uppercase
 * - Strips non-alphanumeric characters (dashes, slashes, spaces, underscores, dots)
 * - Retains alphanumeric characters
 */
export function normalizeMpn(rawMpn: string): string {
  if (!rawMpn) return '';
  return rawMpn
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Detailed MPN normalization including base core and packaging suffix removal
 */
export function analyzeMpn(rawMpn: string): NormalizedMpnResult {
  const original = (rawMpn || '').trim();
  let baseCandidate = original;
  let hasReelOrPackagingSuffix = false;
  let detectedSuffix: string | undefined;

  for (const pattern of PACKAGING_SUFFIXES) {
    if (pattern.test(baseCandidate)) {
      hasReelOrPackagingSuffix = true;
      const match = baseCandidate.match(pattern);
      if (match) {
        detectedSuffix = match[0];
      }
      baseCandidate = baseCandidate.replace(pattern, '');
      break;
    }
  }

  const normalized = normalizeMpn(original);
  const baseCore = normalizeMpn(baseCandidate);

  return {
    original,
    normalized,
    baseCore,
    hasReelOrPackagingSuffix,
    packagingSuffix: detectedSuffix,
  };
}

/**
 * Deterministic comparison between two MPNs
 * Returns 1.0 for exact normalized match, 0.9 for base-core match (packaging variance),
 * or lower for partial match.
 */
export function compareMpns(mpn1: string, mpn2: string): {
  match: boolean;
  score: number;
  reason: 'EXACT' | 'BASE_CORE_MATCH' | 'PREFIX_MATCH' | 'NO_MATCH';
} {
  const norm1 = normalizeMpn(mpn1);
  const norm2 = normalizeMpn(mpn2);

  if (!norm1 || !norm2) {
    return { match: false, score: 0, reason: 'NO_MATCH' };
  }

  // Exact normalized match
  if (norm1 === norm2) {
    return { match: true, score: 1.0, reason: 'EXACT' };
  }

  // Base core match (ignoring reel/packaging variations like -TR or -ND)
  const analysis1 = analyzeMpn(mpn1);
  const analysis2 = analyzeMpn(mpn2);

  if (analysis1.baseCore && analysis1.baseCore === analysis2.baseCore) {
    return { match: true, score: 0.95, reason: 'BASE_CORE_MATCH' };
  }

  // Prefix match (one is a variant prefix of the other, length >= 6)
  if (norm1.length >= 6 && norm2.length >= 6) {
    if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) {
      return { match: false, score: 0.75, reason: 'PREFIX_MATCH' };
    }
  }

  return { match: false, score: 0, reason: 'NO_MATCH' };
}
