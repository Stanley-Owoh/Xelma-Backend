import test from 'node:test';
import assert from 'node:assert';
import { getMockRounds } from '../data/mockData';

test('getMockRounds returns exactly 3 rounds with correct assets and dynamical future timestamps', () => {
  const rounds = getMockRounds();
  
  // Verify length
  assert.strictEqual(rounds.length, 3);
  
  // Verify assets and modes
  assert.strictEqual(rounds[0].id, 'btc-updown-live');
  assert.strictEqual(rounds[0].asset, 'BTC');
  assert.strictEqual(rounds[0].mode, 'updown');
  assert.strictEqual(rounds[0].status, 'live');
  assert.strictEqual(rounds[0].startPrice, 67420);
  
  assert.strictEqual(rounds[1].id, 'eth-precision-live');
  assert.strictEqual(rounds[1].asset, 'ETH');
  assert.strictEqual(rounds[1].mode, 'precision');
  assert.strictEqual(rounds[1].status, 'live');
  assert.strictEqual(rounds[1].startPrice, 3241);
  
  assert.strictEqual(rounds[2].id, 'xlm-updown-new');
  assert.strictEqual(rounds[2].asset, 'XLM');
  assert.strictEqual(rounds[2].mode, 'updown');
  assert.strictEqual(rounds[2].status, 'new');
  assert.strictEqual(rounds[2].startPrice, 0.2891);

  // Verify dynamic future timestamps
  const now = Date.now();
  rounds.forEach((round) => {
    const closesAtTime = new Date(round.closesAt).getTime();
    assert.ok(closesAtTime > now, `closesAt (${round.closesAt}) should be in the future relative to ${new Date(now).toISOString()}`);
  });
});
