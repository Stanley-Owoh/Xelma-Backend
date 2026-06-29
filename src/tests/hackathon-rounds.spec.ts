import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';
import { getMockRounds } from '../data/mockData';

const mockGetActiveRound = jest.fn();

jest.mock('../services/soroban.service', () => ({
  __esModule: true,
  default: {
    getActiveRound: (...args: any[]) => mockGetActiveRound(...args),
    isReady: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('../services/hackathon.service', () => ({
  __esModule: true,
  default: {
    placeBet: jest.fn().mockResolvedValue(undefined),
    getRounds: jest.fn().mockResolvedValue([]),
    getLeaderboard: jest.fn().mockResolvedValue([]),
    getUserStats: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../middleware/rateLimiter', () => {
  const pass = (_req: any, _res: any, next: any) => next();
  return { apiRateLimiter: pass, writeRateLimiter: pass, betRateLimiter: pass };
});

// Prevent real Prisma / DB connection in unit tests
jest.mock('../lib/prisma', () => ({ prisma: {} }));

describe('GET /api/rounds — Soroban-aware with mock fallback', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns soroban round when on-chain data is available', async () => {
    mockGetActiveRound.mockResolvedValueOnce({
      round_id: BigInt(1),
      mode: 0,
      price_start: BigInt(2891),
      pool_up: BigInt(28_000_000),
      pool_down: BigInt(14_000_000),
      start_ledger: 100,
      bet_end_ledger: 200,
      end_ledger: 300,
    });

    const res = await request(app).get('/api/rounds');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('soroban');
    expect(Array.isArray(res.body.data.rounds)).toBe(true);
    expect(res.body.data.rounds).toHaveLength(1);
    expect(res.body.data.rounds[0].sorobanRoundId).toBe('1');
    expect(res.body.data.rounds[0].mode).toBe('UP_DOWN');
    expect(res.body.data.rounds[0].status).toBe('ACTIVE');
    expect(res.body.data.rounds[0].isSoroban).toBe(true);
  });

  it('falls back to mock rounds when soroban returns null', async () => {
    mockGetActiveRound.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/rounds');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('mock');
    expect(Array.isArray(res.body.data.rounds)).toBe(true);
    expect(res.body.data.rounds).toHaveLength(getMockRounds().length);
    expect(mockGetActiveRound).toHaveBeenCalledTimes(1);
  });

  it('falls back to mock rounds when soroban throws', async () => {
    mockGetActiveRound.mockRejectedValueOnce(new Error('RPC unavailable'));

    const res = await request(app).get('/api/rounds');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('mock');
    expect(Array.isArray(res.body.data.rounds)).toBe(true);
  });

  it('response always uses envelope with success, data, source, and rounds', async () => {
    mockGetActiveRound.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/rounds');

    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('source');
    expect(res.body.data).toHaveProperty('rounds');
    expect(res.body.success).toBe(true);
    expect(['soroban', 'mock']).toContain(res.body.data.source);
  });
});

describe('GET /api/rounds — ROUNDS_MOCK_MODE=true skips Soroban', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ROUNDS_MOCK_MODE;
  });

  it('skips soroban entirely and returns mock source when ROUNDS_MOCK_MODE is true', async () => {
    process.env.ROUNDS_MOCK_MODE = 'true';

    // Re-evaluate config so it picks up the env var
    jest.isolateModules(() => {
      // config reads env at require-time; isolateModules gives a fresh scope
      const { createApp: freshCreateApp } = require('../app');
      const freshApp = freshCreateApp();

      return request(freshApp)
        .get('/api/rounds')
        .then((res: any) => {
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.source).toBe('mock');
          expect(mockGetActiveRound).not.toHaveBeenCalled();
        });
    });
  });
});
