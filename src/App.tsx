import { useEffect, useState } from 'react';
import type { SearchFilters, VideoItem } from './types';
import { storageService } from './services/storageService';
import { youtubeService } from './services/youtubeService';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { VideoCard } from './components/VideoCard';
import { LikedVideosView } from './components/LikedVideosView';
import { SettingsModal } from './components/SettingsModal';
import { Sparkles, AlertCircle, RefreshCw, ChevronDown, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'liked'>('search');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [likedVideos, setLikedVideos] = useState<VideoItem[]>(storageService.getLikedVideos());
  const [excludedWords, setExcludedWords] = useState<string[]>(storageService.getExcludedWords());

  // Search filter state
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '#유아동화',
    maxDurationMinutes: null,
    excludedWords: excludedWords,
    requireSubtitlesOnly: false,
  });

  // Results & Loading state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial load search & clear old template cache
  useEffect(() => {
    storageService.clearOldCache();
    handleSearch('#유아동화', filters.maxDurationMinutes, excludedWords, false);
  }, []);

  const handleSearch = async (
    keywordToSearch: string,
    durationLimit: number | null,
    currentExcludedWords: string[],
    requireSubs: boolean = false
  ) => {
    setIsLoading(true);
    try {
      const response = await youtubeService.searchVideos(
        keywordToSearch,
        durationLimit,
        currentExcludedWords,
        undefined,
        undefined,
        '',
        requireSubs,
        (progressiveVideos) => {
          // Instant progressive display: 0.3-0.5s response!
          setVideos(progressiveVideos);
          setIsLoading(false);
        }
      );
      setVideos(response.videos);
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      console.error('Error during video search:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await youtubeService.searchVideos(
        filters.keyword,
        filters.maxDurationMinutes,
        filters.excludedWords,
        undefined,
        undefined,
        nextPageToken,
        filters.requireSubtitlesOnly,
        (progressiveMore) => {
          setVideos((prev) => {
            const existingIds = new Set(prev.map((v) => v.id));
            const newOnes = progressiveMore.filter((v) => !existingIds.has(v.id));
            const updated = prev.map((v) => {
              const matched = progressiveMore.find((m) => m.id === v.id);
              return matched || v;
            });
            return [...updated, ...newOnes];
          });
          setIsLoadingMore(false);
        }
      );
      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const newOnes = response.videos.filter((v) => !existingIds.has(v.id));
        const updated = prev.map((v) => {
          const matched = response.videos.find((m) => m.id === v.id);
          return matched || v;
        });
        return [...updated, ...newOnes];
      });
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      console.error('Error loading more videos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearchSubmit = (keyword: string) => {
    setFilters((prev) => ({ ...prev, keyword }));
    handleSearch(keyword, filters.maxDurationMinutes, filters.excludedWords, filters.requireSubtitlesOnly);
  };

  const handleDurationChange = (minutes: number | null) => {
    setFilters((prev) => ({ ...prev, maxDurationMinutes: minutes }));
    handleSearch(filters.keyword, minutes, filters.excludedWords, filters.requireSubtitlesOnly);
  };

  const handleAddExcludedWord = (word: string) => {
    if (!excludedWords.includes(word)) {
      const updated = [...excludedWords, word];
      setExcludedWords(updated);
      storageService.saveExcludedWords(updated);
      setFilters((prev) => ({ ...prev, excludedWords: updated }));
      handleSearch(filters.keyword, filters.maxDurationMinutes, updated, filters.requireSubtitlesOnly);
    }
  };

  const handleRemoveExcludedWord = (word: string) => {
    const updated = excludedWords.filter((w) => w !== word);
    setExcludedWords(updated);
    storageService.saveExcludedWords(updated);
    setFilters((prev) => ({ ...prev, excludedWords: updated }));
    handleSearch(filters.keyword, filters.maxDurationMinutes, updated, filters.requireSubtitlesOnly);
  };

  const handleToggleRequireSubtitles = () => {
    const updated = !filters.requireSubtitlesOnly;
    setFilters((prev) => ({ ...prev, requireSubtitlesOnly: updated }));
    handleSearch(filters.keyword, filters.maxDurationMinutes, filters.excludedWords, updated);
  };

  const handleToggleLike = (video: VideoItem) => {
    const updated = storageService.toggleLikedVideo(video);
    setLikedVideos(updated);
  };

  const isVideoLiked = (id: string) => likedVideos.some((v) => v.id === id);

  // Safe vs Flagged counts
  const safeVideos = videos.filter((v) => v.isSafe);
  const excludedCount = videos.length - safeVideos.length;

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col font-sans text-[#2B2D42] selection:bg-[#F28482]/20">
      
      {/* 1. Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        likedCount={likedVideos.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {activeTab === 'search' ? (
          <>
            {/* Filter Controls Component */}
            <FilterBar
              filters={filters}
              onSearchSubmit={handleSearchSubmit}
              onDurationChange={handleDurationChange}
              onAddExcludedWord={handleAddExcludedWord}
              onRemoveExcludedWord={handleRemoveExcludedWord}
              onToggleRequireSubtitles={handleToggleRequireSubtitles}
              isLoading={isLoading}
            />

            {/* Status Summary Banner - Pastel Cream & Sage */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFDF9] p-4 sm:p-5 rounded-[24px] border border-[#EFE8DC] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-5 h-5 text-[#E07A5F]" />
                <span className="text-sm font-bold text-[#2B2D42]">
                  '{filters.keyword}' 검색 결과 ({safeVideos.length}개 안심 영상)
                </span>
                {filters.maxDurationMinutes && (
                  <span className="bg-[#E8F5EE] text-[#3D7068] text-xs px-3 py-1 rounded-full font-bold border border-[#CDE8DA]">
                    ⏱️ {filters.maxDurationMinutes}분 이내
                  </span>
                )}
                <span className="bg-[#FEE8DC] text-[#D05A3F] text-xs px-3 py-1 rounded-full font-bold border border-[#FCD2C0]">
                  🚫 쇼츠 자동 제외
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-[#E8F5EE] hover:bg-[#d5eee0] text-[#3D7068] text-xs px-3 py-1 rounded-full font-bold border border-[#CDE8DA] flex items-center gap-1 transition-colors cursor-pointer"
                  title="클릭하여 API 키 및 보안 상태 설정 확인"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>API 실시간 안심 연동</span>
                </button>
              </div>

              {excludedCount > 0 && (
                <div className="text-xs font-semibold text-[#D05A3F] bg-[#FEE8DC] px-3.5 py-1.5 rounded-full border border-[#FCD2C0] flex items-center gap-1.5 self-start sm:self-auto">
                  <AlertCircle className="w-4 h-4" />
                  <span>차단 단어 검출 영상 {excludedCount}개 숨김</span>
                </div>
              )}
            </div>

            {/* Video Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#3D7068] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#5C677D]">
                  안심 영상을 엄선하고 맞춤 요약 및 대화 팁을 불러오는 중입니다...
                </p>
              </div>
            ) : safeVideos.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {safeVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isLiked={isVideoLiked(video.id)}
                      onToggleLike={handleToggleLike}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {nextPageToken && (
                  <div className="text-center pt-4">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-8 py-3.5 rounded-full bg-[#FFFDF9] hover:bg-[#F3ECE0] border-2 border-[#E4DCCE] text-[#3D7068] font-bold text-sm shadow-xs transition-all inline-flex items-center gap-2 hover:shadow-sm disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#3D7068] border-t-transparent rounded-full animate-spin" />
                          <span>더 가져오는 중...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-5 h-5 text-[#3D7068]" />
                          <span>안심 영상 더보기</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#FFFDF9] rounded-[32px] p-12 text-center border border-[#EFE8DC] space-y-4">
                <div className="w-16 h-16 bg-[#FFF3B0] text-[#9C6644] rounded-full mx-auto flex items-center justify-center font-bold text-2xl">
                  🔍
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2B2D42]">조건에 부합하는 안심 영상이 없습니다</h3>
                  <p className="text-xs text-[#7D8597] mt-1">
                    키워드를 변경하시거나 영상 길이/제외 단어 필터 조건을 조정해 보세요.
                  </p>
                </div>
                <button
                  onClick={() => handleSearch('#유아동화', null, excludedWords, false)}
                  className="px-5 py-2.5 bg-[#3D7068] text-white rounded-full font-bold text-xs hover:bg-[#2F5953] transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 초기화 및 재검색
                </button>
              </div>
            )}
          </>
        ) : (
          /* Liked Videos Tab */
          <LikedVideosView
            likedVideos={likedVideos}
            onToggleLike={handleToggleLike}
            onClearAll={() => {
              storageService.saveLikedVideos([]);
              setLikedVideos([]);
            }}
          />
        )}

      </main>

      {/* 3. Kid-friendly Pastel Footer */}
      <footer className="bg-[#FFFDF9] border-t border-[#EFE8DC] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs font-bold text-[#5C677D] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#3D7068]" />
            <span>키즈픽 (KidsPick) - 부모와 아이 모두 안심하는 프리미엄 유아 콘텐츠 필터링</span>
          </p>
          <p className="text-[11px] text-[#9AA0A6]">
            YouTube Data API v3 & Google Gemini AI • 로컬 스마트 캐싱 지원
          </p>
        </div>
      </footer>

      {/* 4. Security Status & API Key Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveKeys={() => {
          handleSearch(filters.keyword, filters.maxDurationMinutes, excludedWords, filters.requireSubtitlesOnly);
        }}
      />

    </div>
  );
}
