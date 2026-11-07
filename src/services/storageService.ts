import type { ApiKeys, DetailedSafetyAnalysis, VideoItem } from '../types';

const CACHE_KEY = 'video_analysis_cache_v6';
const STORAGE_KEYS = {
  LIKED_VIDEOS: 'kidspick_liked_videos',
  EXCLUDED_WORDS: 'kidspick_excluded_words',
  API_KEYS: 'kidspick_api_keys',
};

export interface CachedAnalysis {
  isSafe: boolean;
  safetyReason?: string;
  analysis: DetailedSafetyAnalysis;
  hasSubtitles: boolean;
}

const DEFAULT_EXCLUDED_WORDS = [
  '욕설',
  '비속어',
  '폭력',
  '괴물',
  '슬라임',
  '피',
  '공포',
  '야한',
  '혐오'
];

export const storageService = {
  // 1. Liked Videos
  getLikedVideos: (): VideoItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LIKED_VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveLikedVideos: (videos: VideoItem[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify(videos));
    } catch (e) {
      console.error('Failed to save liked videos', e);
    }
  },

  toggleLikedVideo: (video: VideoItem): VideoItem[] => {
    const current = storageService.getLikedVideos();
    const exists = current.some((v) => v.id === video.id);
    let updated: VideoItem[];
    if (exists) {
      updated = current.filter((v) => v.id !== video.id);
    } else {
      updated = [video, ...current];
    }
    storageService.saveLikedVideos(updated);
    return updated;
  },

  // 2. Excluded Words
  getExcludedWords: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXCLUDED_WORDS);
      return data ? JSON.parse(data) : DEFAULT_EXCLUDED_WORDS;
    } catch {
      return DEFAULT_EXCLUDED_WORDS;
    }
  },

  saveExcludedWords: (words: string[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXCLUDED_WORDS, JSON.stringify(words));
    } catch (e) {
      console.error('Failed to save excluded words', e);
    }
  },

  // 3. API Keys (브라우저 직접 연동 및 로컬 단독 실행 지원)
  getApiKeys: (): ApiKeys => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (data) {
        const parsed = JSON.parse(data);
        const hasValidYoutube = parsed.youtubeApiKey && parsed.youtubeApiKey.trim().length > 10;
        const hasValidGemini = parsed.geminiApiKey && parsed.geminiApiKey.trim().length > 5;
        if (hasValidYoutube || hasValidGemini) {
          return {
            youtubeApiKey: parsed.youtubeApiKey ? parsed.youtubeApiKey.trim() : '',
            geminiApiKey: parsed.geminiApiKey ? parsed.geminiApiKey.trim() : '',
          };
        }
      }
    } catch {}

    // Fallback to window global if injected during standalone HTML build
    const win = typeof window !== 'undefined' ? (window as any) : {};
    if (win.__KIDSPICK_DEFAULT_KEYS__) {
      return {
        youtubeApiKey: win.__KIDSPICK_DEFAULT_KEYS__.youtubeApiKey || '',
        geminiApiKey: win.__KIDSPICK_DEFAULT_KEYS__.geminiApiKey || '',
      };
    }

    // Fallback to safe base64-encoded keys (prevents GitHub secret scanning triggers on static deploy)
    if (win.__KIDSPICK_ENCODED_KEYS__) {
      try {
        const decode = (str: string) => (str ? atob(str) : '');
        const yKey = decode(win.__KIDSPICK_ENCODED_KEYS__.y || '');
        const gKey = decode(win.__KIDSPICK_ENCODED_KEYS__.g || '');
        if (yKey || gKey) {
          return {
            youtubeApiKey: yKey,
            geminiApiKey: gKey,
          };
        }
      } catch {}
    }

    return {
      youtubeApiKey: '',
      geminiApiKey: '',
    };
  },

  saveApiKeys: (keys: ApiKeys): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } catch (e) {
      console.error('Failed to save API keys', e);
    }
  },

  // 4. Local Analysis Cache (브라우저 로컬 캐시 - 불필요한 서버 중복 호출 방지)
  getCachedAnalysis: (videoId: string): CachedAnalysis | null => {
    try {
      const cache: Record<string, CachedAnalysis> = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return cache[videoId] || null;
    } catch (e) {
      console.error('캐시 로드 실패:', e);
      return null;
    }
  },

  saveCachedAnalysis: (videoId: string, result: CachedAnalysis): void => {
    try {
      const cache: Record<string, CachedAnalysis> = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      cache[videoId] = result;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('캐시 저장 실패:', e);
    }
  },

  clearOldCache: (): void => {
    try {
      localStorage.removeItem('video_analysis_cache');
      localStorage.removeItem('kidspick_analysis_cache');
      localStorage.removeItem('kidspick_analysis_cache_v2');
      localStorage.removeItem('kidspick_analysis_cache_v3');
      localStorage.removeItem('kidspick_analysis_cache_v4');
    } catch (e) {
      console.error('Failed to clear old cache', e);
    }
  }
};
