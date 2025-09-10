const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL connection (Docker)
const pool = new Pool({
  user: 'ec2user',           // Docker PostgreSQL user
  host: 'postgres',          // <-- Docker container name
  database: 'tasksdb',
  password: 'yourpassword',  // Docker PostgreSQL password
  port: 5432,
});

// Redis connection (Docker)
const redis = new Redis({
  host: 'redis',             // <-- Docker container name
  port: 6379
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
