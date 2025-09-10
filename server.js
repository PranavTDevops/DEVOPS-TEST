const http = require('http');
const port = process.env.PORT || 3000; // choose 3000 for now

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello from AWS EC2 Web Server!</h1>');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
