import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const reqPath = (req.url || '/').split('?')[0];
  let filePath = path.join(frontendDir, reqPath === '/' ? 'index.html' : reqPath);
  if (!filePath.startsWith(frontendDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(frontendDir, 'index.html');
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Holiday Support Roster frontend preview server running at http://127.0.0.1:${port}`);
  console.log(`Mock mode preview URL (localhost only): http://127.0.0.1:${port}/?mock=1`);
  console.log(`Real-backend mode URL (requires apiBaseUrl): http://127.0.0.1:${port}/`);
});
