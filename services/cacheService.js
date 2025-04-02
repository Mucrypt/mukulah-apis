// services/cacheService.js
const redis = require('redis');

let client;

try {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379', // Use IPv4 localhost
    socket: {
      reconnectStrategy: (retries) => {
        console.error(`Redis reconnect attempt #${retries}`);
        if (retries > 10) {
          console.error('Max retries reached. Exiting...');
          return new Error('Redis connection failed');
        }
        return Math.min(retries * 100, 3000); // Retry with exponential backoff
      },
    },
  });

  

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client
    .connect()
    .then(() => {
      console.log('✅ Redis connected successfully');
    })
    .catch((err) => {
      console.error('Failed to connect to Redis:', err.message);
    });
} catch (err) {
  console.error('Failed to initialize Redis client:', err.message);
}

class CacheService {
  constructor() {
    this.client = client;
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttl, // Set expiration in seconds
      });
    } catch (err) {
      console.error('Cache set error:', err);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Cache delete error:', err);
    }
  }

  async clearByPattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) {
        await this.client.del(keys);
      }
    } catch (err) {
      console.error('Cache clear by pattern error:', err);
    }
  }
}

module.exports = new CacheService();
