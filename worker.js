const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL connection (Docker container hostname)
const pool = new Pool({
  user: process.env.PG_USER || 'ec2user',           // PostgreSQL user
  host: process.env.PG_HOST || 'postgres',          // Docker container name in network
  database: process.env.PG_DB || 'tasksdb',
  password: process.env.PG_PASSWORD || 'yourpassword',  // PostgreSQL password
  port: process.env.PG_PORT || 5432,
});

// Redis connection (Docker container hostname)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',          // Docker container name in network
  port: process.env.REDIS_PORT || 6379
});

// Handle Redis connection errors
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Function to process tasks
async function processTasks() {
  console.log("Worker started. Waiting for tasks...");

  while (true) {
    try {
      // Blocking pop from Redis queue
      const task = await redis.brpop('task_queue', 0);
      const taskData = JSON.parse(task[1]);
      console.log("Processing task:", taskData);

      // Update task status in PostgreSQL
      await pool.query('UPDATE tasks SET status=$1 WHERE id=$2', ['completed', taskData.id]);
      console.log(`Task ${taskData.id} marked as completed`);
    } catch (err) {
      console.error("Error processing task:", err);
      // Optional: wait 1 second before retrying on error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Start the worker
processTasks();
