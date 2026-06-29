import {
  getMockRounds,
  mockLeaderboard,
  MOCK_PLATFORM_STATS,
} from "../data/mockData";
import {
  LeaderboardRepository,
  Repositories,
  RoundRepository,
  StatsRepository,
} from "./interfaces";
import { PlatformStats } from "../services/stats.service";

export class InMemoryRoundRepository implements RoundRepository {
  async listActiveRounds() {
    return getMockRounds();
  }

  async placeBet(): Promise<void> {
    // In-memory mode keeps the historic route contract: accept the bet without
    // persisting it. This allows route tests and local demos to run DB-free.
  }
}

export class InMemoryLeaderboardRepository implements LeaderboardRepository {
  async listLeaderboard(limit = 100, offset = 0) {
    return mockLeaderboard.slice(offset, offset + limit);
  }
}

export class InMemoryStatsRepository implements StatsRepository {
  private cachedStats: PlatformStats | null = null;

  async getPlatformStats(): Promise<PlatformStats> {
    if (!this.cachedStats) {
      this.cachedStats = {
        ...MOCK_PLATFORM_STATS,
        isFallback: true,
        cachedAt: new Date().toISOString(),
      };
    }
    return this.cachedStats;
  }

  invalidateStatsCache(): void {
    this.cachedStats = null;
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    rounds: new InMemoryRoundRepository(),
    leaderboard: new InMemoryLeaderboardRepository(),
    stats: new InMemoryStatsRepository(),
  };
}
