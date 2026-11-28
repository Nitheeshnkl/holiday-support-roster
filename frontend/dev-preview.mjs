import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewRuntimeConfig } from './js/preview-config.js';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

function getSandboxUrl() {
  if (process.env.V0_SANDBOX_URL) return process.env.V0_SANDBOX_URL;
  if (process.env.NODE_ENV === 'production') return '';

  const envFile = path.resolve(frontendDir, '../.env.development.local');
  if (!fs.existsSync(envFile)) return '';

  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .find((entry) => entry.startsWith('V0_SANDBOX_URL='));
  return line ? line.slice('V0_SANDBOX_URL='.length).trim().replace(/^(?:\"(.*)\"|'(.*)')$/, '$1$2') : '';
}

const sandboxUrl = getSandboxUrl();

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

  if (ext === '.html' && path.basename(filePath) === 'index.html') {
    const previewGrant = createPreviewRuntimeConfig({
      nodeEnv: process.env.NODE_ENV,
      sandboxUrl,
      requestHost: req.headers.host,
    });
    const html = fs.readFileSync(filePath, 'utf8');
    const previewScript = previewGrant
      ? `<script>window.__ROSTER_PREVIEW_CONFIG__=${JSON.stringify(previewGrant)};</script>`
      : '';
    res.end(html.replace('</head>', `${previewScript}</head>`));
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Holiday Support Roster frontend preview server listening on port ${port}`);
  console.log(`Local mock-mode URL: http://localhost:${port}/?mock=1`);
});
