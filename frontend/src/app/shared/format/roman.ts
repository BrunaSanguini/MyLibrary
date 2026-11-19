const NUMERALS: readonly (readonly [number, string])[] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

const LARGEST = 3999;

/**
 * A count as a Roman numeral, the way the brand writes small counts and years: 2026 is MMXXVI.
 *
 * <p>Zero has no numeral and is shown as "0". Above 3999, or for anything that is not a whole
 * number from zero up, the Arabic digits stay, so the value is never lost.
 */
export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > LARGEST) {
    return String(value);
  }
  if (value === 0) {
    return '0';
  }
  let rest = value;
  let result = '';
  for (const [amount, numeral] of NUMERALS) {
    while (rest >= amount) {
      result += numeral;
      rest -= amount;
    }
  }
  return result;
}
