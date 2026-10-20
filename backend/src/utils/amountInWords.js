const SMALL = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = [
  [100000000000000000n, 'Shankh'], [1000000000000000n, 'Padma'], [10000000000000n, 'Neel'],
  [100000000000n, 'Kharab'], [1000000000n, 'Arab'], [10000000n, 'Crore'],
  [100000n, 'Lakh'], [1000n, 'Thousand'], [100n, 'Hundred']
];

function underHundred(value) {
  if (value < 20) return SMALL[value];
  return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${SMALL[value % 10]}` : ''}`;
}

function integerToWords(value) {
  if (value === 0n) return 'Zero';
  let remaining = value;
  const words = [];
  for (const [scale, label] of SCALES) {
    const group = remaining / scale;
    if (group > 0n) {
      const groupWords = group < 100n ? underHundred(Number(group)) : integerToWords(group);
      words.push(`${groupWords} ${label}`);
      remaining %= scale;
    }
  }
  if (remaining > 0n) words.push(underHundred(Number(remaining)));
  return words.join(' ');
}

/** Convert an INR amount (including fractional rupees) to Indian-system words. */
function amountInWords(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new TypeError('Amount must be a non-negative finite number');
  const totalPaise = BigInt(Math.round(numericAmount * 100));
  const rupees = totalPaise / 100n;
  const paise = Number(totalPaise % 100n);
  const rupeeWords = integerToWords(rupees);
  const paiseWords = paise ? ` and Paise ${underHundred(paise)}` : '';
  return `Rupees ${rupeeWords}${paiseWords} Only`;
}

module.exports = amountInWords;
module.exports.amountInWords = amountInWords;
