import { mockData } from '../data/mockData';
import config from '../config';
import logger from '../utils/logger';

// Price service is a tiny abstraction used by a few routes/tests in the
// hackathon/dev server. Respect DATA_MODE so tests and local demos can use
// mock values without code changes.
export const getPrices = async () => {
  if (config.app.dataMode === 'mock') {
    return mockData.prices;
  }

  // Live mode: placeholder until a CoinGecko integration is implemented.
  // Return empty array so callers handle absence gracefully.
  logger.debug('priceService.getPrices called in live mode: no live provider configured');
  return [];
};