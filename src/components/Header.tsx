import React from 'react';
import { Heart, Search, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'search' | 'liked';
  setActiveTab: (tab: 'search' | 'liked') => void;
  likedCount: number;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  likedCount,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F0]/90 backdrop-blur-md border-b border-[#EFE8DC] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        
        {/* Brand Logo - Pastel Kid Style */}
        <div 
          onClick={() => setActiveTab('search')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[20px] bg-gradient-to-tr from-[#FFE5D9] via-[#FFF3B0] to-[#D8F3DC] flex items-center justify-center text-[#E07A5F] shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 border border-[#F4E1D2] shrink-0">
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-[#E07A5F]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-[#2B2D42] tracking-tight flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                <span>키즈픽</span>
                <span className="text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 sm:px-2 rounded-full bg-[#E8F5EE] text-[#3D7068] border border-[#CDE8DA] leading-none">KidsPick</span>
              </h1>
            </div>
            <p className="hidden sm:block text-[11px] font-medium text-[#7D8597] whitespace-nowrap">부모가 안심하는 따뜻한 유아 맞춤 놀이터</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${
              activeTab === 'search'
                ? 'bg-[#3D7068] text-white shadow-md shadow-[#3D7068]/20'
                : 'text-[#4A5568] hover:bg-[#F3ECE0] hover:text-[#2D3748]'
            }`}
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span><span className="hidden sm:inline">안심 영상 </span>검색</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-300 ${
              activeTab === 'liked'
                ? 'bg-[#F28482] text-white shadow-md shadow-[#F28482]/20'
                : 'text-[#4A5568] hover:bg-[#FDE2E4] hover:text-[#E07A5F]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${likedCount > 0 ? 'fill-white' : ''}`} />
            <span>좋아요<span className="hidden sm:inline"> 영상</span></span>
            {likedCount > 0 && (
              <span className="ml-0.5 sm:ml-1 bg-white text-[#E07A5F] text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-black shadow-xs leading-none">
                {likedCount}
              </span>
            )}
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="API 키 및 보안 연동 상태 확인"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2.5 rounded-full font-bold text-xs text-[#3D7068] bg-[#E8F5EE] hover:bg-[#d8eee2] border border-[#CDE8DA] transition-colors shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-[#3D7068]" />
              <span className="hidden md:inline whitespace-nowrap">API 및 보안 설정</span>
            </button>
          )}
        </nav>

      </div>
    </header>
  );
};
