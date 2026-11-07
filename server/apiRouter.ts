import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadServerEnv } from './env.ts';
import { searchVideosProxy } from './youtubeProxy.ts';
import { analyzeVideoProxy, batchAnalyzeVideosProxy, type AnalyzeRequest } from './geminiProxy.ts';
import { fetchTranscriptProxy } from './transcriptProxy.ts';

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        // 5MB limit
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const urlString = req.url || '';
  if (!urlString.startsWith('/api/')) {
    return false;
  }

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return true;
  }

  const parsedUrl = new URL(urlString, 'http://localhost');
  const pathname = parsedUrl.pathname;

  try {
    // 1. Health / Status Check
    if (pathname === '/api/health' || pathname === '/api/status') {
      const { youtubeApiKey, geminiApiKey } = loadServerEnv();
      sendJson(res, 200, {
        status: 'ok',
        securityMode: 'server_proxy',
        hasYoutubeKey: Boolean(youtubeApiKey && youtubeApiKey.length > 10),
        hasGeminiKey: Boolean(geminiApiKey && geminiApiKey.length > 5),
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    // 2. YouTube Search & Filter Proxy
    if (pathname === '/api/youtube/search' && req.method === 'GET') {
      const keyword = parsedUrl.searchParams.get('q') || '';
      const pageToken = parsedUrl.searchParams.get('pageToken') || '';
      const requireSubtitlesOnly = parsedUrl.searchParams.get('requireSubtitlesOnly') === 'true';
      const durationParam = parsedUrl.searchParams.get('maxDurationMinutes');
      const maxDurationMinutes = durationParam ? parseInt(durationParam, 10) : null;

      const result = await searchVideosProxy({
        keyword,
        pageToken,
        requireSubtitlesOnly,
        maxDurationMinutes,
      });

      sendJson(res, 200, result);
      return true;
    }

    // 3. Transcript Proxy
    if (pathname === '/api/transcript' && req.method === 'GET') {
      const videoId = parsedUrl.searchParams.get('videoId') || '';
      const result = await fetchTranscriptProxy(videoId);
      sendJson(res, 200, result);
      return true;
    }

    // 4. Gemini Single Video Analysis Proxy
    if (pathname === '/api/gemini/analyze' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.title) {
        sendJson(res, 400, { error: 'Missing required field: title' });
        return true;
      }
      const result = await analyzeVideoProxy(body as AnalyzeRequest);
      sendJson(res, 200, result);
      return true;
    }

    // 5. Gemini Batch Videos Analysis Proxy (High performance chunked execution)
    if (pathname === '/api/gemini/batch-analyze' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const items: AnalyzeRequest[] = Array.isArray(body.videos) ? body.videos : [];
      const excludedWords: string[] = Array.isArray(body.excludedWords) ? body.excludedWords : [];

      const map = await batchAnalyzeVideosProxy(items, excludedWords);
      sendJson(res, 200, { analyses: map });
      return true;
    }

    sendJson(res, 404, { error: 'API route not found' });
    return true;
  } catch (error: any) {
    console.error('[API Router Error]', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
    return true;
  }
}
