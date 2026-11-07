import React, { useState } from 'react';
import { Heart, Search, Trash2 } from 'lucide-react';
import type { VideoItem } from '../types';
import { VideoCard } from './VideoCard';

interface LikedVideosViewProps {
  likedVideos: VideoItem[];
  onToggleLike: (video: VideoItem) => void;
  onClearAll: () => void;
}

export const LikedVideosView: React.FC<LikedVideosViewProps> = ({
  likedVideos,
  onToggleLike,
  onClearAll,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = likedVideos.filter(
    (v) =>
      v.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      v.channelTitle.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner - Soft Pastel Peach & Cream */}
      <div className="bg-gradient-to-r from-[#F28482] via-[#F4A261] to-[#E9C46A] rounded-[32px] p-6 sm:p-8 text-white shadow-[0_8px_30px_rgba(242,132,130,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Heart className="w-7 h-7 fill-white" />
            좋아요 한 안심 영상 모음
          </h2>
          <p className="text-xs sm:text-sm text-white/90 font-medium mt-1">
            부모님이 자녀를 위해 엄선하여 저장해둔 보물같은 맞춤 동영상 창고입니다.
          </p>
        </div>
        
        {likedVideos.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto backdrop-blur-xs shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            전체 비우기
          </button>
        )}
      </div>

      {/* Empty State */}
      {likedVideos.length === 0 ? (
        <div className="bg-[#FFFDF9] rounded-[32px] p-12 text-center border border-[#EFE8DC] space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#FDE2E4] text-[#F28482] mx-auto flex items-center justify-center">
            <Heart className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2B2D42]">아직 저장된 영상이 없습니다</h3>
            <p className="text-xs text-[#7D8597] mt-1">
              검색 페이지에서 영상 하트(❤️) 버튼을 눌러 자녀에게 안심하고 보여줄 영상을 모아보세요.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Inner Search Filter */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D8597]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="저장된 영상 중 검색..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-[#FFFDF9] border border-[#E4DCCE] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#F28482]/30 text-[#2B2D42]"
            />
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isLiked={true}
                onToggleLike={onToggleLike}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
};
