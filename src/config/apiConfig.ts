// Safe API Endpoints - All external calls go through secure server proxies
export const API_ENDPOINTS = {
  youtubeSearch: '/api/youtube/search',
  geminiAnalyze: '/api/gemini/analyze',
  geminiBatchAnalyze: '/api/gemini/batch-analyze',
  transcript: '/api/transcript',
  health: '/api/health',
};

// Deprecated: API keys are now handled entirely on the backend server for security.
// Kept for backward compatibility with existing interfaces.
export const DEFAULT_API_KEYS = {
  youtubeApiKey: '',
  geminiApiKey: '',
};
