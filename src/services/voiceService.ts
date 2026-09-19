import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class VoiceAssistantManager {
  private recognition: any | null = null;
  private isListening: boolean = false;
  private currentLanguage: LanguageCode = 'en';

  constructor() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  public isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public setLanguage(langCode: LanguageCode): void {
    this.currentLanguage = langCode;
    if (this.recognition) {
      const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
      this.recognition.lang = langInfo ? langInfo.speechCode : 'en-IN';
    }
  }

  public startListening(
    callbacks: {
      onResult: (transcript: string, isFinal: boolean) => void;
      onError: (error: string) => void;
      onEnd: () => void;
      onStart?: () => void;
    },
    langCode: LanguageCode = this.currentLanguage
  ): boolean {
    if (!this.recognition) {
      callbacks.onError('Speech recognition is not supported in this browser environment. You can type your question.');
      return false;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }

    this.setLanguage(langCode);

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        callbacks.onResult(finalTranscript.trim(), true);
      } else if (interimTranscript.trim()) {
        callbacks.onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      console.warn('Speech recognition error:', event.error);
      callbacks.onError(
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access.'
          : `Voice recognition: ${event.error}`
      );
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      callbacks.onError('Could not start microphone.');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.isListening = false;
    }
  }

  private getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
      // Fallback timeout if onvoiceschanged doesn't fire
      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
      }, 500);
    });
  }

  public async speak(
    text: string,
    langCode: LanguageCode,
    options: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void } = {}
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      options.onError?.('Speech synthesis not available.');
      return;
    }

    window.speechSynthesis.cancel();

    // Clean formatting and special symbols
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[Source \d+\]/g, '')
      .replace(/#+\s/g, '')
      .replace(/[•\-_]/g, ' ')
      .trim();

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    const targetTag = langInfo ? langInfo.speechCode : 'en-IN'; // e.g. 'te-IN'

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetTag;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = await this.getVoicesAsync();

    // Prioritize Telugu voice specifically if target is 'te'
    const bestVoice =
      voices.find((v) => v.lang.toLowerCase() === targetTag.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) ||
      voices.find((v) => v.name.toLowerCase().includes(langInfo?.name.toLowerCase() || '')) ||
      voices.find((v) => v.lang.toLowerCase().includes('in')) ||
      voices[0];

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };
    utterance.onend = () => {
      options.onEnd?.();
    };
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      options.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceManager = new VoiceAssistantManager();