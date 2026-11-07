import React from 'react';
import {
  BookOpen,
  ExternalLink,
  Heart,
  MessageCircleQuestion,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Subtitles,
  Zap,
} from 'lucide-react';
import type { VideoItem } from '../types';

interface VideoCardProps {
  video: VideoItem;
  isLiked: boolean;
  onToggleLike: (video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isLiked,
  onToggleLike,
}) => {
  const { analysis } = video;

  return (
    <div className="bg-[#FFFDF9] rounded-[28px] overflow-hidden border border-[#EFE8DC] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(61,112,104,0.08)] transition-all duration-300 flex flex-col h-full group">
      
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-[#FAF7F0] overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Duration Badge */}
        <span className="absolute bottom-3 right-3 bg-[#2B2D42]/80 text-white text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-xs">
          {video.durationFormatted}
        </span>

        {/* Subtitles Status Badge */}
        {video.hasSubtitles && (
          <span className="absolute bottom-3 left-3 bg-[#3D7068]/90 text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold backdrop-blur-xs flex items-center gap-1">
            <Subtitles className="w-3 h-3 text-[#D8F3DC]" /> 자막 지원
          </span>
        )}

        {/* Safety Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          {video.isAnalyzing ? (
            <span className="inline-flex items-center gap-1 bg-[#3D7068]/95 text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs backdrop-blur-xs animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#FFF3B0]" /> AI 분석 중...
            </span>
          ) : video.isSafe ? (
            <span className="inline-flex items-center gap-1 bg-[#3D7068]/95 text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> 안심 영상
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-[#F28482]/95 text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs backdrop-blur-xs">
              <ShieldAlert className="w-3.5 h-3.5" /> 주의 영상
            </span>
          )}

          {/* Recommended Age Badge */}
          {analysis?.recommendedAge && (
            <span className={`inline-flex items-center text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-xs ${video.isAnalyzing ? 'bg-[#E07A5F]/80' : 'bg-[#E07A5F]'}`}>
              {analysis.recommendedAge}
            </span>
          )}
        </div>

        {/* Heart / Like Button */}
        <button
          type="button"
          onClick={() => onToggleLike(video)}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
            isLiked
              ? 'bg-[#F28482] text-white shadow-md shadow-[#F28482]/30 scale-110'
              : 'bg-white/80 hover:bg-white text-[#7D8597] hover:text-[#F28482] backdrop-blur-xs'
          }`}
          title={isLiked ? '좋아요 취소' : '좋아요 한 영상에 저장'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        
        <div className="space-y-3">
          {/* Title */}
          <h3 className="font-bold text-[#2B2D42] text-base leading-snug line-clamp-2 group-hover:text-[#3D7068] transition-colors">
            {video.title}
          </h3>
          
          {/* Channel Name & Date */}
          <div className="flex items-center justify-between text-xs text-[#7D8597] font-medium">
            <span className="truncate max-w-[70%]">{video.channelTitle}</span>
            <span>{video.publishedAt}</span>
          </div>

          {/* PARENT ANALYSIS CARD */}
          {analysis && (
            <div className="bg-[#FAF7F0] border border-[#EFE8DC] rounded-2xl p-4 space-y-3 text-xs">
              
              {/* 1. One-Line Message - Standard Clean Font */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#3D7068] flex items-center gap-1 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                    핵심 요약
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {video.isAnalyzing ? (
                      <span className="text-[10px] font-bold text-[#E07A5F] bg-[#FFE5D9] px-2 py-0.5 rounded-full border border-[#F4E1D2] flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 text-[#E07A5F]" /> AI 분석 중
                      </span>
                    ) : analysis.analysisSource === 'transcript' || video.hasSubtitles ? (
                      <span className="text-[10px] font-bold text-[#3D7068] bg-[#E8F5EE] px-2 py-0.5 rounded-full border border-[#CDE8DA] flex items-center gap-1">
                        <Subtitles className="w-3 h-3 text-[#3D7068]" /> 자막+제목 분석
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#7D8597] bg-[#EFE8DC]/60 px-2 py-0.5 rounded-full border border-[#E4DCCE]">
                        자막 미제공 (제목 분석)
                      </span>
                    )}
                  </div>
                </div>
                {/* Regular Normal Font for One-line message as requested */}
                <p className="font-normal text-[#2B2D42] text-sm leading-relaxed">
                  {analysis.oneLineMessage}
                </p>
              </div>

              {/* 2. Stimulation Levels */}
              {analysis.stimulationLevels && (
                <div className="space-y-1">
                  <span className="font-bold text-[#5C677D] text-[11px] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#E07A5F]" />
                    {video.hasSubtitles ? '자막 기반 자극도 지표:' : '콘텐츠 자극도 지표:'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-white p-1.5 rounded-xl border border-[#EFE8DC]">
                      <span className="block text-[10px] text-[#9AA0A6] font-semibold">폭력성</span>
                      <span className="font-bold text-[#2B2D42] text-xs">{analysis.stimulationLevels.violence}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-[#EFE8DC]">
                      <span className="block text-[10px] text-[#9AA0A6] font-semibold">언어</span>
                      <span className="font-bold text-[#2B2D42] text-xs">{analysis.stimulationLevels.language}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-[#EFE8DC]">
                      <span className="block text-[10px] text-[#9AA0A6] font-semibold">화면템포</span>
                      <span className="font-bold text-[#2B2D42] text-xs">{analysis.stimulationLevels.tempo}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Situation Tags */}
              {analysis.situationTags && analysis.situationTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {analysis.situationTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-[#FFF3B0]/60 text-[#9C6644] text-[11px] font-bold border border-[#F5E6A3]/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <hr className="border-[#EFE8DC]" />

              {/* 4 & 5. Parent-Child Interactive Tips */}
              <div className="space-y-2 bg-white/90 p-3 rounded-xl border border-[#EFE8DC]">
                <div className="flex items-start gap-1.5 text-[#2B2D42]">
                  <MessageCircleQuestion className="w-3.5 h-3.5 text-[#3D7068] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[11px] text-[#3D7068]">대화 팁: </span>
                    <span className="font-normal text-[11px] text-[#4A5568]">"{analysis.dialogueTip}"</span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[#2B2D42]">
                  <BookOpen className="w-3.5 h-3.5 text-[#E07A5F] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[11px] text-[#E07A5F]">연계 놀이: </span>
                    <span className="font-normal text-[11px] text-[#4A5568]">{analysis.activityTip}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* YouTube Kids Button */}
          <a
            href={video.youtubeKidsUrl || video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-full bg-[#3D7068] hover:bg-[#2F5953] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>유튜브 키즈로 보기</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          {/* Regular YouTube Button */}
          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-full bg-[#FAF7F0] hover:bg-[#F3ECE0] text-[#5C677D] font-semibold text-xs flex items-center justify-center gap-2 border border-[#EFE8DC] transition-all"
          >
            <span>유튜브 앱/웹에서 보기</span>
            <ExternalLink className="w-3 h-3 text-[#9AA0A6]" />
          </a>
        </div>

      </div>

    </div>
  );
};
