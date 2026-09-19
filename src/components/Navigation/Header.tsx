import React from 'react';
import { Mic, Globe, Menu, Shield, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { LanguageCode } from '../../types';

export const Header: React.FC<{ onMobileMenuToggle?: () => void }> = ({ onMobileMenuToggle }) => {
  const { profile, updateProfile, openVoiceModal, t, activeTab, serverStatus } = useApp();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as LanguageCode;
    updateProfile({
      interfaceLanguage: newLang,
      responseLanguage: profile.useSameLanguage ? newLang : profile.responseLanguage,
      voiceLanguage: profile.useSameLanguage ? newLang : profile.voiceLanguage,
    });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-10 sticky top-0">
      {/* Left title & mobile toggle */}
      <div className="flex items-center gap-3">
        <button
          id="btn-mobile-menu"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 tracking-tight">
              {t.appName}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3 text-amber-600" />
              {t.demoDataBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            {t.appSubtitle}
          </p>
        </div>
      </div>

      {/* Right controls: Language, Voice, Status */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <select
            id="select-header-language"
            value={profile.interfaceLanguage}
            onChange={handleLanguageChange}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* Dedicated Voice Assistant launch button */}
        <button
          id="btn-header-voice-mic"
          onClick={openVoiceModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          title="Open Voice Assistant"
        >
          <Mic className="w-4 h-4 text-emerald-100" />
          <span className="hidden md:inline">{t.navVoice}</span>
        </button>

        {/* Backend health status badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-slate-50 border border-slate-200 text-slate-600"
          title={serverStatus.geminiConfigured ? 'Gemini AI Live' : 'Deterministic Grounded Engine'}
        >
          <span className={`w-2 h-2 rounded-full ${serverStatus.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="hidden lg:inline font-mono font-medium">
            {serverStatus.geminiConfigured ? 'Gemini 3.8 Flash' : 'RAG Grounded'}
          </span>
        </div>
      </div>
    </header>
  );
};
