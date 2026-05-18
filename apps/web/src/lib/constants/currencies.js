/**
 * Country → Currency mapping.
 * Used to auto-derive salon currency from country at creation time.
 * Follows the industry standard (Fresha, Booksy, Vagaro): one currency per salon,
 * derived from the salon's country, immutable after creation.
 */
export const COUNTRY_CURRENCY_MAP = {
  'Algeria': 'DZD',
  'France': 'EUR',
  'Germany': 'EUR',
  'Spain': 'EUR',
  'Italy': 'EUR',
  'Belgium': 'EUR',
  'Netherlands': 'EUR',
  'Portugal': 'EUR',
  'Austria': 'EUR',
  'Ireland': 'EUR',
  'Finland': 'EUR',
  'Greece': 'EUR',
  'Luxembourg': 'EUR',
  'Estonia': 'EUR',
  'Latvia': 'EUR',
  'Lithuania': 'EUR',
  'Slovakia': 'EUR',
  'Slovenia': 'EUR',
  'Malta': 'EUR',
  'Cyprus': 'EUR',
  'Croatia': 'EUR',
  'United Kingdom': 'GBP',
  'United States': 'USD',
  'Canada': 'CAD',
  'Australia': 'AUD',
  'New Zealand': 'NZD',
  'Morocco': 'MAD',
  'Tunisia': 'TND',
  'Saudi Arabia': 'SAR',
  'United Arab Emirates': 'AED',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'Switzerland': 'CHF',
  'Norway': 'NOK',
  'Sweden': 'SEK',
  'Denmark': 'DKK',
  'Poland': 'PLN',
  'Czech Republic': 'CZK',
  'Hungary': 'HUF',
  'Romania': 'RON',
  'Bulgaria': 'BGN',
  'Turkey': 'TRY',
  'Egypt': 'EGP',
  'South Africa': 'ZAR',
  'India': 'INR',
  'Singapore': 'SGD',
  'Hong Kong': 'HKD',
  'Malaysia': 'MYR',
  'Thailand': 'THB',
  'Brazil': 'BRL',
  'Mexico': 'MXN',
};

/**
 * Derive currency from country name.
 * Returns 'DZD' (platform default) if country is not mapped.
 *
 * @param {string|null} country - Country name
 * @returns {string} ISO 4217 currency code
 */
export function getCurrencyForCountry(country) {
  if (!country) return 'DZD';
  return COUNTRY_CURRENCY_MAP[country] || 'DZD';
}
