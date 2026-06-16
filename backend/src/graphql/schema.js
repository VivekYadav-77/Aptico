export const schema = /* GraphQL */ `
  type AdminOverview {
    totalUsers: Int!
    totalAnalyses: Int!
    totalGeneratedContent: Int!
    totalSavedJobs: Int!
    totalApiRequests: Int!
    activeRefreshTokens: Int!
    revokedRefreshTokens: Int!
    totalVisits: Int!
    uniqueVisitors: Int!
    activeVisitors: Int!
    totalEvents: Int!
    apiErrors: Int!
    adminActions: Int!
    restrictedUsers: Int!
    blockedUsers: Int!
    deactivatedUsers: Int!
    hiddenPosts: Int!
    hiddenWins: Int!
    pendingModeration: Int!
  }

  type ApiUsageMetric {
    sourceName: String!
    date: String!
    requestCount: Int!
    last429At: String
  }

  type EmailUsageMetrics {
    total: Int!
    sent: Int!
    failed: Int!
    pending: Int!
    failedLast24h: Int!
    lastSentAt: String
  }

  type EmailDeliveryLog {
    id: ID!
    userId: ID
    userEmail: String
    userName: String
    email: String!
    emailType: String!
    provider: String!
    status: String!
    subject: String
    country: String
    region: String
    city: String
    errorCode: String
    errorMessage: String
    createdAt: String!
    deliveredAt: String
  }

  type AdminUser {
    id: ID!
    email: String!
    name: String
    avatarUrl: String
    role: String!
    status: String!
    createdAt: String!
    lastLogin: String
    activeSessionCount: Int!
    analysesCount: Int!
    savedJobsCount: Int!
    eventCount: Int!
    restrictionCount: Int!
    lastSeenAt: String
  }

  type AdminRestriction {
    id: ID!
    userId: ID!
    feature: String!
    isRestricted: Boolean!
    reason: String
    expiresAt: String
    createdBy: ID
    createdAt: String!
    updatedAt: String!
  }

  type AdminModerationItem {
    id: ID!
    ownerId: ID
    ownerEmail: String
    type: String!
    title: String
    body: String
    status: String!
    createdAt: String
  }

  type AdminModerationAction {
    id: ID!
    adminUserId: ID
    adminEmail: String
    action: String!
    targetType: String!
    targetId: String!
    reason: String!
    metadata: String!
    createdAt: String!
  }

  type AdminTrendPoint {
    date: String!
    visits: Int!
    uniqueVisitors: Int!
    events: Int!
  }

  type AdminBreakdown {
    label: String!
    value: Int!
  }

  type AdminEvent {
    id: ID!
    eventType: String!
    userId: ID
    userEmail: String
    visitorId: String
    path: String
    referrer: String
    source: String
    deviceCategory: String
    browserName: String
    country: String
    region: String
    city: String
    metadata: String!
    createdAt: String!
  }

  type AdminAuditLog {
    id: ID!
    adminUserId: ID
    adminEmail: String
    action: String!
    targetType: String
    targetId: String
    metadata: String!
    createdAt: String!
  }

  type AdminSuspiciousSignal {
    label: String!
    severity: String!
    detail: String!
    count: Int!
    lastSeenAt: String
  }

  type Query {
    adminOverview: AdminOverview!
    apiUsageMetrics: [ApiUsageMetric!]!
    emailUsageMetrics: EmailUsageMetrics!
    emailDeliveryLogs(limit: Int = 50, email: String, emailType: String, status: String): [EmailDeliveryLog!]!
    adminUsers: [AdminUser!]!
    visitorTrends(days: Int = 14): [AdminTrendPoint!]!
    topPages(limit: Int = 10): [AdminBreakdown!]!
    trafficSources(limit: Int = 10): [AdminBreakdown!]!
    geoBreakdown(limit: Int = 10): [AdminBreakdown!]!
    deviceBreakdown: [AdminBreakdown!]!
    recentEvents(limit: Int = 30, eventType: String, userId: ID): [AdminEvent!]!
    userActivity(userId: ID!, limit: Int = 30): [AdminEvent!]!
    adminAuditLogs(limit: Int = 30): [AdminAuditLog!]!
    adminRestrictions(userId: ID): [AdminRestriction!]!
    adminModerationQueue(contentType: String = "post", limit: Int = 40, search: String): [AdminModerationItem!]!
    adminModerationActions(limit: Int = 40): [AdminModerationAction!]!
    suspiciousSignals: [AdminSuspiciousSignal!]!
  }
`;

export default schema;
