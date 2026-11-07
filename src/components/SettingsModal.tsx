import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Key, Save, Check } from 'lucide-react';
import type { ApiKeys } from '../types';
import { API_ENDPOINTS } from '../config/apiConfig';
import { storageService } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys?: ApiKeys;
  onSaveKeys?: (keys: ApiKeys) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaveKeys,
}) => {
  const [proxyStatus, setProxyStatus] = useState<{
    isServerActive: boolean;
    hasYoutubeKey: boolean;
    hasGeminiKey: boolean;
    securityMode: string;
    checked: boolean;
  }>({
    isServerActive: false,
    hasYoutubeKey: false,
    hasGeminiKey: false,
    securityMode: 'unknown',
    checked: false,
  });

  const [inputKeys, setInputKeys] = useState<ApiKeys>({
    youtubeApiKey: '',
    geminiApiKey: '',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 1. Load locally stored keys
      const stored = storageService.getApiKeys();
      setInputKeys(stored);
      setSavedSuccess(false);

      // 2. Check if backend server proxy is running
      fetch(API_ENDPOINTS.health)
        .then((res) => {
          if (!res.ok) throw new Error('Server proxy not available');
          return res.json();
        })
        .then((data) => {
          setProxyStatus({
            isServerActive: true,
            hasYoutubeKey: Boolean(data.hasYoutubeKey) || Boolean(stored.youtubeApiKey && stored.youtubeApiKey.length > 10),
            hasGeminiKey: Boolean(data.hasGeminiKey) || Boolean(stored.geminiApiKey && stored.geminiApiKey.length > 5),
            securityMode: data.securityMode || 'server_proxy',
            checked: true,
          });
        })
        .catch(() => {
          setProxyStatus({
            isServerActive: false,
            hasYoutubeKey: Boolean(stored.youtubeApiKey && stored.youtubeApiKey.length > 10),
            hasGeminiKey: Boolean(stored.geminiApiKey && stored.geminiApiKey.length > 5),
            securityMode: 'client_direct',
            checked: true,
          });
        });
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveApiKeys(inputKeys);
    setProxyStatus((prev) => ({
      ...prev,
      hasYoutubeKey: Boolean(inputKeys.youtubeApiKey && inputKeys.youtubeApiKey.trim().length > 10),
      hasGeminiKey: Boolean(inputKeys.geminiApiKey && inputKeys.geminiApiKey.trim().length > 5),
    }));
    setSavedSuccess(true);
    if (onSaveKeys) {
      onSaveKeys(inputKeys);
    }
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  if (!isOpen) return null;

  const isConnectedYoutube = proxyStatus.hasYoutubeKey || (inputKeys.youtubeApiKey && inputKeys.youtubeApiKey.length > 10);
  const isConnectedGemini = proxyStatus.hasGeminiKey || (inputKeys.geminiApiKey && inputKeys.geminiApiKey.length > 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-amber-100 relative space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">API 키 연동 및 보안 설정</h2>
            <p className="text-xs text-slate-500">
              {proxyStatus.isServerActive
                ? '보안 백엔드 서버 프록시가 정상 작동 중입니다.'
                : 'HTML 단독 실행 및 깃허브 배포를 위한 브라우저 직접 연동 모드입니다.'}
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-600">YouTube Data API</p>
            <div className="mt-1 flex items-center gap-1.5">
              {isConnectedYoutube ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 연동 완료
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" /> 키 미등록 (목데이터)
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-bold text-slate-600">Google Gemini AI</p>
            <div className="mt-1 flex items-center gap-1.5">
              {isConnectedGemini ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 연동 완료
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" /> 키 미등록 (템플릿)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Direct Key Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>YouTube Data API v3 Key</span>
              <span className="text-[11px] text-slate-400 font-normal">AI Studio / Google Cloud</span>
            </label>
            <input
              type="password"
              placeholder="YouTube API 키를 입력하세요 (선택)"
              value={inputKeys.youtubeApiKey}
              onChange={(e) => setInputKeys({ ...inputKeys, youtubeApiKey: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#3D7068] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Google Gemini AI API Key</span>
              <span className="text-[11px] text-slate-400 font-normal">Google AI Studio</span>
            </label>
            <input
              type="password"
              placeholder="Gemini API 키를 입력하세요 (선택)"
              value={inputKeys.geminiApiKey}
              onChange={(e) => setInputKeys({ ...inputKeys, geminiApiKey: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#3D7068] focus:bg-white transition-all"
            />
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-100">
            💡 입력하신 API 키는 외부 서버로 전송되지 않고 본인 브라우저(localStorage)에만 안전하게 보관되어, 단독 실행 HTML 및 깃허브 배포 페이지에서도 즉시 실시간 API를 호출할 수 있습니다.
          </p>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#3D7068] text-white font-bold text-xs hover:bg-[#2F5953] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>저장 및 연동 완료!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>API 키 저장 및 즉시 연동</span>
              </>
            )}
          </button>
        </form>

        {/* Close Action */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            창 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
