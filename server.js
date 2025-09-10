const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// PostgreSQL connection (Docker container hostname)
const pool = new Pool({
  user: process.env.PG_USER || 'ec2user',
  host: process.env.PG_HOST || 'postgres',    // Docker container name
  database: process.env.PG_DB || 'tasksdb',
  password: process.env.PG_PASSWORD || 'yourpassword',
  port: process.env.PG_PORT || 5432,
});

// Redis connection (Docker container hostname)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',    // Docker container name
  port: process.env.REDIS_PORT || 6379,
});

// Handle Redis errors
redis.on('error', (err) => {
  console.error('Redis error:', err);
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

    // Save task in PostgreSQL
    const result = await pool.query(
      'INSERT INTO tasks (description, status) VALUES ($1, $2) RETURNING *',
      [task, 'pending']
    );

    // Push to Redis queue
    await redis.lpush('task_queue', JSON.stringify(result.rows[0]));

    res.send(`
      Task submitted successfully!<br/>
      <a href="/">Submit another task</a><br/>
      <a href="/tasks">View latest tasks</a>
    `);
  } catch (err) {
    console.error('Error submitting task:', err);
    res.status(500).send('Error submitting task');
  }
});

// Check latest tasks
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.quer
