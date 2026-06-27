import { Router, Request, Response, NextFunction } from 'express';
import { mockLeaderboard } from '../data/mockData';
import config from '../config';
import { getLeaderboard } from '../services/leaderboard.service';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (config.app.dataMode === 'mock') {
      return res.json(mockLeaderboard);
    }

    const result = await getLeaderboard(100, 0);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
