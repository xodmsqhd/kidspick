import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './server/apiRouter.ts';
import { loadServerEnv } from './server/env.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = loadServerEnv();
const PORT = env.port || 3001;
const DIST_DIR = path.resolve(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  // 1. API routes
  if (req.url && req.url.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res);
    if (handled) return;
  }

  // 2. Static files serving (for production dist/)
  if (fs.existsSync(DIST_DIR)) {
    const parsed = new URL(req.url || '/', `http://localhost:${PORT}`);
    let filePath = path.join(DIST_DIR, parsed.pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🛡️ [KidsPick] 보안 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`API 상태 확인: http://localhost:${PORT}/api/health`);
});
