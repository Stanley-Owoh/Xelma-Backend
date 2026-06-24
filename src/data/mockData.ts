// TODO: Replace with PostgreSQL database
export type MockPredictionRound =
  | {
      id: string;
      asset: string;
      mode: 'updown';
      status: 'live' | 'new';
      startPrice: number;
      poolUp: number;
      poolDown: number;
      closesAt: string;
    }
  | {
      id: string;
      asset: string;
      mode: 'precision';
      status: 'live' | 'new';
      startPrice: number;
      totalPool: number;
      predictionCount: number;
      closesAt: string;
    };

const minutesFromNow = (minutes: number): string =>
  new Date(Date.now() + minutes * 60 * 1000).toISOString();

// TODO: Replace with on-chain query via get_active_round() from Xelma contract
export const getMockRounds = (): MockPredictionRound[] => [
  {
    id: 'btc-updown-live',
    asset: 'BTC',
    mode: 'updown',
    status: 'live',
    startPrice: 67420,
    poolUp: 2800,
    poolDown: 1400,
    closesAt: minutesFromNow(3),
  },
  {
    id: 'eth-precision-live',
    asset: 'ETH',
    mode: 'precision',
    status: 'live',
    startPrice: 3241,
    totalPool: 1800,
    predictionCount: 22,
    closesAt: minutesFromNow(12),
  },
  {
    id: 'xlm-updown-new',
    asset: 'XLM',
    mode: 'updown',
    status: 'new',
    startPrice: 0.2891,
    poolUp: 200,
    poolDown: 0,
    closesAt: minutesFromNow(20),
  },
];

export const mockData = {
  prices: [
    { id: 'bitcoin', symbol: 'btc', price: 60000 },
    { id: 'ethereum', symbol: 'eth', price: 3000 },
  ],
  // TODO: Replace with live Stellar RPC queries via @stellar/stellar-sdk
  platformStats: {
    totalRounds: 1247,
    totalVxlmDistributed: 4200000,
    activePlayers: 893,
    totalBetsPlaced: 8432,
  },
};
