const Counter = require('../models/Counter');

/**
 * Calculates Indian Financial Year string (e.g., '2026-27')
 * Fiscal year begins on April 1 and ends on March 31.
 * 
 * @param {Date} date
 * @returns {string} e.g. "2026-27"
 */
const getIndianFinancialYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: Jan=0, Feb=1, Mar=2, Apr=3...

  let startYear;
  let endYear;

  if (month >= 3) {
    // April to December
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  const endYearShort = String(endYear).slice(-2);
  return `${startYear}-${endYearShort}`;
};

/**
 * Generates an atomic sequential number formatted like:
 * QT/2026-27/0001 or INV/2026-27/0001
 * 
 * @param {string} prefix - e.g. 'QT', 'INV', 'PAY'
 * @param {Date} [date] - Optional date to calculate financial year
 * @returns {Promise<string>} - Formatted sequential identifier
 */
const generateNumber = async (prefix, date = new Date()) => {
  if (!prefix) {
    throw new Error('Prefix is required to generate sequential number');
  }

  const fiscalYear = getIndianFinancialYear(date);
  const counterKey = `${prefix.toUpperCase()}_${fiscalYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { 
      $inc: { seq: 1 },
      $setOnInsert: { year: fiscalYear }
    },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true 
    }
  );

  const paddedSeq = String(counter.seq).padStart(4, '0');
  return `${prefix.toUpperCase()}/${fiscalYear}/${paddedSeq}`;
};

module.exports = {
  getIndianFinancialYear,
  generateNumber
};
