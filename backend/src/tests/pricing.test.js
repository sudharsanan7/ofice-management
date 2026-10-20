const { calculatePricing, calculateTotals } = require('../services/pricing');

describe('Shared Pricing Service (services/pricing.js)', () => {
  describe('Intrastate GST (Client State == Company State)', () => {
    it('should split 18% GST equally into 9% CGST and 9% SGST with 0 IGST', () => {
      const items = [
        {
          description: 'Web Application Development',
          sacCode: '998311',
          quantity: 2,
          unitPrice: 50000,
          discount: 10000, // gross: 100,000, after discount: 90,000
          gstRate: 18
        }
      ];

      const result = calculatePricing({
        items,
        clientState: 'Tamil Nadu',
        companyState: 'Tamil Nadu'
      });

      expect(result.isIntraState).toBe(true);
      expect(result.subtotal).toBe(100000);
      expect(result.totalDiscount).toBe(10000);
      expect(result.taxableAmount).toBe(90000);

      // 90,000 * 9% = 8,100 each
      expect(result.cgst).toBe(8100);
      expect(result.sgst).toBe(8100);
      expect(result.igst).toBe(0);
      expect(result.totalTax).toBe(16200);
      expect(result.grandTotal).toBe(106200);

      // Verify line item amount
      expect(result.items[0].amount).toBe(90000);
      expect(result.items[0].lineTotal).toBe(106200);
    });

    it('should handle case-insensitive state matching with whitespace', () => {
      const items = [
        { description: 'Consulting', quantity: 1, unitPrice: 1000, gstRate: 18 }
      ];

      const result = calculatePricing({
        items,
        clientState: '  karnataka ',
        companyState: 'KARNATAKA'
      });

      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(90);
      expect(result.sgst).toBe(90);
      expect(result.igst).toBe(0);
      expect(result.grandTotal).toBe(1180);
    });
  });

  describe('Interstate GST (Client State != Company State)', () => {
    it('should apply 18% IGST with 0 CGST and 0 SGST', () => {
      const items = [
        {
          description: 'Cloud Infrastructure Setup',
          sacCode: '998313',
          quantity: 1,
          unitPrice: 200000,
          discount: 20000, // taxable: 180,000
          gstRate: 18
        }
      ];

      const result = calculatePricing({
        items,
        clientState: 'Maharashtra',
        companyState: 'Tamil Nadu'
      });

      expect(result.isIntraState).toBe(false);
      expect(result.subtotal).toBe(200000);
      expect(result.totalDiscount).toBe(20000);
      expect(result.taxableAmount).toBe(180000);

      // 180,000 * 18% = 32,400 IGST
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(32400);
      expect(result.totalTax).toBe(32400);
      expect(result.grandTotal).toBe(212400);
    });
  });

  describe('Multi-item and Rounding Precision', () => {
    it('should accurately compute multiple items with odd cents/paise', () => {
      const items = [
        {
          description: 'Hourly Design Support',
          quantity: 3,
          unitPrice: 1250.75, // gross: 3752.25
          discount: 100.25,   // taxable: 3652.00
          gstRate: 18
        },
        {
          description: 'Server Maintenance',
          quantity: 1,
          unitPrice: 4500.50, // gross: 4500.50
          discount: 0,
          gstRate: 12 // 12% GST
        }
      ];

      const result = calculatePricing({
        items,
        clientState: 'Tamil Nadu',
        companyState: 'Tamil Nadu'
      });

      // Item 1: 3652 * 9% = 328.68 CGST, 328.68 SGST
      // Item 2: 4500.50 * 6% = 270.03 CGST, 270.03 SGST
      expect(result.subtotal).toBe(8252.75);
      expect(result.totalDiscount).toBe(100.25);
      expect(result.taxableAmount).toBe(8152.5);
      expect(result.cgst).toBe(598.71);
      expect(result.sgst).toBe(598.71);
      expect(result.totalTax).toBe(1197.42);
      expect(result.grandTotal).toBe(9349.92);
    });

    it('should return zeros for empty item list', () => {
      const result = calculatePricing({ items: [] });
      expect(result.grandTotal).toBe(0);
      expect(result.items).toHaveLength(0);
    });
  });
});

describe('calculateTotals (integer paise)', () => {
  it('calculates intra and inter-state line totals and tax fields', () => {
    const item = [{ description: 'Service', quantity: 2, unitPrice: 10.01, discount: 1.02, gstRate: 18 }];
    const intra = calculateTotals(item, 'intra');
    const inter = calculateTotals(item, 'inter');
    expect(intra.items[0].lineSubtotal).toBe(19);
    expect(intra.items[0].cgst + intra.items[0].sgst).toBe(intra.items[0].lineTax);
    expect(intra.cgstTotal).toBe(1.71);
    expect(intra.sgstTotal).toBe(1.71);
    expect(inter.igstTotal).toBe(3.42);
    expect(inter.grandTotal).toBe(22.42);
  });

  it('clamps excessive discounts, supports each allowed GST slab and zero values', () => {
    const items = [0, 5, 12, 18, 28].map((gstRate) => ({ description: 'line', quantity: 1, unitPrice: 1, discount: 5, gstRate }));
    const result = calculateTotals(items, 'intra');
    expect(result.items.every((item) => item.lineSubtotal === 0 && item.lineTotal === 0)).toBe(true);
    expect(result.grandTotal).toBe(0);
    expect(calculateTotals([{ description: 'free', quantity: 1, unitPrice: 0, discount: 0, gstRate: 0 }], 'inter').grandTotal).toBe(0);
  });

  it('rejects unsupported tax types and GST rates', () => {
    expect(() => calculateTotals([], 'other')).toThrow(TypeError);
    expect(() => calculateTotals([{ quantity: 1, unitPrice: 1, gstRate: 7 }], 'intra')).toThrow(TypeError);
  });
});
