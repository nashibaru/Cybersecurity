import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { initDb } from './app-modules/db.js';
import configureApp from './config/app-config.js';
import { PORT } from './config/env.js';

const app = express();

async function startServer() {
  try {
    // Initialize database first
    await initDb();

    // Configure app with all middleware and routes
    configureApp(app);

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('💥 Server startup failed:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();