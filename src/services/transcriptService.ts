import { API_ENDPOINTS } from '../config/apiConfig';

export interface TranscriptResult {
  text: string;
  hasSubtitles: boolean;
}

export const transcriptService = {
  fetchTranscript: async (videoId: string, _fallbackDescription?: string): Promise<TranscriptResult> => {
    if (!videoId) {
      return { text: '', hasSubtitles: false };
    }

    try {
      // Call secure internal backend proxy
      const apiRes = await fetch(`${API_ENDPOINTS.transcript}?videoId=${encodeURIComponent(videoId)}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.hasSubtitles && data.text && data.text.length > 5) {
          return {
            text: data.text,
            hasSubtitles: true,
          };
        }
      }
    } catch {
      // Backend proxy failure or timeout
    }

    return {
      text: '',
      hasSubtitles: false,
    };
  },
};
