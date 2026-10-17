const { getIndianFinancialYear } = require('../services/counter.service');

describe('Counter Service - Indian Financial Year Calculation', () => {
  it('should return 2026-27 for October 2026', () => {
    const octDate = new Date(2026, 9, 15); // Month 9 is October
    expect(getIndianFinancialYear(octDate)).toBe('2026-27');
  });

  it('should return 2026-27 for April 2026', () => {
    const aprDate = new Date(2026, 3, 1); // Month 3 is April
    expect(getIndianFinancialYear(aprDate)).toBe('2026-27');
  });

  it('should return 2025-26 for March 2026', () => {
    const marDate = new Date(2026, 2, 31); // Month 2 is March
    expect(getIndianFinancialYear(marDate)).toBe('2025-26');
  });

  it('should return 2026-27 for January 2027', () => {
    const janDate = new Date(2027, 0, 15); // Month 0 is January
    expect(getIndianFinancialYear(janDate)).toBe('2026-27');
  });
});
