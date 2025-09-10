const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to PostgreSQL (Docker container user)
const pool = new Pool({
  user: 'ec2user',           // Docker PostgreSQL user
  host: 'localhost',
  database: 'tasksdb',
  password: 'yourpassword',  // Docker PostgreSQL password
  port: 5432,
});

// Connect to Redis (Docker container)
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
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
