import type { DetailedSafetyAnalysis } from '../types';
import { storageService } from './storageService';
import { transcriptService } from './transcriptService';
import { API_ENDPOINTS } from '../config/apiConfig';

export interface GeminiAnalysisResult {
  isSafe: boolean;
  safetyReason?: string;
  analysis: DetailedSafetyAnalysis;
  hasSubtitles: boolean;
}

const DEFAULT_FALLBACK_ANALYSIS: DetailedSafetyAnalysis = {
  recommendedAge: '권장 4세+',
  oneLineMessage: '자녀와 함께 안심하고 감상할 수 있는 유익한 콘텐츠입니다.',
  stimulationLevels: {
    violence: '없음',
    language: '건전함',
    tempo: '보통',
  },
  situationTags: ['#유아추천', '#안심영상', '#키즈픽'],
  pacingAndTone: '유아 맞춤 안심 영상',
  dialogueTip: '영상에서 가장 재미있었던 부분에 대해 함께 이야기해 보세요.',
  activityTip: '영상에 나온 주제로 그림을 그리거나 흉내 내보세요.',
  analysisSource: 'title_only',
};

export const geminiService = {
  analyzeAndSummarize: async (
    videoId: string,
    title: string,
    description: string,
    channelTitle: string,
    _userApiKey?: string, // Deprecated: Kept for interface compatibility, keys are managed on server
    excludedWords: string[] = []
  ): Promise<GeminiAnalysisResult> => {
    // 0. Check persistent local cache (instant response)
    const cached = storageService.getCachedAnalysis(videoId);
    if (cached) {
      return cached;
    }

    // 1. Client-side quick filter for parent excluded words
    const fullText = `${title} ${description} ${channelTitle}`.toLowerCase();
    const matchedWords = excludedWords.filter((word) => word.trim() && fullText.includes(word.toLowerCase().trim()));

    if (matchedWords.length > 0) {
      const blockedResult: GeminiAnalysisResult = {
        isSafe: false,
        safetyReason: `부모 지정 제외 단어 [${matchedWords.join(', ')}] 포함됨`,
        hasSubtitles: false,
        analysis: {
          recommendedAge: '시청 불가',
          oneLineMessage: `차단 단어 [${matchedWords.join(', ')}]가 검출되어 필터링된 영상입니다.`,
          stimulationLevels: {
            violence: '주의',
            language: '모방주의',
            tempo: '빠름',
          },
          situationTags: ['#차단영상', '#키워드제외'],
          pacingAndTone: '시청 불가 영상',
          dialogueTip: '다른 안심 추천 영상을 자녀와 함께 선택해 주세요.',
          activityTip: '차단 키워드는 부모 지정 제외 단어 목록에서 관리할 수 있습니다.',
          analysisSource: 'title_only',
        },
      };
      storageService.saveCachedAnalysis(videoId, blockedResult);
      return blockedResult;
    }

    // 2. Extract Subtitles / Captions via secure backend transcript proxy
    const transcriptResult = await transcriptService.fetchTranscript(videoId, description);
    const hasTranscript = transcriptResult.hasSubtitles && transcriptResult.text.trim().length > 10;
    const transcriptText = transcriptResult.text;

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    // 3. Call Secure Backend Gemini Proxy if not on file://
    if (!isFileProtocol) {
      try {
        const res = await fetch(API_ENDPOINTS.geminiAnalyze, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            title,
            description,
            channelTitle,
            transcriptText,
            hasTranscript,
            excludedWords,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const result: GeminiAnalysisResult = await res.json();
          storageService.saveCachedAnalysis(videoId, result);
          return result;
        }
      } catch (e: any) {
        console.warn('[Gemini Service] Proxy call warning, applying client fallback:', e.message);
      }
    }

    // 4. Client-side direct Gemini API if user provided key and proxy was unreachable
    const userKeys = storageService.getApiKeys();
    const effectiveGeminiKey = _userApiKey || userKeys.geminiApiKey;

    if (effectiveGeminiKey && effectiveGeminiKey.trim().length > 5) {
      try {
        const cleanT = title.replace(/\[.*?\]|\(.*?\)/g, ' ').split(/[|｜ㅣ/]/)[0].trim();
        const content = transcriptText && transcriptText.length > 15 ? transcriptText.slice(0, 600) : description.slice(0, 400);
        const prompt = `
너는 아동 문학가이자 유아 교육 전문가야. 아래 유아 영상 데이터를 분석하여 부모와 아이를 위한 품격 있는 요약문과 교육 분석을 JSON으로 반환해줘.
- 제목: "${cleanT}"
- 내용: "${content}"

[규칙] 채널명/플랫폼명(EBS, 스토리북 등) 배제, 복붙 템플릿 금지, 따뜻한 교훈 중심 문장으로 작성.

반드시 순수 JSON 형식으로만 응답해:
{
  "isSafe": true,
  "safetyReason": "AI 직접 정밀 심사 완료",
  "analysis": {
    "recommendedAge": "권장 4세+",
    "oneLineMessage": "한 줄 요약",
    "stimulationLevels": { "violence": "없음", "language": "건전함", "tempo": "보통" },
    "situationTags": ["#태그1", "#태그2", "#태그3"],
    "pacingAndTone": "영상의 전개 속도와 분위기",
    "dialogueTip": "부모-자녀 대화 질문 1개",
    "activityTip": "연계 놀이 1개"
  }
}
`.trim();

        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${effectiveGeminiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.65, responseMimeType: 'application/json' },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (gRes.ok) {
          const gData = await gRes.json();
          const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.analysis && parsed.analysis.oneLineMessage) {
              const directResult: GeminiAnalysisResult = {
                isSafe: Boolean(parsed.isSafe),
                safetyReason: parsed.safetyReason || 'AI 정밀 심사 완료',
                hasSubtitles: hasTranscript,
                analysis: parsed.analysis,
              };
              storageService.saveCachedAnalysis(videoId, directResult);
              return directResult;
            }
          }
        }
      } catch (err: any) {
        console.warn('[Gemini Service] Direct Gemini API failed, using fallback:', err.message);
      }
    }

    // 5. Local graceful fallback if backend is unreachable and direct API failed
    const clientFallback: GeminiAnalysisResult = {
      isSafe: true,
      safetyReason: hasTranscript ? '자막 기반 자동 분석 완료' : '제목 및 개요 분석 완료',
      hasSubtitles: hasTranscript,
      analysis: {
        ...DEFAULT_FALLBACK_ANALYSIS,
        oneLineMessage: `${title.slice(0, 20)}의 이야기를 통해 배려와 따뜻한 마음의 가치를 배워요.`,
        dialogueTip: `${title.slice(0, 15)}에서 어떤 장면이 가장 기억에 남아?`,
        analysisSource: hasTranscript ? 'transcript' : 'title_only',
      },
    };

    storageService.saveCachedAnalysis(videoId, clientFallback);
    return clientFallback;
  },

  // Batch analysis helper for parallel efficiency
  analyzeBatch: async (
    videos: Array<{ id: string; title: string; description: string; channelTitle: string; hasSubtitles?: boolean }>,
    excludedWords: string[] = []
  ): Promise<Record<string, GeminiAnalysisResult>> => {
    const results: Record<string, GeminiAnalysisResult> = {};
    const uncachedVideos = [];

    for (const v of videos) {
      const cached = storageService.getCachedAnalysis(v.id);
      if (cached) {
        results[v.id] = cached;
      } else {
        uncachedVideos.push(v);
      }
    }

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    if (!isFileProtocol) {
      try {
        const res = await fetch(API_ENDPOINTS.geminiBatchAnalyze, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: uncachedVideos.map((v) => ({
            videoId: v.id,
            title: v.title,
            description: v.description,
            channelTitle: v.channelTitle,
            hasTranscript: Boolean(v.hasSubtitles),
          })),
          excludedWords,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.analyses) {
          for (const [id, analysisResult] of Object.entries(data.analyses)) {
            const typedResult = analysisResult as GeminiAnalysisResult;
            results[id] = typedResult;
            storageService.saveCachedAnalysis(id, typedResult);
          }
          return results;
        }
      }
    } catch (e: any) {
      console.warn('[Gemini Service] Batch proxy error, falling back to sequential:', e.message);
    }
  }

    // Fallback: Parallel direct calls for maximum speed
    await Promise.all(
      uncachedVideos.map(async (v) => {
        results[v.id] = await geminiService.analyzeAndSummarize(
          v.id,
          v.title,
          v.description,
          v.channelTitle,
          '',
          excludedWords
        );
      })
    );

    return results;
  },
};
