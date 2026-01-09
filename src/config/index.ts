export const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  microsoftLearnBaseUrl: 'https://learn.microsoft.com',
  userAgent: 'Learn4Agent/1.0 (AI Agent Markdown Proxy)',
  requestTimeout: 15000,
  proxyBaseUrl: `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`,
};
