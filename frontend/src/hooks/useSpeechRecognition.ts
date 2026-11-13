import { useState, useEffect, useRef, useCallback } from 'react';

// Declaration for browser SpeechRecognition APIs
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  onFinalTranscript?: (text: string) => void;
  enableBargeIn?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (
  callbackOrOptions?: ((text: string) => void) | UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn => {
  const options: UseSpeechRecognitionOptions =
    typeof callbackOrOptions === 'function'
      ? { onFinalTranscript: callbackOrOptions, enableBargeIn: true }
      : callbackOrOptions || { enableBargeIn: true };

  const { onFinalTranscript, enableBargeIn = true } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRequestedRef = useRef(false);
  const onFinalCallbackRef = useRef(onFinalTranscript);
  onFinalCallbackRef.current = onFinalTranscript;

  // Interruption / Barge-in helper
  const cancelActiveTts = useCallback(() => {
    if (enableBargeIn && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    }
  }, [enableBargeIn]);

  useEffect(() => {
    const win = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        cancelActiveTts();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Immediate conversational barge-in when candidate voice is detected
        cancelActiveTts();

        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            currentFinal += text + ' ';
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const updated = (prev + ' ' + currentFinal).trim();
            if (onFinalCallbackRef.current) {
              onFinalCallbackRef.current(updated);
            }
            return updated;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('[SpeechRecognition] Error event:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access in your browser settings.');
          isListeningRequestedRef.current = false;
        } else if (event.error === 'audio-capture') {
          setError('No microphone hardware detected on your device.');
          isListeningRequestedRef.current = false;
        } else if (event.error !== 'no-speech') {
          setError(`Speech recognition note: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // Auto-reconnect if continuous listening was requested and not stopped manually
        if (isListeningRequestedRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error('[SpeechRecognition] Initialization failed:', e);
      setIsSupported(false);
    }

    return () => {
      isListeningRequestedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort
        }
      }
    };
  }, [cancelActiveTts]);

  const startListening = useCallback(() => {
    setError(null);
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge for voice mode.');
      return;
    }

    cancelActiveTts();
    isListeningRequestedRef.current = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.warn('[SpeechRecognition] Start caught (may already be running):', e);
    }
  }, [cancelActiveTts]);

  const stopListening = useCallback(() => {
    isListeningRequestedRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useSpeechRecognition;
