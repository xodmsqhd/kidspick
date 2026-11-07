export interface StimulationLevels {
  violence: string; // e.g. "없음", "낮음", "주의"
  language: string; // e.g. "건전함", "모방주의"
  tempo: string; // e.g. "잔잔함", "보통", "빠름"
}

export interface DetailedSafetyAnalysis {
  recommendedAge: string; // e.g. "권장 5세+"
  oneLineMessage: string; // e.g. "남을 돕는 이쁜 마음과 감사의 중요성을 깨달아요."
  stimulationLevels: StimulationLevels; // 자극도 지표 (폭력성/언어/화면템포)
  situationTags: string[]; // e.g. ["#은혜갚기", "#인성교육", "#전래동화"]
  pacingAndTone: string; // e.g. "잔잔한 낭독형 대화 오디오"
  dialogueTip: string; // e.g. "선비 아저씨가 까치를 구해줬을 때 까치의 마음은 어땠을까?"
  activityTip: string; // e.g. "오늘 주변의 고마웠던 사람에게 작은 그림 편지 그려주기"
  analysisSource?: 'transcript' | 'title_only'; // 자막 기반 분석 여부
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number; // in seconds
  durationFormatted: string; // e.g. "08:15"
  youtubeUrl: string;
  youtubeKidsUrl: string; // Direct YouTube Kids link
  transcript?: string;
  hasSubtitles?: boolean;
  
  // AI Detailed Safety & Educational Analysis
  isSafe: boolean;
  safetyReason?: string;
  analysis: DetailedSafetyAnalysis;
  matchedExcludedWords?: string[];
  isAnalyzing?: boolean;
}

export interface SearchFilters {
  keyword: string;
  maxDurationMinutes: number | null; // null means any, or 5, 10, 20, 30
  excludedWords: string[];
  requireSubtitlesOnly?: boolean;
}

export interface SearchResponse {
  videos: VideoItem[];
  nextPageToken?: string;
}

export interface ApiKeys {
  youtubeApiKey: string;
  geminiApiKey: string;
}
