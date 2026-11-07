import React, { useState } from 'react';
import { Clock, Filter, Plus, Search, ShieldCheck, Tag, X, Subtitles } from 'lucide-react';
import type { SearchFilters } from '../types';

interface FilterBarProps {
  filters: SearchFilters;
  onSearchSubmit: (keyword: string) => void;
  onDurationChange: (minutes: number | null) => void;
  onAddExcludedWord: (word: string) => void;
  onRemoveExcludedWord: (word: string) => void;
  onToggleRequireSubtitles?: () => void;
  isLoading: boolean;
}

const PRESET_HASHTAGS = [
  '#유아동화',
  '#인기동요',
  '#어린이영어',
  '#숫자놀이',
  '#공룡탐험',
  '#뽀로로',
  '#핑크퐁',
  '#자장가',
];

const PRESET_EXCLUDED_SUGGESTIONS = [
  '욕설',
  '비속어',
  '폭력',
  '괴물',
  '슬라임',
  '피',
  '장난감소개',
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onSearchSubmit,
  onDurationChange,
  onAddExcludedWord,
  onRemoveExcludedWord,
  onToggleRequireSubtitles,
  isLoading,
}) => {
  const [searchInput, setSearchInput] = useState(filters.keyword);
  const [newExcludedWord, setNewExcludedWord] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchInput);
  };

  const handleHashtagClick = (tag: string) => {
    setSearchInput(tag);
    onSearchSubmit(tag);
  };

  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newExcludedWord.trim()) {
      onAddExcludedWord(newExcludedWord.trim());
      setNewExcludedWord('');
    }
  };

  return (
    <div className="bg-[#FFFDF9] rounded-[32px] p-6 sm:p-8 border border-[#EFE8DC] shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-6">
      
      {/* 1. Main Keyword / Hashtag Search Bar - Soft Pastel Cream */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3D7068]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="#유아동화, #인기동요 또는 검색어를 입력하세요..."
            className="w-full pl-14 pr-5 py-4 rounded-full bg-[#FAF7F0] border border-[#E4DCCE] focus:outline-none focus:ring-2 focus:ring-[#3D7068]/30 focus:bg-white font-medium text-[#2B2D42] transition-all placeholder:text-[#9AA0A6] text-sm sm:text-base shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-4 rounded-full bg-[#3D7068] hover:bg-[#2F5953] text-white font-bold text-sm shadow-md shadow-[#3D7068]/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          <span>안심 영상 찾기</span>
        </button>
      </form>

      {/* Recommended Hashtags Preset Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-[#7D8597] flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-[#E07A5F]" /> 추천 주제:
        </span>
        {PRESET_HASHTAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleHashtagClick(tag)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              filters.keyword === tag
                ? 'bg-[#E07A5F] text-white shadow-sm shadow-[#E07A5F]/20'
                : 'bg-[#FAF7F0] hover:bg-[#F3ECE0] text-[#5C677D] border border-[#EBE3D5]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <hr className="border-[#EFE8DC]" />

      {/* 2. Duration Filters & Excluded Words Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Requirement 5: Duration Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#5C677D] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#3D7068]" />
            영상 길이 제한 (이내)
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '전체 (제한없음)', value: null },
              { label: '5분 이내', value: 5 },
              { label: '10분 이내', value: 10 },
              { label: '20분 이내', value: 20 },
              { label: '30분 이내', value: 30 },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => onDurationChange(option.value)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
                  filters.maxDurationMinutes === option.value
                    ? 'bg-[#3D7068] text-white shadow-sm'
                    : 'bg-[#FAF7F0] hover:bg-[#F3ECE0] text-[#5C677D] border border-[#EBE3D5]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Excluded Words Manager */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#5C677D] flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#F28482]" />
            부모 지정 제외 단어 (해당 단어 포함 영상 자동 제외)
          </label>

          {/* Input to add excluded word */}
          <form onSubmit={handleAddWordSubmit} className="flex gap-2">
            <input
              type="text"
              value={newExcludedWord}
              onChange={(e) => setNewExcludedWord(e.target.value)}
              placeholder="제외할 단어 입력 (ex: 욕설, 공포)"
              className="flex-1 px-4 py-2 text-xs rounded-full bg-[#FAF7F0] border border-[#E4DCCE] focus:outline-none focus:ring-1 focus:ring-[#F28482]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#F28482] hover:bg-[#E56B6F] text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 추가
            </button>
          </form>

          {/* Active Excluded Tags */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
            {filters.excludedWords.length === 0 ? (
              <span className="text-xs text-[#9AA0A6] italic">등록된 제외 단어가 없습니다.</span>
            ) : (
              filters.excludedWords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FEE8DC] text-[#D05A3F] border border-[#FCD2C0] text-xs font-bold"
                >
                  {word}
                  <button
                    type="button"
                    onClick={() => onRemoveExcludedWord(word)}
                    className="hover:text-rose-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Suggestions */}
          <div className="text-[11px] text-[#9AA0A6] flex items-center gap-1 flex-wrap pt-0.5">
            <span>빠른 추가:</span>
            {PRESET_EXCLUDED_SUGGESTIONS.map((word) => {
              if (filters.excludedWords.includes(word)) return null;
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => onAddExcludedWord(word)}
                  className="hover:underline text-[#E07A5F] font-semibold"
                >
                  +{word}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Safety Status Badges & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#E8F5EE] border border-[#CDE8DA] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3D7068] animate-pulse" />
          <ShieldCheck className="w-4 h-4 text-[#3D7068]" />
          <span className="text-xs font-bold text-[#2C524C]">
            유튜브 키즈 1차 엄선 + 쇼츠(Shorts) 자동 제외 + AI 부적합 언어 스크리닝 활성
          </span>
        </div>

        {onToggleRequireSubtitles && (
          <button
            type="button"
            onClick={onToggleRequireSubtitles}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto ${
              filters.requireSubtitlesOnly
                ? 'bg-[#3D7068] text-white shadow-xs'
                : 'bg-white text-[#3D7068] border border-[#CDE8DA] hover:bg-[#FAF7F0]'
            }`}
          >
            <Subtitles className="w-3.5 h-3.5" />
            {filters.requireSubtitlesOnly ? '자막 있는 영상만 보기 ON' : '자막 영상만 보기 OFF'}
          </button>
        )}
      </div>

    </div>
  );
};
