import React from 'react';
import {
  MessageSquare,
  ListTodo,
  FileText,
  ShieldCheck,
  Mic,
  BookOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Home: React.FC = () => {
  const { profile, setActiveTab, openVoiceModal, t, grievanceData } = useApp();

  const cards = [
    {
      id: 'ask',
      title: t.askCardTitle,
      description: t.askCardDesc,
      icon: MessageSquare,
      badge: 'RAG Grounded',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-600 text-white',
      action: () => setActiveTab('ask'),
    },
    {
      id: 'guided',
      title: t.guidedCardTitle,
      description: t.guidedCardDesc,
      icon: ListTodo,
      badge: '5 Workflows',
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-600 text-white',
      action: () => setActiveTab('guided'),
    },
    {
      id: 'grievance',
      title: t.grievanceCardTitle,
      description: t.grievanceCardDesc,
      icon: FileText,
      badge: 'PDF / TXT Export',
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-600 text-white',
      action: () => setActiveTab('grievance'),
    },
    {
      id: 'rights',
      title: t.rightsCardTitle,
      description: t.rightsCardDesc,
      icon: ShieldCheck,
      badge: 'Bylaw Backed',
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400',
      iconBg: 'bg-purple-600 text-white',
      action: () => setActiveTab('rights'),
    },
    {
      id: 'voice',
      title: t.voiceCardTitle,
      description: t.voiceCardDesc,
      icon: Mic,
      badge: '12 Languages',
      color: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-400',
      iconBg: 'bg-teal-600 text-white',
      action: () => openVoiceModal(),
    },
    {
      id: 'knowledge',
      title: t.knowledgeCardTitle,
      description: t.knowledgeCardDesc,
      icon: BookOpen,
      badge: 'Statutory Docs',
      color: 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400',
      iconBg: 'bg-slate-700 text-white',
      action: () => setActiveTab('knowledge'),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Personalized Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Cooperative & Legal Helpdesk</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {profile.name ? `Welcome back, ${profile.name} 👋` : t.welcomeHero}
          </h2>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed mb-6 font-normal">
            {t.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-hero-ask-now"
              onClick={() => setActiveTab('ask')}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs sm:text-sm hover:bg-emerald-50 shadow-md transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>{t.askCardTitle}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>

            <button
              id="btn-hero-voice"
              onClick={openVoiceModal}
              className="px-5 py-2.5 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm border border-emerald-500/40 transition-all flex items-center gap-2"
            >
              <Mic className="w-4 h-4 text-emerald-200" />
              <span>{t.voiceCardTitle}</span>
            </button>
          </div>
        </div>

        {/* Profile metadata pills inside hero */}
        <div className="mt-6 pt-4 border-t border-emerald-700/50 flex flex-wrap items-center gap-4 text-xs text-emerald-200/80">
          <span>Role: <strong className="text-white">{profile.role}</strong></span>
          <span>•</span>
          <span>Society: <strong className="text-white">{profile.societyName || 'General'}</strong></span>
          <span>•</span>
          <span>State: <strong className="text-white">{profile.state}</strong></span>
          <span>•</span>
          <span>Language: <strong className="text-white">{profile.interfaceLanguage.toUpperCase()}</strong></span>
        </div>
      </div>

      {/* Active in-progress task resume banner if grievance is in progress */}
      {grievanceData.issueDescription && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                {t.activeWorkflowNotice}: {grievanceData.issueCategory} Grievance
              </p>
              <p className="text-xs text-amber-700 line-clamp-1">
                {grievanceData.issueDescription}
              </p>
            </div>
          </div>
          <button
            id="btn-home-resume-grievance"
            onClick={() => setActiveTab('grievance')}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow-xs"
          >
            {t.resumeTaskBtn}
          </button>
        </div>
      )}

      {/* Primary 6 Large Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Cooperative Services & Helpdesk
          </h3>
          <span className="text-xs text-slate-500">Select an action to proceed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                id={`card-${card.id}`}
                onClick={card.action}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${card.color} group relative flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${card.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-700 shadow-2xs">
                      {card.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-emerald-700 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {card.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          {t.sampleQuestionsLabel}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[t.suggestedQ1, t.suggestedQ2, t.suggestedQ3, t.suggestedQ4].map((q, idx) => (
            <button
              key={idx}
              id={`btn-home-suggested-${idx}`}
              onClick={() => {
                setActiveTab('ask');
              }}
              className="text-left p-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
            >
              <span>{q}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
