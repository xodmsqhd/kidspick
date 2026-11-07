import { loadServerEnv } from './env.ts';

export interface YoutubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
  durationFormatted: string;
  youtubeUrl: string;
  youtubeKidsUrl: string;
  hasSubtitles: boolean;
}

export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MOCK_KIDS_VIDEOS: YoutubeVideoItem[] = [
  {
    id: 'fN1xC9Gz-0s',
    title: '[유아 동화] 은혜 갚은 까치 - 아이들의 정서 발달에 좋은 명작 동화',
    description: '아이들에게 남을 돕는 이쁜 마음과 감사의 중요성을 알려주는 재미있고 감동적인 명작 동화 시리즈입니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    channelTitle: '키즈 맘 동화나라',
    publishedAt: '2025-01-15',
    durationSeconds: 480,
    durationFormatted: '08:00',
    youtubeUrl: 'https://www.youtube.com/watch?v=fN1xC9Gz-0s',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=fN1xC9Gz-0s',
    hasSubtitles: true,
  },
  {
    id: 'XqZsoesa55w',
    title: '신나는 인기 유아 동요 연속 듣기 15분 | 율동 따라하기 (아기상어, 곰세마리)',
    description: '유아와 함께 신나게 따라 부르는 인기 동요 율동 메들리! 신체 발달과 밝은 감성에 도움을 줍니다.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80',
    channelTitle: '비타민 동요 세상',
    publishedAt: '2025-02-01',
    durationSeconds: 900,
    durationFormatted: '15:00',
    youtubeUrl: 'https://www.youtube.com/watch?v=XqZsoesa55w',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=XqZsoesa55w',
    hasSubtitles: true,
  },
  {
    id: '7PCqvfN98pE',
    title: '1부터 20까지 쉽고 재미있게 배우는 유아 숫자놀이 과일 세기',
    description: '알록달록 과일을 세어보며 즐겁게 배우는 기초 수 개념 탐구! 3~6세 아동 필수 수 인지 콘텐츠.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=600&q=80',
    channelTitle: '똑똑한 꼬마 과학자',
    publishedAt: '2025-02-10',
    durationSeconds: 280,
    durationFormatted: '04:40',
    youtubeUrl: 'https://www.youtube.com/watch?v=7PCqvfN98pE',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=7PCqvfN98pE',
    hasSubtitles: true,
  },
  {
    id: '3JZ_D3ELwOQ',
    title: '티라노사우루스와 친구들 | 5분 공룡 탐험대 어린이 애니메이션',
    description: '공룡의 생태와 종류를 귀여운 캐릭터와 함께 알아보는 유익한 무해 공룡 학습 영상.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    channelTitle: '다이노 키즈 TV',
    publishedAt: '2025-03-01',
    durationSeconds: 300,
    durationFormatted: '05:00',
    youtubeUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=3JZ_D3ELwOQ',
    hasSubtitles: true,
  },
  {
    id: 'L0MK7qz13bU',
    title: 'Hello Friends! 알파벳 ABC 동요로 배우는 유아 파닉스 영어',
    description: '자연스러운 영어 소리 자극과 파닉스 기초 어휘 수록! 부모님이 안심하고 틀어주는 영어 동요.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
    channelTitle: '글로벌 키즈 잉글리시',
    publishedAt: '2025-03-05',
    durationSeconds: 580,
    durationFormatted: '09:40',
    youtubeUrl: 'https://www.youtube.com/watch?v=L0MK7qz13bU',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=L0MK7qz13bU',
    hasSubtitles: true,
  },
  {
    id: 'vQxT11xZqKw',
    title: '잠자기 전 들려주는 따뜻한 오르골 자장가 & 잔잔한 동화 이야기 25분',
    description: '수면 수유 및 굿나잇 루틴을 위한 잔잔한 오르골 사운드와 은은한 이야기.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=600&q=80',
    channelTitle: '스윗 드림 라라바이',
    publishedAt: '2025-03-12',
    durationSeconds: 1500,
    durationFormatted: '25:00',
    youtubeUrl: 'https://www.youtube.com/watch?v=vQxT11xZqKw',
    youtubeKidsUrl: 'https://www.youtubekids.com/watch?v=vQxT11xZqKw',
    hasSubtitles: false,
  },
];

export interface SearchVideosParams {
  keyword?: string;
  pageToken?: string;
  requireSubtitlesOnly?: boolean;
  maxDurationMinutes?: number | null;
}

export interface SearchVideosResult {
  videos: YoutubeVideoItem[];
  nextPageToken?: string;
  source: 'youtube_api' | 'mock_fallback';
}

export async function searchVideosProxy(params: SearchVideosParams): Promise<SearchVideosResult> {
  const { youtubeApiKey } = loadServerEnv();
  const keyword = params.keyword || '';
  const pageToken = params.pageToken || '';
  const requireSubtitlesOnly = Boolean(params.requireSubtitlesOnly);
  const maxDurationMinutes = params.maxDurationMinutes != null ? Number(params.maxDurationMinutes) : null;

  let rawVideos: YoutubeVideoItem[] = [];
  let nextToken: string | undefined = undefined;
  let source: 'youtube_api' | 'mock_fallback' = 'mock_fallback';

  if (youtubeApiKey && youtubeApiKey.trim().length > 10) {
    try {
      const queryTerm = keyword ? `${keyword} 키즈 유아` : '유아동화 인기동요';
      const encodedQuery = encodeURIComponent(queryTerm);
      const maxResults = 12;
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=video&videoSyndicated=true&safeSearch=strict&maxResults=${maxResults}&key=${youtubeApiKey}`;
      
      if (pageToken) {
        searchUrl += `&pageToken=${pageToken}`;
      }
      if (requireSubtitlesOnly) {
        searchUrl += `&videoCaption=any`;
      }

      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data: any = await res.json();
        nextToken = data.nextPageToken;
        const videoIds = (data.items || []).map((item: any) => item.id?.videoId).filter(Boolean).join(',');

        if (videoIds) {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${youtubeApiKey}`;
          const detailsRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(8000) });

          if (detailsRes.ok) {
            const detailsData: any = await detailsRes.json();
            rawVideos = (detailsData.items || []).map((item: any) => {
              const durSec = parseISO8601Duration(item.contentDetails?.duration || '');
              const hasCaptions = item.contentDetails?.caption === 'true' || Boolean(item.contentDetails?.caption);
              return {
                id: item.id,
                title: item.snippet?.title || '',
                description: item.snippet?.description || '',
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
                channelTitle: item.snippet?.channelTitle || '',
                publishedAt: (item.snippet?.publishedAt || '').slice(0, 10),
                durationSeconds: durSec,
                durationFormatted: formatDuration(durSec),
                youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`,
                youtubeKidsUrl: `https://www.youtubekids.com/watch?v=${item.id}`,
                hasSubtitles: hasCaptions,
              };
            });
            source = 'youtube_api';
          }
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[YouTube Proxy] YouTube API error:', res.status, errJson);
      }
    } catch (e: any) {
      console.warn('[YouTube Proxy] Failed to fetch from YouTube API, falling back to mock:', e.message);
    }
  }

  // Fallback to rich mock dataset if no videos returned
  if (rawVideos.length === 0) {
    const q = keyword.trim().toLowerCase().replace('#', '');
    if (!q) {
      rawVideos = [...MOCK_KIDS_VIDEOS];
    } else {
      rawVideos = MOCK_KIDS_VIDEOS.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.channelTitle.toLowerCase().includes(q)
      );
      if (rawVideos.length === 0) {
        rawVideos = MOCK_KIDS_VIDEOS.map((v) => ({
          ...v,
          title: `[${keyword}] ${v.title}`,
        }));
      }
    }
  }

  // 1. Exclude Shorts (<= 60 seconds or shorts hashtag)
  rawVideos = rawVideos.filter((v) => {
    const isShortDuration = v.durationSeconds <= 60;
    const hasShortsTag =
      v.title.toLowerCase().includes('#shorts') ||
      v.title.toLowerCase().includes('shorts') ||
      v.description.toLowerCase().includes('#shorts');
    return !isShortDuration && !hasShortsTag;
  });

  // 2. Subtitles filter if requested
  if (requireSubtitlesOnly) {
    rawVideos = rawVideos.filter((v) => v.hasSubtitles !== false);
  }

  // 3. Duration limit filter
  if (maxDurationMinutes !== null && !isNaN(maxDurationMinutes)) {
    const maxSeconds = maxDurationMinutes * 60;
    rawVideos = rawVideos.filter((v) => v.durationSeconds <= maxSeconds);
  }

  return {
    videos: rawVideos,
    nextPageToken: nextToken,
    source,
  };
}
