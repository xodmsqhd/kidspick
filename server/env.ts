import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

export function loadServerEnv(): {
  youtubeApiKey: string;
  geminiApiKey: string;
  port: number;
} {
  if (!loaded) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Env] Failed to read .env file:', e);
    }
    loaded = true;
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const port = parseInt(process.env.PORT || '5173', 10);

  return {
    youtubeApiKey,
    geminiApiKey,
    port,
  };
}
