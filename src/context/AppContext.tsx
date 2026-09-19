import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Message, GrievanceFormData, GrievanceLetter, SourceReference, LanguageCode } from '../types';
import { TRANSLATIONS, UITranslation } from '../constants/languages';
import { checkServerHealth } from '../services/api';

interface AppContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isVoiceModalOpen: boolean;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateLastMessage: (updates: Partial<Message>) => void;
  clearMessages: () => void;
  isChatLoading: boolean;
  setIsChatLoading: (val: boolean) => void;
  chatStatus: string;
  setChatStatus: (status: string) => void;
  grievanceData: GrievanceFormData;
  setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceFormData>>;
  generatedLetter: GrievanceLetter | null;
  setGeneratedLetter: (letter: GrievanceLetter | null) => void;
  activeWorkflowId: string | null;
  activeWorkflowStep: number;
  setActiveWorkflowId: (id: string | null) => void;
  setActiveWorkflowStep: (step: number) => void;
  selectedSource: SourceReference | null;
  setSelectedSource: (src: SourceReference | null) => void;
  t: UITranslation;
  serverStatus: { online: boolean; geminiConfigured: boolean };
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Ravi',
  role: 'Member',
  state: 'Telangana',
  societyName: 'Demo Dairy Cooperative Society',
  interfaceLanguage: 'te',
  responseLanguage: 'te',
  voiceLanguage: 'te',
  useSameLanguage: true,
  primaryGoal: 'understanding rights and election rules',
  onboarded: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved profile or fallback to default
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('coopsahayak_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return DEFAULT_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [previousTabBeforeVoice, setPreviousTabBeforeVoice] = useState<string>('home');

  // Messages with welcome message matching user's language
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text:
          profile.interfaceLanguage === 'te'
            ? `నమస్కారం ${profile.name}! కో-ఆప్ సహాయక్ (Co-opSahayak) కు స్వాగతం. సహకార సంఘ నిబంధనలు, ఓటు హక్కు, ఎన్నికలు లేదా ఫిర్యాదుల పరిష్కారంలో మీకు ఎలా సహాయపడగలను?`
            : `Namaste ${profile.name}! Welcome to Co-opSahayak. How can I assist you today with cooperative bylaws, voting rights, elections, or filing a grievance?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups:
          profile.interfaceLanguage === 'te'
            ? [
                'నా ఓటు హక్కు ఏంటి?',
                'సొసైటీ రికార్డులను తనిఖీ చేసే హక్కు నాకు ఉందా?',
                'మేనేజింగ్ కమిటీపై ఫిర్యాదు చేయడం ఎలా?',
              ]
            : [
                'Can I vote in my cooperative election?',
                'What are my rights as a member?',
                'How do I file a grievance?',
              ],
      },
    ];
  });

  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatStatus, setChatStatus] = useState<string>('');

 // Workflow states - dynamically derived from profile
  const [grievanceData, setGrievanceData] = useState<GrievanceFormData>(() => ({
    memberName: profile.name || 'Member',
    memberIdOrNumber: '',
    societyName: profile.societyName || 'Primary Cooperative Society',
    societyAddressOrPlace: `${profile.state || 'Telangana'} Region`,
    issueCategory: 'Election',
    issueDescription: '', // <--- Set this to an empty string!
    dateOrPeriod: '',
    peopleOrRoleInvolved: '',
    desiredResolution: '',
    additionalNotes: '',
    status: 'draft',
  }));

  const [generatedLetter, setGeneratedLetter] = useState<GrievanceLetter | null>(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<SourceReference | null>(null);
  const [serverStatus, setServerStatus] = useState<{ online: boolean; geminiConfigured: boolean }>({
    online: true,
    geminiConfigured: false,
  });

  // Check health on mount
  useEffect(() => {
    checkServerHealth().then((res) => {
      setServerStatus({
        online: res.status === 'ok',
        geminiConfigured: res.geminiConfigured,
      });
    });
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      // If interface language changes and useSameLanguage is true, sync all:
      if (updates.interfaceLanguage) {
        if (next.useSameLanguage) {
          next.responseLanguage = updates.interfaceLanguage;
          next.voiceLanguage = updates.interfaceLanguage;
        }
      }
      localStorage.setItem('coopsahayak_profile', JSON.stringify(next));

      setGrievanceData((gPrev) => ({
        ...gPrev,
        memberName: next.name || gPrev.memberName,
        societyName: next.societyName || gPrev.societyName,
        societyAddressOrPlace: `${next.state || 'Telangana'} Region`,
      }));

      return next;
    });
  };

  const openVoiceModal = () => {
    setPreviousTabBeforeVoice(activeTab);
    setIsVoiceModalOpen(true);
  };

  const closeVoiceModal = () => {
    setIsVoiceModalOpen(false);
    setActiveTab(previousTabBeforeVoice);
  };

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  const updateLastMessage = (updates: Partial<Message>) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updated = { ...last, ...updates };
      return [...prev.slice(0, prev.length - 1), updated];
    });
  };

  const clearMessages = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text:
          profile.interfaceLanguage === 'te'
            ? `సంభాషణ క్లియర్ చేయబడింది. సహకార నిబంధనలు లేదా సభ్యుల హక్కులపై ఏదైనా ప్రశ్న అడగండి.`
            : `Conversation cleared. Feel free to ask any question regarding cooperative rules, bylaws, or member procedures.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowups: [
          profile.interfaceLanguage === 'te' ? 'నా ఓటు హక్కు ఏంటి?' : 'How to check my voting rights?',
          profile.interfaceLanguage === 'te'
            ? 'సహకార సంఘం రిజిస్ట్రేషన్ విధానం ఏమిటి?'
            : 'What are the steps to register a cooperative?',
        ],
      },
    ]);
  };

  const t = TRANSLATIONS[profile.interfaceLanguage] || TRANSLATIONS.en;

  return (
    <AppContext.Provider
      value={{
        profile,
        updateProfile,
        activeTab,
        setActiveTab,
        isVoiceModalOpen,
        openVoiceModal,
        closeVoiceModal,
        messages,
        addMessage,
        updateLastMessage,
        clearMessages,
        isChatLoading,
        setIsChatLoading,
        chatStatus,
        setChatStatus,
        grievanceData,
        setGrievanceData,
        generatedLetter,
        setGeneratedLetter,
        activeWorkflowId,
        activeWorkflowStep,
        setActiveWorkflowId,
        setActiveWorkflowStep,
        selectedSource,
        setSelectedSource,
        t,
        serverStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};