import {
  fetchPricesWithFailover,
  resolvePriceProviders,
} from './price-providers';
import { AssetPrices } from './price-providers/types';

export type { AssetPrices } from './price-providers/types';

const CACHE_TTL_MS = 30_000;

type PriceCache = {
  prices: AssetPrices;
  fetchedAt: Date;
  source: string;
};

let cache: PriceCache | null = null;

function getStalenessThresholdMs(): number {
  const raw = process.env.ORACLE_STALENESS_THRESHOLD_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 60_000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

/** Clears the in-memory cache (for tests). */
export function resetPriceCache(): void {
  cache = null;
}

export function isPriceDataStale(lastUpdatedAt: Date | null): boolean {
  if (!lastUpdatedAt) {
    return true;
  }
  return Date.now() - lastUpdatedAt.getTime() > getStalenessThresholdMs();
}

export function getLastPriceUpdateAt(): Date | null {
  return cache?.fetchedAt ?? null;
}

export function getActivePriceSource(): string | null {
  return cache?.source ?? null;
}

export type PriceSnapshot = AssetPrices & {
  stale: boolean;
  lastUpdatedAt: string | null;
  source: string | null;
};

/**
 * Returns BTC/ETH/XLM USD prices with provider failover and a 30-second cache.
 * Serves stale cache on transient upstream failures when available.
 *
 * TODO: Replace CoinGecko with dedicated on-chain oracle for production settlement.
 */
export async function getPrices(): Promise<AssetPrices> {
  const snapshot = await getPriceSnapshot();
  return {
    BTC: snapshot.BTC,
    ETH: snapshot.ETH,
    XLM: snapshot.XLM,
  };
}

export async function getPriceSnapshot(): Promise<PriceSnapshot> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return {
      ...cache.prices,
      stale: isPriceDataStale(cache.fetchedAt),
      lastUpdatedAt: cache.fetchedAt.toISOString(),
      source: cache.source,
    };
  }

  try {
    const result = await fetchPricesWithFailover(resolvePriceProviders());
    cache = {
      prices: result.prices,
      fetchedAt: result.fetchedAt,
      source: result.source,
    };
    return {
      ...result.prices,
      stale: isPriceDataStale(result.fetchedAt),
      lastUpdatedAt: result.fetchedAt.toISOString(),
      source: result.source,
    };
  } catch (error) {
    if (cache) {
      return {
        ...cache.prices,
        stale: true,
        lastUpdatedAt: cache.fetchedAt.toISOString(),
        source: cache.source,
      };
    }
    throw error;
  }
}

/** Blocks settlement-sensitive flows when cached oracle data is too old. */
export function assertFreshPricesForSettlement(): void {
  if (isPriceDataStale(cache?.fetchedAt ?? null)) {
    throw new Error('Price data is stale; settlement blocked');
  }
}
