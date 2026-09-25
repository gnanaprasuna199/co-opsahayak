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

  /**
   * Fallback language mapping.
   *
   * The values should match the languages supported by your
   * constants/languages.ts file.
   */
  private readonly languageMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    or: 'or-IN',
    as: 'as-IN',
  };

  constructor() {
    const SpeechRec =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (SpeechRec) {
      this.recognition = new SpeechRec();

      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      // Set initial language
      this.setLanguage(this.currentLanguage);
    }
  }

  /**
   * Check whether browser supports Speech Recognition.
   */
  public isSupported(): boolean {
    return !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  /**
   * Convert application language code to browser speech language code.
   */
  private getSpeechCode(langCode: LanguageCode): string {
    const langInfo = SUPPORTED_LANGUAGES.find(
      (language) => language.code === langCode
    );

    if (langInfo?.speechCode) {
      return langInfo.speechCode;
    }

    return (
      this.languageMap[langCode] ||
      'en-IN'
    );
  }

  /**
   * Set language for Speech Recognition.
   */
  public setLanguage(langCode: LanguageCode): void {
    this.currentLanguage = langCode;

    if (!this.recognition) {
      return;
    }

    const speechCode = this.getSpeechCode(langCode);

    this.recognition.lang = speechCode;

    console.log(
      `🎤 Speech recognition language: ${langCode} → ${speechCode}`
    );
  }

  /**
   * Start microphone / Speech Recognition.
   */
  public startListening(
    callbacks: {
      onResult: (
        transcript: string,
        isFinal: boolean
      ) => void;

      onError: (error: string) => void;

      onEnd: () => void;

      onStart?: () => void;
    },

    langCode: LanguageCode = this.currentLanguage
  ): boolean {
    if (!this.recognition) {
      callbacks.onError(
        'Speech recognition is not supported in this browser environment. You can type your question.'
      );

      return false;
    }

    /*
     * Stop previous recognition session if one exists.
     */
    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }

    /*
     * IMPORTANT:
     * Always set the language immediately before starting
     * recognition.
     */
    this.setLanguage(langCode);

    this.recognition.onstart = () => {
      this.isListening = true;

      console.log(
        `🎤 Microphone started in ${this.recognition.lang}`
      );

      callbacks.onStart?.();
    };

    this.recognition.onresult = (
      event: SpeechRecognitionEvent
    ) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        ++i
      ) {
        const result = event.results[i];

        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        callbacks.onResult(
          finalTranscript.trim(),
          true
        );
      } else if (interimTranscript.trim()) {
        callbacks.onResult(
          interimTranscript.trim(),
          false
        );
      }
    };

    this.recognition.onerror = (
      event: SpeechRecognitionErrorEvent
    ) => {
      this.isListening = false;

      console.warn(
        '🎤 Speech recognition error:',
        event.error
      );

      let message = `Voice recognition: ${event.error}`;

      if (event.error === 'not-allowed') {
        message =
          'Microphone permission was denied. Please allow microphone access.';
      } else if (event.error === 'no-speech') {
        message =
          'No speech was detected. Please try speaking again.';
      } else if (event.error === 'audio-capture') {
        message =
          'No microphone was detected. Please check your microphone.';
      } else if (event.error === 'network') {
        message =
          'Speech recognition requires a network connection in this browser.';
      } else if (event.error === 'language-not-supported') {
        message =
          `The selected language (${this.recognition.lang}) is not supported by this browser.`;
      }

      callbacks.onError(message);
    };

    this.recognition.onend = () => {
      this.isListening = false;

      console.log('🎤 Speech recognition ended.');

      callbacks.onEnd();
    };

    try {
      this.recognition.start();

      return true;
    } catch (err: any) {
      console.warn(
        'Error starting speech recognition:',
        err
      );

      callbacks.onError(
        'Could not start microphone. Please try again.'
      );

      return false;
    }
  }

  /**
   * Stop microphone / Speech Recognition.
   */
  public stopListening(): void {
    if (
      this.recognition &&
      this.isListening
    ) {
      try {
        this.recognition.stop();
      } catch (_) {}

      this.isListening = false;
    }
  }

  /**
   * Get all browser-installed speech synthesis voices.
   */
  private getVoicesAsync(): Promise<
    SpeechSynthesisVoice[]
  > {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve([]);
        return;
      }

      let voices =
        window.speechSynthesis.getVoices();

      /*
       * Some browsers load voices asynchronously.
       */
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      let resolved = false;

      const finish = () => {
        if (resolved) return;

        resolved = true;

        voices =
          window.speechSynthesis.getVoices();

        resolve(voices);
      };

      window.speechSynthesis.onvoiceschanged =
        finish;

      /*
       * Fallback for browsers where
       * onvoiceschanged does not fire.
       */
      setTimeout(finish, 1000);
    });
  }

  /**
   * Find a voice that matches the requested language.
   *
   * IMPORTANT:
   * We never intentionally select an unrelated English
   * voice for a non-English language.
   */
  private findBestVoice(
    voices: SpeechSynthesisVoice[],
    langCode: LanguageCode,
    targetTag: string
  ): SpeechSynthesisVoice | null {
    const normalizedTarget =
      targetTag.toLowerCase();

    const normalizedLanguage =
      langCode.toLowerCase();

    /*
     * 1. Exact locale match.
     *
     * Example:
     * te-IN === te-IN
     */
    let voice = voices.find(
      (v) =>
        v.lang.toLowerCase() ===
        normalizedTarget
    );

    if (voice) {
      return voice;
    }

    /*
     * 2. Same base language.
     *
     * Example:
     * Requested: te-IN
     * Available: te-US
     *
     * This is still preferable to English.
     */
    voice = voices.find((v) => {
      const voiceLanguage =
        v.lang.toLowerCase().split('-')[0];

      return (
        voiceLanguage ===
        normalizedLanguage
      );
    });

    if (voice) {
      return voice;
    }

    /*
     * 3. Match using the language information
     * from SUPPORTED_LANGUAGES.
     */
    const langInfo =
      SUPPORTED_LANGUAGES.find(
        (l) => l.code === langCode
      );

    if (langInfo?.name) {
      const languageName =
        langInfo.name.toLowerCase();

      voice = voices.find((v) =>
        v.name
          .toLowerCase()
          .includes(languageName)
      );

      if (voice) {
        return voice;
      }
    }

    /*
     * IMPORTANT:
     *
     * Do NOT return voices[0].
     * Do NOT select any random "IN" voice.
     *
     * That could turn Telugu/Hindi speech into
     * Indian English.
     */
    return null;
  }

  /**
   * Speak assistant response in selected language.
   */
  public async speak(
    text: string,
    langCode: LanguageCode,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      options.onError?.(
        'Speech synthesis is not available in this browser.'
      );

      return;
    }

    /*
     * Stop anything currently speaking.
     */
    window.speechSynthesis.cancel();

    /*
     * Clean markdown / formatting before speaking.
     */
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

    /*
     * Determine requested language.
     */
    const targetTag =
      this.getSpeechCode(langCode);

    console.log(
      `🔊 Requested speech language: ${langCode} → ${targetTag}`
    );

    /*
     * Create speech utterance.
     */
    const utterance =
      new SpeechSynthesisUtterance(
        cleanText
      );

    utterance.lang = targetTag;

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    /*
     * Load browser voices.
     */
    const voices =
      await this.getVoicesAsync();

    console.log(
      '🔊 Available browser voices:',
      voices.map(
        (v) =>
          `${v.name} (${v.lang})`
      )
    );

    /*
     * Find matching voice.
     */
    const bestVoice =
      this.findBestVoice(
        voices,
        langCode,
        targetTag
      );

    if (bestVoice) {
      utterance.voice = bestVoice;

      /*
       * Use the actual voice locale.
       */
      utterance.lang =
        bestVoice.lang;

      console.log(
        `🔊 Using voice: ${bestVoice.name} (${bestVoice.lang})`
      );
    } else {
      /*
       * Keep requested language even when the
       * browser doesn't expose a matching voice.
       *
       * DO NOT fall back to English.
       */
      utterance.lang = targetTag;

      console.warn(
        `⚠️ No installed speech voice found for ${targetTag}. ` +
        `The browser will attempt to use the requested language.`
      );
    }

    utterance.onstart = () => {
      console.log(
        `🔊 Speech started in ${utterance.lang}`
      );

      options.onStart?.();
    };

    utterance.onend = () => {
      console.log('🔊 Speech ended.');

      options.onEnd?.();
    };

    utterance.onerror = (event: any) => {
      console.warn(
        '🔊 Speech synthesis error:',
        event
      );

      options.onError?.(event);
    };

    /*
     * Start speaking.
     */
    window.speechSynthesis.speak(
      utterance
    );
  }

  /**
   * Stop speech output.
   */
  public stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceManager =
  new VoiceAssistantManager();
