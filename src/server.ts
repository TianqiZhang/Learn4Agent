import express, { type Express } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import type { WsMessage } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend Express app type to include broadcast function
declare global {
  namespace Express {
    interface Application {
      broadcast: (message: WsMessage) => void;
    }
  }
}

export interface ServerInstance {
  app: Express;
  server: HttpServer;
  wss: WebSocketServer;
}

export function createAppServer(): ServerInstance {
  const app: Express = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Dashboard client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Dashboard client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast function for middleware and routes
  app.broadcast = (message: WsMessage) => {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  // Parse JSON bodies
  app.use(express.json());

  // Static files for dashboard
  app.use('/dashboard', express.static(path.join(__dirname, '../public')));

  // Request logging
  app.use(requestLogger);

  // Error handling (must be last)
  app.use(errorHandler);

  return { app, server, wss };
}
