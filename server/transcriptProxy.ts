import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptData {
  hasSubtitles: boolean;
  text: string;
  error?: string;
}

export async function fetchTranscriptProxy(videoId: string): Promise<TranscriptData> {
  if (!videoId || typeof videoId !== 'string') {
    return { hasSubtitles: false, text: '', error: 'videoId is required' };
  }

  try {
    // 1. Try Korean transcript
    let items = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' }).catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);

    // 2. Try default / auto-generated transcript
    if (!items || items.length === 0) {
      items = await Promise.race([
        YoutubeTranscript.fetchTranscript(videoId).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);
    }

    if (items && items.length > 0) {
      const text = items.map((i: any) => i.text).join(' ').trim();
      if (text.length > 5) {
        return { hasSubtitles: true, text };
      }
    }

    return { hasSubtitles: false, text: '' };
  } catch (e: any) {
    return { hasSubtitles: false, text: '', error: e.message || 'Failed to fetch transcript' };
  }
}
