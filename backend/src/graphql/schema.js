export const schema = /* GraphQL */ `
  type AdminOverview {
    totalUsers: Int!
    totalAnalyses: Int!
    totalGeneratedContent: Int!
    totalSavedJobs: Int!
    totalApiRequests: Int!
    activeRefreshTokens: Int!
    revokedRefreshTokens: Int!
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
  }

  type Query {
    adminOverview: AdminOverview!
    apiUsageMetrics: [ApiUsageMetric!]!
    adminUsers: [AdminUser!]!
  }
`;

export default schema;
