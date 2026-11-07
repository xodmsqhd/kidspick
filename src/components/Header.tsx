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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo - Pastel Kid Style */}
        <div 
          onClick={() => setActiveTab('search')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-12 h-12 rounded-[20px] bg-gradient-to-tr from-[#FFE5D9] via-[#FFF3B0] to-[#D8F3DC] flex items-center justify-center text-[#E07A5F] shadow-sm group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 border border-[#F4E1D2]">
            <Sparkles className="w-6 h-6 text-[#E07A5F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#2B2D42] tracking-tight flex items-center gap-1.5">
                <span>키즈픽</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#3D7068] border border-[#CDE8DA]">KidsPick</span>
              </h1>
            </div>
            <p className="text-[11px] font-medium text-[#7D8597]">부모가 안심하는 따뜻한 유아 맞춤 놀이터</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${
              activeTab === 'search'
                ? 'bg-[#3D7068] text-white shadow-md shadow-[#3D7068]/20'
                : 'text-[#4A5568] hover:bg-[#F3ECE0] hover:text-[#2D3748]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>안심 영상 검색</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${
              activeTab === 'liked'
                ? 'bg-[#F28482] text-white shadow-md shadow-[#F28482]/20'
                : 'text-[#4A5568] hover:bg-[#FDE2E4] hover:text-[#E07A5F]'
            }`}
          >
            <Heart className={`w-4 h-4 ${likedCount > 0 ? 'fill-white' : ''}`} />
            <span>좋아요 영상</span>
            {likedCount > 0 && (
              <span className="ml-1 bg-white text-[#E07A5F] text-xs px-2 py-0.5 rounded-full font-black shadow-xs">
                {likedCount}
              </span>
            )}
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="API 키 및 보안 연동 상태 확인"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-full font-bold text-xs text-[#3D7068] bg-[#E8F5EE] hover:bg-[#d8eee2] border border-[#CDE8DA] transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#3D7068]" />
              <span className="hidden md:inline">API 및 보안 설정</span>
            </button>
          )}
        </nav>

      </div>
    </header>
  );
};
