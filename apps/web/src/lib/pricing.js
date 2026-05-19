/**
 * Resolves the effective price for a service based on fulfillment type.
 *
 * Priority:
 *   1. If fulfillmentType is "mobile" and mobile_price_override is set → use it
 *   2. If fulfillmentType is "virtual" and virtual_price_override is set → use it
 *   3. Otherwise → use the base service price
 *
 * @param {Object} service - Service object with price, mobile_price_override, virtual_price_override
 * @param {string} fulfillmentType - One of "physical", "mobile", "virtual"
 * @returns {number} The resolved price as a float
 */
export function resolveServicePrice(service, fulfillmentType) {
  if (fulfillmentType === 'mobile' && service.mobile_price_override != null) {
    return parseFloat(service.mobile_price_override);
  }
  if (fulfillmentType === 'virtual' && service.virtual_price_override != null) {
    return parseFloat(service.virtual_price_override);
  }
  return parseFloat(service.price);
}
