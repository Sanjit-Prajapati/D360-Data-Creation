/**
 * Converts backend enum strings to human-readable labels dynamically.
 * e.g. "OFF_MARKET_BUY" → "Off Market Buy", "SCHEME_OF_ARRANGEMENT" → "Scheme Of Arrangement"
 */
export const formatEnumLabel = (val: string): string => {
  if (!val) return '';
  return val
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
