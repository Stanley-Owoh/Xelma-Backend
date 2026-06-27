import { Router, Request, Response, NextFunction } from 'express';
import { betRateLimiter } from '../middleware/rateLimiter';
import { getMockRounds } from '../data/mockData';
import { validate } from '../middleware/validate.middleware';
import { upDownBetSchema, precisionBetSchema } from '../schemas/bets.schema';
import config from '../config';
import roundService from '../services/round.service';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (config.app.dataMode === 'mock') {
      return res.json(getMockRounds());
    }

    const { rounds, source } = await roundService.getActiveRoundsWithFallback();
    return res.json({ source, rounds });
  } catch (err) {
    next(err);
  }
});

// TODO: Call contract via Xelma TypeScript bindings — bets must go on-chain; this endpoint is logging/analytics only for now
router.post('/:id/bet', betRateLimiter, (_req, res) => {
  res.json({ success: true, message: 'Bet recorded (stub)' });
});

// Hackathon mutation endpoints - with Zod validation for consistent error handling
router.post('/hackathon/up-down/:id/bet', betRateLimiter, validate(upDownBetSchema), (_req, res) => {
  res.json({ success: true, message: 'Bet recorded (stub)' });
});

router.post('/hackathon/precision/:id/bet', betRateLimiter, validate(precisionBetSchema), (_req, res) => {
  res.json({ success: true, message: 'Precision bet recorded (stub)' });
});

export default router;