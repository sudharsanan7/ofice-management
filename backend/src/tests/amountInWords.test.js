const amountInWords = require('../utils/amountInWords');

describe('amountInWords', () => {
  it.each([
    [0, 'Rupees Zero Only'],
    [1, 'Rupees One Only'],
    [99, 'Rupees Ninety Nine Only'],
    [1000, 'Rupees One Thousand Only'],
    [100000, 'Rupees One Lakh Only'],
    [1234567.5, 'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Paise Fifty Only'],
    [10000000, 'Rupees One Crore Only'],
    [9876543210, 'Rupees Nine Arab Eighty Seven Crore Sixty Five Lakh Forty Three Thousand Two Hundred Ten Only']
  ])('converts %s rupees to Indian words', (amount, expected) => {
    expect(amountInWords(amount)).toBe(expected);
  });

  it('rejects negative and non-finite inputs', () => {
    expect(() => amountInWords(-1)).toThrow(TypeError);
    expect(() => amountInWords(Infinity)).toThrow(TypeError);
  });
});
