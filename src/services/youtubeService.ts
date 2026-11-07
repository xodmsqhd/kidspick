import type { DetailedSafetyAnalysis, SearchResponse, VideoItem } from '../types';
import { geminiService } from './geminiService';
import { storageService } from './storageService';
import { API_ENDPOINTS } from '../config/apiConfig';

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

export function cleanTitleForDisplay(title: string): string {
  if (!title) return '';
  return title
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/【.*?】/g, ' ')
    .replace(/<.*?>/g, ' ')
    .replace(/\{.*?\}/g, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ')
    .split(/[|｜ㅣ/]/)[0]
    .replace(/(EBS|스토리북|키드키즈|키즈캐슬|주니토니|핑크퐁|뽀로로|지니키즈|깨비키즈|쥬니어네이버|야호|코코몽|플레이하우스|유치원|어린이집|TV|티비|만화|애니|동화|동요|유아|어린이|15분|20분|30분|1시간|연속듣기|모음|풀버전|고화질|무료|인기|베스트|4K|HD|ENG|SUB|공식|NEW|추천|전체|대소동|대작전)/gi, ' ')
    .replace(/[★▶●■◆▲▼#~_.:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEFAULT_ANALYSIS: DetailedSafetyAnalysis = {
  recommendedAge: '권장 5세+',
  oneLineMessage: '자녀와 함께 따뜻하게 감상할 수 있는 유익한 명작 이야기입니다.',
  stimulationLevels: {
    violence: '없음',
    language: '건전함',
    tempo: '잔잔함',
  },
  situationTags: ['#정서안정', '#인성교육', '#키즈픽'],
  pacingAndTone: '잔잔하고 따뜻한 스토리 낭독형',
  dialogueTip: '영상 후 가장 인상 깊었던 장면에 대해 이야기를 나누어 보세요.',
  activityTip: '주인공의 따뜻한 행동을 함께 이야기 나누며 칭찬해 주세요.',
  analysisSource: 'title_only',
};

// Rich Mock Dataset for fallback / zero-config
const MOCK_KIDS_VIDEOS: Omit<VideoItem, 'analysis' | 'isSafe'>[] = [
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

export const youtubeService = {
  searchVideos: async (
    keyword: string,
    maxDurationMinutes: number | null,
    excludedWords: string[],
    _userYoutubeKey?: string,
    _userGeminiKey?: string,
    pageToken: string = '',
    requireSubtitlesOnly: boolean = false,
    onProgress?: (videos: VideoItem[]) => void
  ): Promise<SearchResponse> => {
    let rawVideos: Omit<VideoItem, 'analysis' | 'isSafe'>[] = [];
    let nextToken: string | undefined = undefined;

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    // 1. Fetch through secure server backend proxy (Fast response: ~0.3-0.5s) if not on file://
    if (!isFileProtocol) {
      try {
        const params = new URLSearchParams();
        if (keyword) params.set('q', keyword);
        if (pageToken) params.set('pageToken', pageToken);
        if (requireSubtitlesOnly) params.set('requireSubtitlesOnly', 'true');
        if (maxDurationMinutes !== null) params.set('maxDurationMinutes', maxDurationMinutes.toString());

        const res = await fetch(`${API_ENDPOINTS.youtubeSearch}?${params.toString()}`, {
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          rawVideos = data.videos || [];
          nextToken = data.nextPageToken;
        }
      } catch (e: any) {
        console.warn('[YouTube Service] Proxy fetch error, fallback to mock data:', e.message);
      }
    }

    // 2. Client-side direct YouTube API if user provided key and proxy was unreachable
    const userKeys = storageService.getApiKeys();
    const effectiveYoutubeKey = _userYoutubeKey || userKeys.youtubeApiKey;

    if (rawVideos.length === 0 && effectiveYoutubeKey && effectiveYoutubeKey.trim().length > 10) {
      try {
        let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&type=video&videoEmbeddable=true&safeSearch=strict&q=${encodeURIComponent(keyword || '유아 동화')}&key=${effectiveYoutubeKey.trim()}`;
        if (pageToken) searchUrl += `&pageToken=${pageToken}`;
        if (requireSubtitlesOnly) searchUrl += `&videoCaption=any`;

        const sRes = await fetch(searchUrl, { signal: AbortSignal.timeout(7000) });
        if (sRes.ok) {
          const sData = await sRes.json();
          nextToken = sData.nextPageToken;
          const videoIds = (sData.items || []).map((it: any) => it.id?.videoId).filter(Boolean).join(',');
          if (videoIds) {
            const dUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${effectiveYoutubeKey.trim()}`;
            const dRes = await fetch(dUrl, { signal: AbortSignal.timeout(7000) });
            if (dRes.ok) {
              const dData = await dRes.json();
              rawVideos = (dData.items || []).map((item: any) => {
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
            }
          }
        }
      } catch (err: any) {
        console.warn('[YouTube Service] Direct API fetch warning, fallback to mock:', err.message);
      }
    }

    // 3. Fallback to rich mock dataset if backend proxy & direct API returned empty
    if (rawVideos.length === 0) {
      const q = keyword.trim().toLowerCase().replace('#', '');
      if (!q) {
        rawVideos = MOCK_KIDS_VIDEOS;
      } else {
        const filtered = MOCK_KIDS_VIDEOS.filter(
          (v) =>
            v.title.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q) ||
            v.channelTitle.toLowerCase().includes(q)
        );
        rawVideos = filtered.length > 0 ? filtered : MOCK_KIDS_VIDEOS;
      }

      // Exclude Shorts
      rawVideos = rawVideos.filter((v) => {
        const isShortDuration = v.durationSeconds <= 60;
        const hasShortsTag =
          v.title.toLowerCase().includes('#shorts') ||
          v.title.toLowerCase().includes('shorts') ||
          v.description.toLowerCase().includes('#shorts');
        return !isShortDuration && !hasShortsTag;
      });

      // Duration filter
      if (maxDurationMinutes !== null) {
        const maxSeconds = maxDurationMinutes * 60;
        rawVideos = rawVideos.filter((v) => v.durationSeconds <= maxSeconds);
      }
    }

    // 3. STEP 1 (Instant Display): Build Initial Progressive Videos (~0.4s!)
    // Cached videos use cached AI analysis immediately; others get fast template analysis with isAnalyzing=true
    const initialVideos: VideoItem[] = rawVideos.map((v) => {
      const cached = storageService.getCachedAnalysis(v.id);
      if (cached) {
        return {
          ...v,
          hasSubtitles: cached.hasSubtitles ?? v.hasSubtitles,
          isSafe: cached.isSafe,
          safetyReason: cached.safetyReason,
          analysis: cached.analysis,
          isAnalyzing: false,
        };
      }

      const cleanT = cleanTitleForDisplay(v.title) || v.title;
      const lowerT = v.title.toLowerCase();
      let initialMsg = `${cleanT}의 이야기를 통해 배려와 따뜻한 마음의 가치를 배워요.`;
      let initialTags = ['#유아추천', '#안심영상', '#키즈픽'];

      if (/동요|노래|율동|song|메들리/.test(lowerT)) {
        initialMsg = `${cleanT}의 경쾌한 리듬에 맞춰 온몸을 움직이며 밝은 활력을 키워요.`;
        initialTags = ['#신나는율동', '#인기동요', '#신체발달'];
      } else if (/양치|배변|습관|치카|식사|예절|청결/.test(lowerT)) {
        initialMsg = `${cleanT}을(를) 통해 스스로 실천하며 바른 생활습관과 자립심을 기릅니다.`;
        initialTags = ['#생활습관', '#바른습관', '#스스로해요'];
      } else if (/공룡|동물|자연|과학|바다|우주/.test(lowerT)) {
        initialMsg = `${cleanT}의 신비로운 생태를 관찰하며 생명에 대한 따뜻한 호기심을 넓혀가요.`;
        initialTags = ['#호기심탐구', '#자연관찰', '#동물친구'];
      } else if (/동화|이솝|명작|옛날|전래/.test(lowerT)) {
        initialMsg = `${cleanT}의 이야기를 통해 서로를 배려하고 따뜻하게 보답하는 마음의 가치를 배워요.`;
        initialTags = ['#명작동화', '#상상력자극', '#마음성장'];
      }

      return {
        ...v,
        isSafe: true,
        analysis: {
          ...DEFAULT_ANALYSIS,
          oneLineMessage: initialMsg,
          situationTags: initialTags,
        },
        isAnalyzing: true,
      };
    });

    // Notify caller immediately to render videos on screen right away!
    if (onProgress) {
      onProgress(initialVideos);
    }

    // 4. STEP 2 (Background AI Enhancement): Fetch Chunked Gemini AI Analysis
    const uncachedVideos = rawVideos.filter((v) => !storageService.getCachedAnalysis(v.id));
    let batchAnalyses: Record<string, any> = {};

    if (uncachedVideos.length > 0) {
      batchAnalyses = await geminiService.analyzeBatch(
        uncachedVideos.map((v) => ({
          id: v.id,
          title: v.title,
          description: v.description,
          channelTitle: v.channelTitle,
          hasSubtitles: v.hasSubtitles,
        })),
        excludedWords
      );
    }

    // Merge Final AI Analysis Results
    const finalVideos: VideoItem[] = rawVideos.map((v) => {
      const cached = storageService.getCachedAnalysis(v.id);
      const aiResult = cached || batchAnalyses[v.id];
      if (aiResult) {
        return {
          ...v,
          hasSubtitles: aiResult.hasSubtitles ?? v.hasSubtitles,
          isSafe: aiResult.isSafe,
          safetyReason: aiResult.safetyReason,
          analysis: aiResult.analysis || DEFAULT_ANALYSIS,
          isAnalyzing: false,
        };
      }
      return {
        ...v,
        isSafe: true,
        analysis: DEFAULT_ANALYSIS,
        isAnalyzing: false,
      };
    });

    // Final progressive update to UI
    if (onProgress) {
      onProgress(finalVideos);
    }

    return {
      videos: finalVideos,
      nextPageToken: nextToken,
    };
  },
};
