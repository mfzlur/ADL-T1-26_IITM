import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy: (times) => {
    // Reconnect after 2 seconds, stop after 5 attempts
    if (times > 5) return null;
    return 2000;
  },
});

// Error logging is kept as it is critical for debugging
redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});
