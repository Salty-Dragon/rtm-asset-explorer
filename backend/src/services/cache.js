import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

let redisClient = null;
let isConnected = false;

export const connectCache = async () => {
  if (isConnected && redisClient) {
    logger.info('Using existing Redis connection');
    return redisClient;
  }

  try {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = process.env.REDIS_PORT || 6379;

    redisClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 3000,
        reconnectStrategy: false // Disable auto-reconnect during initial connection
      }
    });

    redisClient.on('error', (err) => {
      // Only log once, not on every retry
      if (!err.message.includes('ECONNREFUSED')) {
        logger.error('Redis Client Error:', err.message);
      }
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    logger.info('Redis connected successfully');
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message);
    logger.warn('Continuing without Redis cache');
    redisClient = null;
    isConnected = false;
    return null;
  }
};

export const disconnectCache = async () => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};

export const getCache = async (key) => {
  if (!redisClient || !isConnected) {
    return null;
  }

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Error getting cache key ${key}:`, error);
    return null;
  }
};

export const setCache = async (key, value, ttl = 300) => {
  if (!redisClient || !isConnected) {
    return false;
  }

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Error setting cache key ${key}:`, error);
    return false;
  }
};

export const deleteCache = async (key) => {
  if (!redisClient || !isConnected) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting cache key ${key}:`, error);
    return false;
  }
};

export const checkCacheHealth = async () => {
  try {
    if (!redisClient || !isConnected) {
      return { status: 'disconnected', message: 'Not connected to Redis' };
    }

    await redisClient.ping();
    return { status: 'connected', message: 'Redis connection healthy' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};

export const getClient = () => redisClient;
