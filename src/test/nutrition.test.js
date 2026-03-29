import { describe, it, expect } from 'vitest';
import { getPotassiumLevel, getKidneyWarnings } from '../utils/nutritionHelpers';

describe('getPotassiumLevel', () => {
  it('returns low for potassium < 100', () => {
    const result = getPotassiumLevel(50);
    expect(result.level).toBe('low');
    expect(result.label).toBe('低鉀食品');
    expect(result.icon).toBe('🟢');
  });

  it('returns medium for potassium 100-200', () => {
    expect(getPotassiumLevel(100).level).toBe('medium');
    expect(getPotassiumLevel(150).level).toBe('medium');
    expect(getPotassiumLevel(200).level).toBe('medium');
  });

  it('returns high for potassium 200-300', () => {
    expect(getPotassiumLevel(201).level).toBe('high');
    expect(getPotassiumLevel(250).level).toBe('high');
    expect(getPotassiumLevel(300).level).toBe('high');
  });

  it('returns very-high for potassium > 300', () => {
    expect(getPotassiumLevel(301).level).toBe('very-high');
    expect(getPotassiumLevel(500).level).toBe('very-high');
  });

  it('handles zero', () => {
    expect(getPotassiumLevel(0).level).toBe('low');
  });

  it('handles edge case at exactly 100', () => {
    expect(getPotassiumLevel(100).level).toBe('medium');
  });
});

describe('getKidneyWarnings', () => {
  it('returns carambola danger warning', () => {
    const food = { kidneyWarning: 'carambola', potassium: 150, phosphorus: 100, sodium: 50 };
    const warnings = getKidneyWarnings(food);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('danger');
    expect(warnings[0].type).toBe('carambola');
  });

  it('warns for very high potassium', () => {
    const food = { potassium: 400, phosphorus: 100, sodium: 50 };
    const warnings = getKidneyWarnings(food);
    const kWarning = warnings.find(w => w.type === 'potassium');
    expect(kWarning.level).toBe('danger');
  });

  it('warns for high phosphorus >= 250', () => {
    const food = { potassium: 50, phosphorus: 300, sodium: 50 };
    const warnings = getKidneyWarnings(food);
    const pWarning = warnings.find(w => w.type === 'phosphorus');
    expect(pWarning).toBeDefined();
    expect(pWarning.level).toBe('warning');
  });

  it('warns for high sodium >= 100', () => {
    const food = { potassium: 50, phosphorus: 50, sodium: 200 };
    const warnings = getKidneyWarnings(food);
    const nWarning = warnings.find(w => w.type === 'sodium');
    expect(nWarning).toBeDefined();
  });

  it('includes both warning for kidneyWarning === both', () => {
    const food = { kidneyWarning: 'both', potassium: 350, phosphorus: 300, sodium: 50 };
    const warnings = getKidneyWarnings(food);
    const bothWarning = warnings.find(w => w.type === 'both');
    expect(bothWarning).toBeDefined();
  });

  it('returns safe indicators for low-risk food', () => {
    const food = { potassium: 30, phosphorus: 50, sodium: 20 };
    const warnings = getKidneyWarnings(food);
    const kWarning = warnings.find(w => w.type === 'potassium');
    expect(kWarning.level).toBe('success');
  });
});
