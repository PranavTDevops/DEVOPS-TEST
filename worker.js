const { Pool } = require('pg');
const Redis = require('ioredis');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'tasksdb',
  password: 'yourpassword',
  port: 5432,
});

const redis = new Redis();

async function processTasks() {
  while (true) {
    const task = await redis.brpop('task_queue', 0); // blocking pop
    const taskData = JSON.parse(task[1]);
    console.log("Processing task:", taskData);

    // Update task status in DB
    await pool.query('UPDATE tasks SET status=$1 WHERE id=$2', ['completed', taskData.id]);
  }
}

processTasks();
