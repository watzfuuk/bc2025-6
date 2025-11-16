const http = require('http');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .requiredOption('-h, --host <type>', 'Server host')
  .requiredOption('-p, --port <type>', 'Server port')
  .requiredOption('-c, --cache <type>', 'Path to cache directory');

program.parse(process.argv);
const options = program.opts();

const HOST = options.host;
const PORT = options.port;
const CACHE_DIR = options.cache;

if (!fs.existsSync(CACHE_DIR)) {
  console.log(`Cache directory not found. Creating directory: ${CACHE_DIR}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Сервер інвентаризації працює!');
});

server.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
  console.log(`Cache directory is set to: ${CACHE_DIR}`);
});