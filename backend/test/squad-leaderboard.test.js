import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRankedLeaderboardFromRows,
  canAutoApprove,
  getLeaderboard,
  getReviewReasons,
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
    assert.equal(REWARD_BY_RANK[3].title, 'Bronze Spark Squad');
  });

  it('adds rank deltas and reward-rank markers', () => {
    const rows = [
      {
        squadId: 'squad-a',
        squadName: 'Alpha',
        userId: 'user-a',
        eventType: 'application',
        rawPoints: 100,
        eligiblePoints: 100,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T10:00:00Z')
      },
      {
        squadId: 'squad-b',
        squadName: 'Beta',
        userId: 'user-b',
        eventType: 'application',
        rawPoints: 80,
        eligiblePoints: 80,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T11:00:00Z')
      },
      {
        squadId: 'squad-c',
        squadName: 'Gamma',
        userId: 'user-c',
        eventType: 'application',
        rawPoints: 50,
        eligiblePoints: 50,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T12:00:00Z')
      },
      {
        squadId: 'squad-d',
        squadName: 'Delta',
        userId: 'user-d',
        eventType: 'application',
        rawPoints: 20,
        eligiblePoints: 20,
        spamStatus: 'clear',
        createdAt: new Date('2026-06-02T13:00:00Z')
      }
    ];

    const ranked = buildRankedLeaderboardFromRows(rows, '2026-06');

    assert.equal(ranked[0].nextRankDelta, 0);
    assert.equal(ranked[0].previousRankDelta, 20);
    assert.equal(ranked[1].nextRankDelta, 20);
    assert.equal(ranked[1].previousRankDelta, 30);
    assert.equal(ranked[2].isRewardRank, true);
    assert.equal(ranked[3].isRewardRank, false);
  });

  it('requires promoted reward candidates to pass the fraud guard', () => {
    const cleanEntry = {
      eligiblePoints: 50,
      spamPenalty: 15,
      suspiciousEventCount: 3,
      activeMemberCount: 2
    };
    const flaggedEntry = {
      eligiblePoints: 49,
      spamPenalty: 16,
      suspiciousEventCount: 4,
      activeMemberCount: 1
    };

    assert.equal(canAutoApprove(cleanEntry), true);
    assert.equal(canAutoApprove(flaggedEntry), false);
    assert.deepEqual(getReviewReasons(flaggedEntry), [
      'spam_penalty_high',
      'too_many_suspicious_events',
      'not_enough_active_members',
      'not_enough_eligible_points'
    ]);
  });

  it('rejects future leaderboard periods', async () => {
    await assert.rejects(
      () => getLeaderboard(null, { period: '2999-01' }),
      (error) => error.statusCode === 400 && error.message === 'Future leaderboard periods are not available.'
    );
  });
});
