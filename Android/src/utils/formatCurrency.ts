/**
 * Format a number as currency string.
 * Defaults to USD with 2 decimal places.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

/**
 * Format a number with sign prefix: +$100.00 or -$100.00
 */
export function formatSignedCurrency(amount: number): string {
  const formatted = formatCurrency(amount);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}
