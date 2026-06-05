import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRankedLeaderboardFromRows,
  getPeriodBounds,
  REWARD_BY_RANK
} from '../src/modules/squads/squad-leaderboard.service.js';

describe('Squad leaderboard scoring', () => {
  it('uses UTC month boundaries', () => {
    const { period, start, end } = getPeriodBounds('2026-06');

    assert.equal(period, '2026-06');
    assert.equal(start.toISOString(), '2026-06-01T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-07-01T00:00:00.000Z');
  });

  it('ranks by eligible points minus suspicious penalties', () => {
    const rows = [
      {
        squadId: 'squad-a',
        squadName: 'Alpha',
        userId: 'user-a',
        eventType: 'application',
        rawPoints: 10,
        eligiblePoints: 10,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T10:00:00Z')
      },
      {
        squadId: 'squad-b',
        squadName: 'Beta',
        userId: 'user-b',
        eventType: 'application',
        rawPoints: 25,
        eligiblePoints: 25,
        spamStatus: 'flagged',
        createdAt: new Date('2026-06-02T11:00:00Z')
      },
      {
        squadId: 'squad-b',
        squadName: 'Beta',
        userId: 'user-b',
        eventType: 'quick_signal',
        rawPoints: 1,
        eligiblePoints: 0,
        spamStatus: 'flagged',
        createdAt: new Date('2026-06-02T11:10:00Z')
      }
    ];

    const ranked = buildRankedLeaderboardFromRows(rows, '2026-06');

    assert.equal(ranked[0].squadId, 'squad-b');
    assert.equal(ranked[0].eligiblePoints, 25);
    assert.equal(ranked[0].spamPenalty, 10);
    assert.equal(ranked[0].qualityScore, 15);
    assert.equal(ranked[1].qualityScore, 10);
  });

  it('breaks score ties by fewer suspicious flags and more active members', () => {
    const rows = [
      {
        squadId: 'squad-a',
        squadName: 'Alpha',
        userId: 'user-a',
        eventType: 'application',
        rawPoints: 10,
        eligiblePoints: 10,
        spamStatus: 'flagged',
        createdAt: new Date('2026-06-02T10:00:00Z')
      },
      {
        squadId: 'squad-a',
        squadName: 'Alpha',
        userId: 'user-a2',
        eventType: 'weekly_goal',
        rawPoints: 5,
        eligiblePoints: 5,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T10:10:00Z')
      },
      {
        squadId: 'squad-b',
        squadName: 'Beta',
        userId: 'user-b',
        eventType: 'application',
        rawPoints: 10,
        eligiblePoints: 10,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T11:00:00Z')
      }
    ];

    const ranked = buildRankedLeaderboardFromRows(rows, '2026-06');

    assert.equal(ranked[0].squadId, 'squad-b');
    assert.equal(ranked[1].squadId, 'squad-a');
  });

  it('defines the top-three digital rewards', () => {
    assert.equal(REWARD_BY_RANK[1].stickerId, 'event_squad_monthly_gold');
    assert.equal(REWARD_BY_RANK[2].xpBonus, 200);
    assert.equal(REWARD_BY_RANK[3].title, 'Monthly Squad Bronze');
  });
});
