/**
 * Shared formatting utilities
 * Consolidates duplicate formatCurrency functions from multiple hooks
 */

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount == null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
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
