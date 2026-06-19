const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Primary Redis client for commands (GET, SET, SADD, etc.)
 */
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 300,
  lazyConnect: false,
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('error', (err) => {
  logger.error('Redis client error', { error: err.message });
});

/**
 * Separate Redis client for Pub/Sub subscriptions.
 * A subscribed client cannot issue regular commands.
 */
const redisSub = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redisSub.on('connect', () => {
  logger.info('Redis subscriber client connected');
});

redisSub.on('error', (err) => {
  logger.error('Redis subscriber error', { error: err.message });
});

/**
 * Publisher client — separate from the main client so pub/sub
 * doesn't interfere with regular commands.
 */
const redisPub = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redisPub.on('connect', () => {
  logger.info('Redis publisher client connected');
});

redisPub.on('error', (err) => {
  logger.error('Redis publisher error', { error: err.message });
});

module.exports = { redis, redisSub, redisPub };
