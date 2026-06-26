import logger from '../utils/logger';
import { toDecimal, toNumber, toDecimalString } from '../utils/decimal.util';
import { CircuitBreaker, CircuitBreakerOpenError } from '../utils/circuit-breaker';
import { Decimal } from '@prisma/client/runtime/library';
import config from '../config';
import {
  priceOracleFetchFailuresTotal,
  priceOracleUpdatesTotal,
} from '../metrics/application.metrics';
import { fetchPricesWithFailover, resolvePriceProviders } from './price-providers';

class PriceOracle {
  private static instance: PriceOracle;
  private price: Decimal | null = null;
  private readonly POLLING_INTERVAL = config.oracle.pollingIntervalMs;
  private readonly STALENESS_THRESHOLD = config.oracle.stalenessThresholdMs;
  private readonly breaker = new CircuitBreaker({
    name: 'price-oracle',
    failureThreshold: 3,
    openBackoffMs: 30_000,
  });
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private lastUpdatedAt: Date | null = null;
  private activeSource: string | null = null;

  private constructor() {}

  public static getInstance(): PriceOracle {
    if (!PriceOracle.instance) {
      PriceOracle.instance = new PriceOracle();
    }
    return PriceOracle.instance;
  }

  public startPolling(): void {
    if (this._running) {
      logger.warn('Price Oracle polling already running — ignoring duplicate start');
      return;
    }
    this._running = true;

    this.fetchPrice();
    this.pollingInterval = setInterval(() => {
      this.fetchPrice();
    }, this.POLLING_INTERVAL);

    logger.info('Price Oracle polling started', {
      providers: resolvePriceProviders().map((provider) => provider.name),
    });
  }

  public stopPolling(): void {
    if (!this._running) {
      return;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this._running = false;
    logger.info('Price Oracle polling stopped');
  }

  public isRunning(): boolean {
    return this._running;
  }

  private async fetchPrice(): Promise<void> {
    try {
      const result = await this.breaker.execute(async () =>
        fetchPricesWithFailover(resolvePriceProviders()),
      );

      this.price = toDecimal(result.prices.XLM);
      this.lastUpdatedAt = result.fetchedAt;
      this.activeSource = result.source;
      priceOracleUpdatesTotal.inc();
      logger.info(`Fetched XLM price: $${toDecimalString(this.price)}`, {
        source: result.source,
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        logger.warn('Skipped price fetch because circuit breaker is open', {
          breaker: error.breakerName,
          nextAttemptAt: error.nextAttemptAt.toISOString(),
        });
        return;
      }

      priceOracleFetchFailuresTotal.inc({
        reason: 'upstream_error',
      });
      logger.error('Failed to fetch price from configured providers', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public getPrice(): Decimal | null {
    return this.price;
  }

  public getPriceNumber(): number | null {
    return this.price ? toNumber(this.price) : null;
  }

  public getPriceString(places = 8): string | null {
    return this.price ? toDecimalString(this.price, places) : null;
  }

  public isStale(): boolean {
    if (!this.lastUpdatedAt) return true;
    return Date.now() - this.lastUpdatedAt.getTime() > this.STALENESS_THRESHOLD;
  }

  public getLastUpdatedAt(): Date | null {
    return this.lastUpdatedAt;
  }

  public getActiveSource(): string | null {
    return this.activeSource;
  }
}

export default PriceOracle.getInstance();
