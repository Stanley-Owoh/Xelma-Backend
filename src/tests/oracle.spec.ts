import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Decimal } from '@prisma/client/runtime/library';
import priceOracle from '../services/oracle';

const mockFetchPricesWithFailover = jest.fn();
const mockResolvePriceProviders = jest.fn();

jest.mock('../price-providers', () => ({
  fetchPricesWithFailover: (...args: unknown[]) => mockFetchPricesWithFailover(...args),
  resolvePriceProviders: (...args: unknown[]) => mockResolvePriceProviders(...args),
}));

describe('PriceOracle', () => {
  beforeEach(() => {
    mockFetchPricesWithFailover.mockReset();
    mockResolvePriceProviders.mockReturnValue([{ name: 'coingecko' }]);
    (priceOracle as any).price = null;
    (priceOracle as any).lastUpdatedAt = null;
    (priceOracle as any).activeSource = null;
    (priceOracle as any).breaker.reset();
  });

  it('stores fetched prices as Decimal and preserves exact string precision', async () => {
    mockFetchPricesWithFailover.mockResolvedValue({
      prices: { BTC: 1, ETH: 2, XLM: '0.12345678' },
      fetchedAt: new Date('2026-01-01T00:00:00.000Z'),
      source: 'coingecko',
    });

    await (priceOracle as any).fetchPrice();

    expect(priceOracle.getPrice()).toBeInstanceOf(Decimal);
    expect(priceOracle.getPriceString()).toBe('0.12345678');
    expect(priceOracle.getPriceNumber()).toBeCloseTo(0.12345678);
    expect(priceOracle.getActiveSource()).toBe('coingecko');
    expect(priceOracle.isStale()).toBe(true);
  });

  it('exposes null when fetch fails and does not set price', async () => {
    mockFetchPricesWithFailover.mockRejectedValue(new Error('network error'));

    await (priceOracle as any).fetchPrice();

    expect(priceOracle.getPrice()).toBeNull();
    expect(priceOracle.getPriceString()).toBeNull();
  });
});
