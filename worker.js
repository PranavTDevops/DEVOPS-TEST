// worker.js
const { Pool } = require('pg');
const Redis = require('ioredis');

const pool = new Pool({
  user: process.env.PGUSER || 'ec2user',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'tasksdb',
  password: process.env.PGPASSWORD || 'yourpassword',
  port: Number(process.env.PGPORT || 5432),
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
});

async function processTasks() {
  console.log("Worker started. Waiting for tasks...");
  while (true) {
    try {
      const task = await redis.brpop('task_queue', 0);
      const taskData = JSON.parse(task[1]);
      console.log("Processing task:", taskData);
      await pool.query('UPDATE tasks SET status=$1 WHERE id=$2', ['completed', taskData.id]);
      console.log(`Task ${taskData.id} marked as completed`);
    } catch (err) {
      console.error("Error processing task:", err);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

processTasks();
