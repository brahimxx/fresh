/**
 * Shared formatting utilities
 * Consolidates duplicate formatCurrency functions from multiple hooks
 */

export const APP_CURRENCY = 'DZD';

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: APP_CURRENCY)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = APP_CURRENCY) {
  if (amount == null || isNaN(amount)) {
    amount = 0;
  }
  
  const curr = currency.toUpperCase();
  
  // Handle some common global currencies natively
  if (['USD', 'EUR', 'GBP'].includes(curr)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  }

  // Format as number then append currency for DZD and others
  const formattedNumber = new Intl.NumberFormat('en-US').format(amount);
  return `${formattedNumber} ${curr}`;
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
