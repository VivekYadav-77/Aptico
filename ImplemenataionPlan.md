# Gamification Integrity & Resilience Portfolio — Implementation Plan

This plan solves the XP spamming vulnerability by integrating Shadowbanning, Proof of Work, Diminishing Returns, XP Decay, Rate Limiting, Social Deterrent, and a Public Resilience Portfolio.

## Answers to Open Questions
1. **Historical Data:** Reconfigure XP as per the new update rules.
2. **Squad Visibility:** Yes — squad teammates also see the company names.

---

## Phase 1: Database Schema & Infrastructure

### [MODIFY] [schema.js](file:///d:/web%20devfiles/Aptico/backend/src/db/schema.js)

**1a. New Table `application_logs`**
Replaces the raw integer input. Each logged application is now an individual row with proof-of-work fields.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto |
| `userId` | uuid | FK → users.id, cascade |
| `squadId` | uuid / null | FK → squads.id, set null (links to squad if user was in one) |
| `companyName` | text | Required, min 3 chars |
| `roleTitle` | text | Required, min 3 chars |
| `isShadowbanned` | boolean | Default false. If true, this row is invisible to XP engine and public profile |
| `createdAt` | timestamp | Auto |

Indexes: `userId`, `(userId, createdAt)` for daily queries.

**1b. Update Table `rejection_logs`**
- Add column `isShadowbanned` (boolean, default false).

**1c. Update Table `users`**
- Add column `lastXpDecayAt` (timestamp, nullable) — tracks when XP was last decayed for the Consistency Enforcer.

---

## Phase 2: Backend XP Engine & Anti-Cheat

### [NEW] [xpEngine.js](file:///d:/web%20devfiles/Aptico/backend/src/services/xpEngine.js)

Central service that calculates XP for any scoring action. All XP logic concentrates here.

**Diminishing Returns (Application XP):**
- Count how many non-shadowbanned `application_logs` the user created *today* (UTC).
- Apps 1–5 today → **20 XP each**
- Apps 6–15 today → **5 XP each**
- Apps 16+ today → **0 XP**

**High-Value vs Low-Value XP (Rejection XP):**
Keep the existing stage-based model from `rejectionController.js` but apply a daily cap:
- Max 5 rejection logs per day. Beyond that → shadowban silently.
- Stage XP stays: resume=50, first_round=100, hiring_manager=175, final=250.

**XP Decay (Consistency Enforcer):**
- Export a `applyXpDecayIfNeeded(db, userId)` function.
- If `users.lastXpDecayAt` is null OR more than 7 days ago:
  - Deduct 5% of current `resilienceXp` (min 0).
  - Update `lastXpDecayAt` to now.
- Called lazily on login or on any XP-granting action (not a cron job — keeps infra simple).

**Shadowban Detection:**
- Export `shouldShadowban(db, userId, companyName, roleTitle)`:
  - Regex plausibility: company/role must be ≥3 chars, not purely symbols/numbers, not known spam strings (test, asdf, 123, aaa, etc.).
  - If user already has 15+ non-shadowbanned app logs today → shadowban.
  - If user has 5+ rejection logs today → shadowban.
  - Returns `{ shadowbanned: boolean, reason: string }`.

### [MODIFY] [squadController.js](file:///d:/web%20devfiles/Aptico/backend/src/controllers/squadController.js)

- Rewrite `logSquadAppController`:
  - Change input schema from `{ count }` to `{ companyName, roleTitle }`.
  - Insert one row into `application_logs` (with `squadId` from membership).
  - Run `shouldShadowban()`. If flagged, set `isShadowbanned: true` on the row, skip XP, but return `200 OK` (silent).
  - If not shadowbanned: grant XP via XP engine diminishing returns, then increment `squadMembers.appsSentThisWeek` by 1.
  - Continue calling `grantGoalRewardIfNeeded()` as before.

### [MODIFY] [rejectionController.js](file:///d:/web%20devfiles/Aptico/backend/src/controllers/rejectionController.js)

- Before inserting, run `shouldShadowban()` for rejections (daily cap check).
- If shadowbanned: insert with `isShadowbanned: true`, return `201` with fake XP (show the number but don't actually grant it).
- If not shadowbanned: apply XP decay check, then grant XP as before.

### [MODIFY] [squadRoutes.js](file:///d:/web%20devfiles/Aptico/backend/src/routes/squadRoutes.js)

- Add a stricter per-route rate limit on `POST /log-app`: max **5 requests per minute** (Fastify rate-limit supports per-route config via `config` option).
- Add stricter rate limit on `POST /ping` as well.

### [MODIFY] [rejectionRoutes.js](file:///d:/web%20devfiles/Aptico/backend/src/routes/rejectionRoutes.js)

- Add per-route rate limit on `POST /rejections`: max **5 requests per minute**.

---

## Phase 3: Frontend — Proof of Work Logging

### [MODIFY] [SquadDashboard.jsx](file:///d:/web%20devfiles/Aptico/frontend/src/pages/SquadDashboard.jsx)

- **Remove** the `appCount` number input and the `logAppSchema` count-based form.
- **Replace** with a "Log Application" form containing:
  - `Company Name` (text input, required, min 3 chars)
  - `Role Title` (text input, required, min 3 chars)
  - Submit button
- Add a **recruiter deterrent warning** below the form:
  > ⚠️ "These entries are permanently visible to recruiters on your public profile. Ensure your data is accurate."
- Update the `handleLogApps()` function to send `{ companyName, roleTitle }` instead of `{ count }`.
- In the squad member cards / activity feed, show company names where available (since the user confirmed squad visibility = yes).

### [MODIFY] [squadApi.js](file:///d:/web%20devfiles/Aptico/frontend/src/api/squadApi.js)

- Change `logSquadApplications(count)` to `logSquadApplications({ companyName, roleTitle })`.

---

## Phase 4: Frontend — Resilience Portfolio on Public Profile

### [NEW] Backend endpoint for public resilience data

#### [MODIFY] [profileController.js](file:///d:/web%20devfiles/Aptico/backend/src/controllers/profileController.js) or social routes

- Add a new API endpoint (or extend the existing public profile data) that returns:
  - Non-shadowbanned `application_logs` for the user (last 90 days), grouped by day for the streak graph.
  - Non-shadowbanned `rejection_logs` for the user (last 90 days).
  - Daily application counts for the last 30 days (for the heatmap/streak).
- Respect `sectionVisibility` settings (new key: `resiliencePortfolio`).

### [MODIFY] [PublicProfile.jsx](file:///d:/web%20devfiles/Aptico/frontend/src/pages/PublicProfile.jsx)

Add a new section called **"Proof of Resilience"** in the right sidebar (after Digital Footprint), containing:

1. **Daily Application Streak Graph** — A GitHub-style contribution grid showing how many applications the user sent per day over the last 30 days. Each cell is colored by intensity (0 = empty, 1-2 = light, 3-5 = medium, 5+ = strong).

2. **Application History Feed** — A compact timeline of recent non-shadowbanned application logs:
   - `Company Name` · `Role Title` · `Date`
   - Limited to most recent 10 entries.

3. **Rejection Journey Feed** — A compact timeline of non-shadowbanned rejection logs:
   - `Company Name` · `Role Title` · `Stage` · `Date`
   - Limited to most recent 10.

4. **Stats Summary Card:**
   - Total applications (all time, non-shadowbanned)
   - Total rejections logged
   - Current daily average (last 7 days)
   - Longest streak (consecutive days with ≥1 application)

### [MODIFY] [profileApi.js](file:///d:/web%20devfiles/Aptico/frontend/src/api/profileApi.js) or [socialApi.js](file:///d:/web%20devfiles/Aptico/frontend/src/api/socialApi.js)

- Add API call to fetch the resilience portfolio data for a given username.

---

## Verification Plan

### Automated Tests
1. Test that the 16th application in a day grants 0 XP.
2. Test that a shadowbanned log returns `200 OK` but does NOT increment XP or squad velocity.
3. Test that regex validation rejects `"aa"`, `"123"`, `"!!!"` as company names.
4. Test that the per-route rate limiter returns `429` after 5 rapid requests.

### Manual Verification
1. Log 20 applications rapidly on the UI → verify only 15 count toward XP, rest are silently absorbed.
2. Type gibberish company names → verify they get shadowbanned (UI shows success, but XP and public profile don't reflect them).
3. Visit a Public Profile → verify the Resilience Portfolio section renders the streak graph and application history.
4. Confirm the "visible to recruiters" warning is prominently displayed on the Squad Dashboard form.
