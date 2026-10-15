import { describe, it, expect } from 'vitest';
import {
  normalizeMpn,
  analyzeMpn,
  compareMpns,
} from '../server/src/services/matching/mpnNormalizer';

describe('MPN Normalization and Matching', () => {
  it('normalizes case, whitespace, and non-alphanumeric punctuation', () => {
    expect(normalizeMpn('esp32-wroom-32d')).toBe('ESP32WROOM32D');
    expect(normalizeMpn('  BNO-055 / sensor  ')).toBe('BNO055SENSOR');
    expect(normalizeMpn('STM32F401RET6')).toBe('STM32F401RET6');
    expect(normalizeMpn('LM-2596.S-5.0')).toBe('LM2596S50');
  });

  it('detects common packaging and reel suffixes without destroying original', () => {
    const analysis = analyzeMpn('ESP32-WROOM-32D-TR');
    expect(analysis.original).toBe('ESP32-WROOM-32D-TR');
    expect(analysis.hasReelOrPackagingSuffix).toBe(true);
    expect(analysis.baseCore).toBe('ESP32WROOM32D');

    const analysisNd = analyzeMpn('ATMEGA328P-PU-ND');
    expect(analysisNd.hasReelOrPackagingSuffix).toBe(true);
    expect(analysisNd.baseCore).toBe('ATMEGA328PPU');
  });

  it('matches exact MPNs with score 1.0', () => {
    const result = compareMpns('ESP32-WROOM-32', 'esp32wroom32');
    expect(result.match).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.reason).toBe('EXACT');
  });

  it('matches reel and cut-tape packaging variants with high confidence (0.95)', () => {
    const result = compareMpns('ESP32-WROOM-32D', 'ESP32-WROOM-32D-TR');
    expect(result.match).toBe(true);
    expect(result.score).toBe(0.95);
    expect(result.reason).toBe('BASE_CORE_MATCH');
  });

  it('flags prefix matches as candidates for substitutes, not exact matches', () => {
    const result = compareMpns('ESP32-WROOM-32', 'ESP32-WROOM-32E');
    expect(result.match).toBe(false);
    expect(result.score).toBe(0.75);
    expect(result.reason).toBe('PREFIX_MATCH');
  });

  it('rejects completely different part numbers', () => {
    const result = compareMpns('BNO055', 'MPU6050');
    expect(result.match).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toBe('NO_MATCH');
  });

  it('handles empty or invalid inputs gracefully', () => {
    expect(normalizeMpn('')).toBe('');
    expect(compareMpns('', 'ESP32').match).toBe(false);
    expect(compareMpns('', '').match).toBe(false);
  });
});
