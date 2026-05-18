/**
 * Shared formatting utilities
 * Consolidates duplicate formatCurrency functions from multiple hooks
 */

// ─── Platform default currency ─────────────────────────────────────────────
// Used as fallback when no salon currency is available (admin aggregate views,
// components that haven't been wired to salon context yet).
export const PLATFORM_CURRENCY = 'DZD';

// Backward-compatible alias — existing imports of APP_CURRENCY keep working.
export const APP_CURRENCY = PLATFORM_CURRENCY;

// ─── Currency configuration registry ───────────────────────────────────────
// Each entry defines how a currency is formatted and converted for Stripe.
//   decimals: ISO 4217 minor units (used for Stripe conversion)
//   practicalDecimals: digits shown to users (DZD centimes are obsolete → 0)
//   stripeMultiplier: multiply display amount by this to get Stripe's smallest unit
//   locale: Intl locale for number formatting
//   symbol: short symbol for inline display
export const CURRENCY_CONFIG = {
  DZD: { code: 'DZD', symbol: 'DA', locale: 'fr-DZ', decimals: 2, practicalDecimals: 0, stripeMultiplier: 100 },
  EUR: { code: 'EUR', symbol: '€', locale: 'fr-FR', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  CAD: { code: 'CAD', symbol: 'CA$', locale: 'en-CA', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  MAD: { code: 'MAD', symbol: 'MAD', locale: 'fr-MA', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  TND: { code: 'TND', symbol: 'DT', locale: 'fr-TN', decimals: 3, practicalDecimals: 3, stripeMultiplier: 1000 },
  SAR: { code: 'SAR', symbol: 'SAR', locale: 'ar-SA', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  AED: { code: 'AED', symbol: 'AED', locale: 'ar-AE', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'fr-CH', decimals: 2, practicalDecimals: 2, stripeMultiplier: 100 },
  // Zero-decimal currencies
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0, practicalDecimals: 0, stripeMultiplier: 1 },
  KRW: { code: 'KRW', symbol: '₩', locale: 'ko-KR', decimals: 0, practicalDecimals: 0, stripeMultiplier: 1 },
};

/**
 * Convert a display amount to Stripe's smallest currency unit.
 * Examples:
 *   toStripeAmount(1500, 'DZD') → 150000 (centimes)
 *   toStripeAmount(29.99, 'EUR') → 2999 (cents)
 *   toStripeAmount(1500, 'JPY') → 1500 (yen, zero-decimal)
 *   toStripeAmount(15.500, 'TND') → 15500 (millimes)
 */
export function toStripeAmount(amount, currencyCode) {
  const config = CURRENCY_CONFIG[currencyCode?.toUpperCase()] || { stripeMultiplier: 100 };
  return Math.round(Number(amount) * config.stripeMultiplier);
}

/**
 * Convert from Stripe's smallest unit back to a display amount.
 */
export function fromStripeAmount(stripeAmount, currencyCode) {
  const config = CURRENCY_CONFIG[currencyCode?.toUpperCase()] || { stripeMultiplier: 100 };
  return Number(stripeAmount) / config.stripeMultiplier;
}

/**
 * Format a number as currency.
 *
 * IMPORTANT: Always pass the salon's currency explicitly when available.
 * The default (PLATFORM_CURRENCY = 'DZD') is only appropriate for
 * platform-level admin views that aggregate across all salons.
 *
 * @param {number} amount - The amount to format
 * @param {string} currency - ISO 4217 currency code (default: PLATFORM_CURRENCY)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = PLATFORM_CURRENCY) {
  if (amount == null || isNaN(amount)) {
    amount = 0;
  }

  const curr = (currency || PLATFORM_CURRENCY).toUpperCase();
  const config = CURRENCY_CONFIG[curr];

  if (config) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: config.practicalDecimals,
      maximumFractionDigits: config.practicalDecimals,
    }).format(amount);
  }

  // Fallback for currencies not in the registry — use Intl if possible
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  } catch {
    // If Intl doesn't recognize the code, format manually
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formattedNumber} ${curr}`;
  }
}

/**
 * Format a number as percentage
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
  if (value == null || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousands separator
 * @param {number} value - The value to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a duration in minutes to a human readable string (e.g. 150 -> "2 hr, 30 min")
 * @param {number|string} minutes - The duration in minutes
 * @returns {string} Formatted duration string
 */
export function formatDuration(minutes) {
  if (!minutes || isNaN(Number(minutes))) {
    return '0 min';
  }
  
  const m = Number(minutes);
  if (m < 60) {
    return `${m} min`;
  }
  
  const hr = Math.floor(m / 60);
  const min = m % 60;
  
  if (min === 0) {
    return `${hr} hr`;
  }
  
  return `${hr} hr, ${min} min`;
}
