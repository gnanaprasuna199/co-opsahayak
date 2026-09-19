import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Send,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { voiceManager } from '../../services/voiceService';
import { sendChatMessage } from '../../services/api';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';
import { LanguageCode } from '../../types';

export const VoiceAssistantModal: React.FC = () => {
  const {
    isVoiceModalOpen,
    closeVoiceModal,
    profile,
    updateProfile,
    messages,
    addMessage,
    setSelectedSource,
    t,
  } = useApp();

  type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [agentAnswer, setAgentAnswer] = useState<string>('');
  const [voiceSources, setVoiceSources] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>([]);

  // Configure sample questions based on voice language
  useEffect(() => {
    if (profile.voiceLanguage === 'te') {
      setSampleQuestions([
        'నా సహకార సంఘ ఎన్నికలలో నేను ఓటు వేయవచ్చా?',
        'సొసైటీ ఆడిట్ రికార్డులను చూసే హక్కు నాకు ఉందా?',
        'మేనేజింగ్ కమిటీపై ఫిర్యాదు ఎలా చేయాలి?',
      ]);
    } else if (profile.voiceLanguage === 'hi') {
      setSampleQuestions([
        'क्या मैं समिति के चुनाव में वोट दे सकता हूँ?',
        'सहकारी समिति में सदस्य के अधिकार क्या हैं?',
        'प्रबंध समिति के खिलाफ शिकायत कैसे दर्ज करें?',
      ]);
    } else {
      setSampleQuestions([
        'Can I vote in my cooperative election?',
        'What are my rights to inspect society audit reports?',
        'How do I file a grievance against the managing committee?',
      ]);
    }
  }, [profile.voiceLanguage]);

  // Clean up speech on close
  useEffect(() => {
    if (!isVoiceModalOpen) {
      voiceManager.stopListening();
      voiceManager.stopSpeaking();
      setPhase('idle');
      setTranscript('');
      setInterimText('');
      setAgentAnswer('');
      setErrorMessage('');
    }
  }, [isVoiceModalOpen]);

  if (!isVoiceModalOpen) return null;

  const handleStartListening = () => {
    setErrorMessage('');
    setTranscript('');
    setInterimText('');
    setAgentAnswer('');
    voiceManager.stopSpeaking();

    const success = voiceManager.startListening(
      {
        onStart: () => {
          setPhase('listening');
        },
        onResult: (text: string, isFinal: boolean) => {
          if (isFinal) {
            setTranscript(text);
            setInterimText('');
            // Trigger processing automatically once final transcript is obtained
            processVoiceQuery(text);
          } else {
            setInterimText(text);
          }
        },
        onError: (err: string) => {
          setPhase('error');
          setErrorMessage(err);
        },
        onEnd: () => {
          if (phase === 'listening') {
            setPhase('idle');
          }
        },
      },
      profile.voiceLanguage
    );

    if (!success) {
      setPhase('error');
    }
  };

  const handleStopListening = () => {
    voiceManager.stopListening();
    if (transcript.trim()) {
      processVoiceQuery(transcript);
    } else {
      setPhase('idle');
    }
  };

  const processVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setPhase('processing');
    setTranscript(queryText);

    // Also persist to conversation history so context is never lost
    addMessage({
      id: `msg-voice-user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: profile.voiceLanguage,
    });

    try {
      const result = await sendChatMessage({
        query: queryText,
        history: messages,
        profile,
        language: profile.voiceLanguage,
      });

      setAgentAnswer(result.response);
      setVoiceSources(result.sources || []);
      setPhase('speaking');

      // Record assistant answer in conversation memory
      addMessage({
        id: `msg-voice-assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        route: result.route,
        sources: result.sources,
        toolsUsed: result.toolsUsed,
        language: profile.voiceLanguage,
      });

      // Speak response in the user's selected voice language unless muted
      if (!isMuted) {
        voiceManager.speak(result.response, profile.voiceLanguage, {
          onEnd: () => {
            setPhase('idle');
          },
          onError: () => {
            setPhase('idle');
          },
        });
      } else {
        setPhase('idle');
      }
    } catch (err: any) {
      setPhase('error');
      setErrorMessage(err.message || 'Failed to process voice query');
    }
  };

  const handleMuteToggle = () => {
    if (!isMuted) {
      voiceManager.stopSpeaking();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      if (agentAnswer) {
        voiceManager.speak(agentAnswer, profile.voiceLanguage);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Back/Close preserving state */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            id="btn-voice-back-close"
            onClick={closeVoiceModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backBtn} / {t.closeBtn}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Voice Language:</span>
            <select
              id="select-voice-modal-language"
              value={profile.voiceLanguage}
              onChange={(e) => {
                const newLang = e.target.value as LanguageCode;
                updateProfile({ voiceLanguage: newLang });
                voiceManager.setLanguage(newLang);
              }}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          <button
            id="btn-voice-header-close"
            onClick={closeVoiceModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-center">
          {/* Main Visualizer / Status Indicator */}
          <div className="relative my-4 flex items-center justify-center">
            {phase === 'listening' && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-emerald-400/20 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full bg-emerald-500/30 animate-pulse" />
              </>
            )}
            {phase === 'speaking' && (
              <div className="absolute w-32 h-32 rounded-full bg-blue-400/20 animate-pulse" />
            )}

            <button
              id="btn-voice-mic-main"
              onClick={phase === 'listening' ? handleStopListening : handleStartListening}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all transform active:scale-95 ${
                phase === 'listening'
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
                  : phase === 'speaking'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/40'
              }`}
            >
              {phase === 'listening' ? (
                <MicOff className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Phase Status Banner */}
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
              {phase === 'listening' && <span className="text-emerald-600 animate-pulse">{t.voiceListening}</span>}
              {phase === 'processing' && <span className="text-amber-600">{t.voiceProcessing}</span>}
              {phase === 'speaking' && <span className="text-blue-600">{t.voiceSpeaking}</span>}
              {phase === 'idle' && <span className="text-slate-700">{t.voiceIdle}</span>}
              {phase === 'error' && <span className="text-red-600">Voice Error</span>}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Speaking as: <span className="font-semibold text-slate-700">{profile.name}</span> ({profile.role}) • {profile.societyName || 'Cooperative'}
            </p>
          </div>

          {/* Spoken Transcript display */}
          {(transcript || interimText) && (
            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                You Spoke ({profile.voiceLanguage.toUpperCase()}):
              </span>
              <p className="text-sm font-medium text-slate-800">
                {transcript} <span className="text-slate-400 italic">{interimText}</span>
              </p>
            </div>
          )}

          {/* Assistant Voice Response */}
          {agentAnswer && (
            <div className="w-full bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 mb-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Co-opSahayak Answer:
                </span>
                <button
                  id="btn-voice-mute-toggle"
                  onClick={handleMuteToggle}
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
                  title={isMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {agentAnswer}
              </p>

              {/* Sources link */}
              {voiceSources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-emerald-900 font-semibold flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-emerald-700" /> Sources Cited:
                  </span>
                  {voiceSources.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSource(src)}
                      className="text-xs bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg hover:bg-emerald-100 transition-all font-medium"
                    >
                      {src.section || src.docTitle}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="w-full bg-red-50 text-red-700 rounded-xl p-3 border border-red-200 mb-4 text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                <p className="mt-0.5 text-red-600">Please verify microphone permissions or try typing your question.</p>
              </div>
            </div>
          )}

          {/* Quick Voice Prompt Suggestions */}
          {phase === 'idle' && !agentAnswer && (
            <div className="w-full mt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-left">
                Or tap to ask one of these questions aloud:
              </span>
              <div className="space-y-2 text-left">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => processVoiceQuery(q)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-xs font-medium text-slate-700 text-left transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <Send className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with state preservation message */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Your workflow state and form progress remain safe.</span>
          <button
            id="btn-voice-footer-done"
            onClick={closeVoiceModal}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium transition-all"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
