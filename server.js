// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PostgreSQL connection using env vars (defaults for local Docker)
const pool = new Pool({
  user: process.env.PGUSER || 'ec2user',
  host: process.env.PGHOST || 'postgres',
  database: process.env.PGDATABASE || 'tasksdb',
  password: process.env.PGPASSWORD || 'yourpassword',
  port: Number(process.env.PGPORT || 5432),
});

// Redis connection using env vars
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
});

// Health endpoint used by k8s / Route53 health checks
app.get('/health', async (req, res) => {
  try {
    // simple DB ping
    await pool.query('SELECT 1');
    // simple redis ping
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error('redis not ok');
    return res.status(200).send('OK');
  } catch (err) {
    return res.status(500).send('ERROR');
  }
});

// HTML Form route
app.get('/', (req, res) => {
  res.send(`
    <h1>Submit a Task</h1>
    <form action="/task" method="POST">
      <input type="text" name="task" placeholder="Enter task" required />
      <button type="submit">Submit</button>
    </form>
  `);
});

// Handle form submission
app.post('/task', async (req, res) => {
  try {
    const task = req.body.task;
    const result = await pool.query(
      'INSERT INTO tasks (description, status) VALUES ($1, $2) RETURNING *',
      [task, 'pending']
    );
    await redis.lpush('task_queue', JSON.stringify(result.rows[0]));
    res.send(`
      Task submitted successfully!<br/>
      <a href="/">Submit another task</a><br/>
      <a href="/tasks">View latest tasks</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting task');
  }
});

// Check latest tasks
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching tasks');
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
