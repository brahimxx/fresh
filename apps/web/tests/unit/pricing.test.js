import { describe, expect, it } from 'vitest';
import { resolveServicePrice } from '@/lib/pricing';

describe('resolveServicePrice', () => {
  const baseService = {
    price: '50.00',
    mobile_price_override: null,
    virtual_price_override: null,
  };

  it('returns base price for physical fulfillment type', () => {
    const service = { ...baseService, mobile_price_override: '75.00', virtual_price_override: '30.00' };
    expect(resolveServicePrice(service, 'physical')).toBe(50.0);
  });

  it('returns mobile_price_override when fulfillment is mobile and override is set', () => {
    const service = { ...baseService, mobile_price_override: '75.00' };
    expect(resolveServicePrice(service, 'mobile')).toBe(75.0);
  });

  it('returns base price when fulfillment is mobile but override is null', () => {
    expect(resolveServicePrice(baseService, 'mobile')).toBe(50.0);
  });

  it('returns virtual_price_override when fulfillment is virtual and override is set', () => {
    const service = { ...baseService, virtual_price_override: '30.00' };
    expect(resolveServicePrice(service, 'virtual')).toBe(30.0);
  });

  it('returns base price when fulfillment is virtual but override is null', () => {
    expect(resolveServicePrice(baseService, 'virtual')).toBe(50.0);
  });

  it('handles numeric values (not just strings)', () => {
    const service = { price: 50, mobile_price_override: 75, virtual_price_override: 30 };
    expect(resolveServicePrice(service, 'mobile')).toBe(75.0);
    expect(resolveServicePrice(service, 'virtual')).toBe(30.0);
    expect(resolveServicePrice(service, 'physical')).toBe(50.0);
  });

  it('treats zero override as a valid override (not null)', () => {
    const service = { ...baseService, mobile_price_override: '0.00' };
    expect(resolveServicePrice(service, 'mobile')).toBe(0.0);
  });
});
