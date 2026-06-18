const { Queue } = require('bullmq');
const Redis = require('ioredis');

const createRedisConnection = () => new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 1000, 10000); // cap at 10s
    console.warn(`Redis reconnect attempt ${times} — retrying in ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
    return targetErrors.some(e => err.message.includes(e));
  }
});

const connection = createRedisConnection();

connection.on('connect', () => console.log('✅ Redis connected'));
connection.on('ready', () => console.log('✅ Redis ready'));
connection.on('error', (err) => console.warn('⚠️  Redis error:', err.message));
connection.on('close', () => console.warn('⚠️  Redis connection closed'));
connection.on('reconnecting', (delay) => console.warn(`🔄 Redis reconnecting in ${delay}ms`));

const submissionsQueue = new Queue('submissions', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 }
  }
});

submissionsQueue.on('error', (err) => {
  console.error('Submissions queue error:', err.message);
});

module.exports = { connection, submissionsQueue };
