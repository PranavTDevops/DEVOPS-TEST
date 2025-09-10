const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL connection (Docker container hostname)
const pool = new Pool({
  user: 'ec2user',           // PostgreSQL user
  host: 'postgres',          // Docker container name in network
  database: 'tasksdb',
  password: 'yourpassword',  // PostgreSQL password
  port: 5432,
});

// Redis connection (Docker container hostname)
const redis = new Redis({
  host: 'redis',             // Docker container name in network
  port: 6379,
});

// Function to process tasks
async function processTasks() {
  console.log("Worker started. Waiting for tasks...");

  while (true) {
    try {
      // Blocking pop from Redis queue
      const task = await redis.brpop('task_queue', 0);
      if (!task) continue;

      const taskData = JSON.parse(task[1]);
      console.log("Processing task:", taskData);

      // Update task status in PostgreSQL
      const res = await pool.query(
        'UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *',
        ['completed', taskData.id]
      );

      console.log(`Task ${taskData.id} marked as completed:`, res.rows[0]);
    } catch (err) {
      console.error("Error processing task:", err);

      // Optional: wait 1 second before retrying on error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Start the worker
processTasks().catch(err => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
