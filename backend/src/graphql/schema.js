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
  }

  type ApiUsageMetric {
    sourceName: String!
    date: String!
    requestCount: Int!
    last429At: String
  }

  type AdminUser {
    id: ID!
    email: String!
    name: String
    avatarUrl: String
    role: String!
    createdAt: String!
    lastLogin: String
    activeSessionCount: Int!
    analysesCount: Int!
    savedJobsCount: Int!
    eventCount: Int!
    lastSeenAt: String
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
    adminUsers: [AdminUser!]!
    visitorTrends(days: Int = 14): [AdminTrendPoint!]!
    topPages(limit: Int = 10): [AdminBreakdown!]!
    trafficSources(limit: Int = 10): [AdminBreakdown!]!
    geoBreakdown(limit: Int = 10): [AdminBreakdown!]!
    deviceBreakdown: [AdminBreakdown!]!
    recentEvents(limit: Int = 30, eventType: String, userId: ID): [AdminEvent!]!
    userActivity(userId: ID!, limit: Int = 30): [AdminEvent!]!
    adminAuditLogs(limit: Int = 30): [AdminAuditLog!]!
    suspiciousSignals: [AdminSuspiciousSignal!]!
  }
`;

export default schema;
