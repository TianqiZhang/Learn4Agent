import { createAppServer } from './server.js';
import { proxyRouter } from './routes/proxyRoute.js';
import { searchRouter } from './routes/searchRoute.js';
import { config } from './config/index.js';

const { app, server } = createAppServer();

// Register routes
app.use('/api/search', searchRouter);
app.use('/', proxyRouter); // Catch-all for proxy - must be last

// Start server
server.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    Learn4Agent Proxy Server                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Proxy URL:      http://${config.host}:${config.port}/en-us/...                     ║
║  Dashboard:      http://${config.host}:${config.port}/dashboard                     ║
║  Search API:     http://${config.host}:${config.port}/api/search?q=...              ║
║                                                                    ║
╠═══════════════════════════════════════════════════════════════════╣
║  Example:                                                          ║
║  curl http://${config.host}:${config.port}/en-us/azure/storage/blobs/storage-blobs-introduction
╚═══════════════════════════════════════════════════════════════════╝
  `);
});
