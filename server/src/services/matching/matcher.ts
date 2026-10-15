import { compareMpns, normalizeMpn } from './mpnNormalizer';
import { ComponentSpecs, VerificationStatus } from '../../../../shared/types';

export interface MatchCandidate {
  componentName: string;
  mpn: string;
  manufacturer?: string;
  specifications: ComponentSpecs;
}

export interface MatchResult {
  isMatch: boolean;
  isSubstitute: boolean;
  confidenceScore: number;
  verificationStatus: VerificationStatus;
  matchPriority: 1 | 2 | 3 | 4 | 5; // 1: Exact MPN, 2: Exact Mfg + MPN, 3: Name+Specs, 4: Substitute, 5: None
  reasons: string[];
  substituteNotes?: string[];
}

/**
 * Normalizes text string for relaxed specification comparison
 */
function normalizeSpecValue(val?: string | number): string {
  if (val === undefined || val === null) return '';
  return String(val).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Compares two sets of electronic component specifications.
 * Checks voltage, current, interface, package/footprint, operating temp, etc.
 */
export function compareSpecifications(
  target: ComponentSpecs,
  candidate: ComponentSpecs
): {
  compatible: boolean;
  score: number;
  matchedSpecs: string[];
  mismatchedSpecs: string[];
  missingSpecs: string[];
} {
  const matchedSpecs: string[] = [];
  const mismatchedSpecs: string[] = [];
  const missingSpecs: string[] = [];

  const relevantKeys: (keyof ComponentSpecs)[] = [
    'voltage',
    'current',
    'interface',
    'package',
    'operatingTemp',
    'mountingType',
    'pinCount',
    'dimensions',
  ];

  let totalComparable = 0;
  let matches = 0;

  for (const key of relevantKeys) {
    const targetVal = target[key];
    const candidateVal = candidate[key];

    if (targetVal && candidateVal) {
      totalComparable++;
      const normT = normalizeSpecValue(targetVal);
      const normC = normalizeSpecValue(candidateVal);

      if (normT === normC || normT.includes(normC) || normC.includes(normT)) {
        matches++;
        matchedSpecs.push(String(key));
      } else {
        mismatchedSpecs.push(String(key));
      }
    } else if (targetVal && !candidateVal) {
      missingSpecs.push(String(key));
    }
  }

  const score = totalComparable > 0 ? matches / totalComparable : 0;
  // Electrical/mechanical compatibility is only claimed if there are at least 2 matching specs and no hard mismatches
  const compatible = matches >= 2 && mismatchedSpecs.length === 0;

  return {
    compatible,
    score,
    matchedSpecs,
    mismatchedSpecs,
    missingSpecs,
  };
}

/**
 * Deterministic Component Matcher according to PartPulse priority:
 * 1. Exact manufacturer part number.
 * 2. Exact manufacturer and part number.
 * 3. Component name plus compatible technical specifications.
 * 
 * Separates direct matches from Potential Substitutes.
 */
export function matchComponent(
  query: {
    mpn: string;
    manufacturer?: string;
    componentName?: string;
    specifications?: ComponentSpecs;
  },
  candidate: MatchCandidate
): MatchResult {
  const reasons: string[] = [];
  const substituteNotes: string[] = [];

  // Check 1 & 2: MPN matching
  const mpnComp = compareMpns(query.mpn, candidate.mpn);

  const queryMfg = (query.manufacturer || '').trim().toLowerCase();
  const candMfg = (candidate.manufacturer || '').trim().toLowerCase();
  const mfgMatches = Boolean(queryMfg && candMfg && (queryMfg === candMfg || candMfg.includes(queryMfg) || queryMfg.includes(candMfg)));

  // Priority 1 & 2: Exact or packaging-variant MPN match
  if (mpnComp.match) {
    if (mfgMatches) {
      reasons.push(`Exact manufacturer match (${candidate.manufacturer}) and part number match (${candidate.mpn})`);
      return {
        isMatch: true,
        isSubstitute: false,
        confidenceScore: 1.0,
        verificationStatus: 'VERIFIED',
        matchPriority: 2,
        reasons,
      };
    } else {
      reasons.push(`Exact normalized part number match (${candidate.mpn})`);
      return {
        isMatch: true,
        isSubstitute: false,
        confidenceScore: mpnComp.score,
        verificationStatus: 'VERIFIED',
        matchPriority: 1,
        reasons,
      };
    }
  }

  // Check 3: Component name + compatible specs (Priority 3)
  const normQueryName = (query.componentName || '').toLowerCase().trim();
  const normCandName = (candidate.componentName || '').toLowerCase().trim();
  const nameSimilar = Boolean(normQueryName && normCandName && (normCandName.includes(normQueryName) || normQueryName.includes(normCandName)));

  const specsComp = compareSpecifications(
    query.specifications || {},
    candidate.specifications || {}
  );

  if (nameSimilar && specsComp.compatible) {
    reasons.push(`Name similarity and compatible specifications: ${specsComp.matchedSpecs.join(', ')}`);
    return {
      isMatch: true,
      isSubstitute: false,
      confidenceScore: 0.85,
      verificationStatus: 'POTENTIAL_MATCH',
      matchPriority: 3,
      reasons,
    };
  }

  // Check Potential Substitute:
  // When MPN is a prefix or candidate has compatible specifications, but NOT exact MPN
  if (mpnComp.reason === 'PREFIX_MATCH' || specsComp.compatible || (specsComp.score >= 0.5 && specsComp.mismatchedSpecs.length === 0)) {
    if (mpnComp.reason === 'PREFIX_MATCH') {
      substituteNotes.push(`Variant part number family (${candidate.mpn} vs ${query.mpn})`);
    }
    if (specsComp.matchedSpecs.length > 0) {
      substituteNotes.push(`Compatible specifications: ${specsComp.matchedSpecs.join(', ')}`);
    }
    if (specsComp.missingSpecs.length > 0) {
      substituteNotes.push(`Unverified specifications: ${specsComp.missingSpecs.join(', ')}`);
    }

    return {
      isMatch: false,
      isSubstitute: true,
      confidenceScore: 0.6,
      verificationStatus: 'NEEDS_VERIFICATION',
      matchPriority: 4,
      reasons: ['Not an exact part number match, but shares specification or family similarities.'],
      substituteNotes,
    };
  }

  return {
    isMatch: false,
    isSubstitute: false,
    confidenceScore: 0,
    verificationStatus: 'UNVERIFIED',
    matchPriority: 5,
    reasons: ['No matching MPN or verified compatible specifications.'],
  };
}
