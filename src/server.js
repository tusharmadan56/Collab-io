require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./sockets');
const { persistWorker } = require('./queues/persistWorker');
const { pool } = require('./config/db');
const { redis, redisSub, redisPub } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

// Raw HTTP server needed for Socket.io to share the same port
const server = http.createServer(app);

const io = initializeSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
  logger.info('Services initialized: Express, Socket.io, Redis, PostgreSQL, BullMQ');
});

// Drain connections in order: HTTP → sockets → workers → Redis → DB
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    io.close();
    logger.info('Socket.io server closed');

    await persistWorker.close();
    logger.info('BullMQ persist worker closed');

    await redis.quit();
    await redisSub.quit();
    await redisPub.quit();
    logger.info('Redis clients closed');

    await pool.end();
    logger.info('PostgreSQL pool closed');

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: reason?.message || reason });
});

module.exports = { server, io };
