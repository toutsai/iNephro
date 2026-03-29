import { describe, it, expect } from 'vitest';
import { calculateEGFR, getCKDStage } from '../utils/egfrCalculator';

describe('calculateEGFR', () => {
  it('calculates eGFR for typical male patient', () => {
    const result = calculateEGFR(1.0, 65, 'male');
    expect(result).toBeGreaterThan(70);
    expect(result).toBeLessThan(90);
  });

  it('calculates eGFR for typical female patient', () => {
    const result = calculateEGFR(1.0, 65, 'female');
    expect(result).toBeGreaterThan(55);
    expect(result).toBeLessThan(80);
  });

  it('returns lower eGFR for higher creatinine', () => {
    const low = calculateEGFR(1.0, 50, 'male');
    const high = calculateEGFR(3.0, 50, 'male');
    expect(high).toBeLessThan(low);
  });

  it('returns lower eGFR for older age', () => {
    const young = calculateEGFR(1.0, 30, 'male');
    const old = calculateEGFR(1.0, 80, 'male');
    expect(old).toBeLessThan(young);
  });

  it('returns null for invalid inputs', () => {
    expect(calculateEGFR(0, 65, 'male')).toBeNull();
    expect(calculateEGFR(-1, 65, 'male')).toBeNull();
    expect(calculateEGFR(1.0, 0, 'male')).toBeNull();
    expect(calculateEGFR(null, 65, 'male')).toBeNull();
  });

  it('known value: male 50yo Cr 1.0 → ~92', () => {
    const result = calculateEGFR(1.0, 50, 'male');
    expect(result).toBeGreaterThan(85);
    expect(result).toBeLessThan(100);
  });

  it('high creatinine → stage 5 territory', () => {
    const result = calculateEGFR(5.0, 60, 'male');
    expect(result).toBeLessThan(15);
  });
});

describe('getCKDStage', () => {
  it('returns G1 for eGFR >= 90', () => {
    expect(getCKDStage(95).stage).toBe('G1');
    expect(getCKDStage(90).stage).toBe('G1');
  });

  it('returns G2 for eGFR 60-89', () => {
    expect(getCKDStage(89).stage).toBe('G2');
    expect(getCKDStage(60).stage).toBe('G2');
  });

  it('returns G3a for eGFR 45-59', () => {
    expect(getCKDStage(59).stage).toBe('G3a');
    expect(getCKDStage(45).stage).toBe('G3a');
  });

  it('returns G3b for eGFR 30-44', () => {
    expect(getCKDStage(44).stage).toBe('G3b');
    expect(getCKDStage(30).stage).toBe('G3b');
  });

  it('returns G4 for eGFR 15-29', () => {
    expect(getCKDStage(29).stage).toBe('G4');
    expect(getCKDStage(15).stage).toBe('G4');
  });

  it('returns G5 for eGFR < 15', () => {
    expect(getCKDStage(14).stage).toBe('G5');
    expect(getCKDStage(5).stage).toBe('G5');
  });

  it('returns null for null input', () => {
    expect(getCKDStage(null)).toBeNull();
    expect(getCKDStage(undefined)).toBeNull();
  });

  it('has correct colors', () => {
    expect(getCKDStage(95).color).toBe('#4CAF50');
    expect(getCKDStage(14).color).toBe('#F44336');
  });
});
