/**
 * useVoiceChat Hook
 * Handles voice chat functionality including recording, streaming, and playback
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  isVoiceRecordingSupported,
  getBestAudioFormat,
  blobToBase64,
  base64ToArrayBuffer,
  createAudioContext,
  VoiceActivityDetector,
} from '@/lib/voice/audio-utils';

export interface VoiceChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type VoiceChatStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface UseVoiceChatOptions {
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
  voiceId?: string;
  autoStopOnSilence?: boolean;
  silenceTimeout?: number; // ms
  voiceThreshold?: number; // 0-1
}

export interface UseVoiceChatReturn {
  status: VoiceChatStatus;
  isSupported: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  messages: VoiceChatMessage[];
  audioLevel: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  clearMessages: () => void;
  stopSpeaking: () => void;
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    onTranscription,
    onResponse,
    onError,
    voiceId,
    autoStopOnSilence = true,
    silenceTimeout = 1500,
    voiceThreshold = 0.05,
  } = options;

  // State
  const [status, setStatus] = useState<VoiceChatStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && isVoiceRecordingSupported();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }
    
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [cleanup]);

  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setAudioLevel(rms / 255);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isRecording]);

  // Play audio chunks
  const playAudioChunks = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);

    // Ensure audio context exists
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      console.error('AudioContext not available');
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      
      try {
        const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (err) {
        console.error('Error playing audio chunk:', err);
      }
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
    setStatus('idle');
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    if (status === 'speaking') {
      setStatus('idle');
    }
  }, [status]);

  // Process recorded audio
  const processAudio = useCallback(async (audioBlob: Blob) => {
    setStatus('processing');

    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);

      // Send to API
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType: audioBlob.type,
          conversationHistory: messages,
          voiceId,
          streaming: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let userText = '';
      setStatus('speaking');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'transcription':
                  userText = data.text;
                  onTranscription?.(data.text);
                  // Add user message
                  setMessages((prev) => [
                    ...prev,
                    { role: 'user', content: data.text, timestamp: new Date() },
                  ]);
                  break;

                case 'text_delta':
                  fullText += data.text;
                  break;

                case 'audio_chunk':
                  const audioBuffer = base64ToArrayBuffer(data.audio);
                  audioQueueRef.current.push(audioBuffer);
                  playAudioChunks();
                  break;

                case 'done':
                  onResponse?.(fullText);
                  // Add assistant message
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: fullText, timestamp: new Date() },
                  ]);
                  break;

                case 'error':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Voice processing failed');
      setError(error.message);
      setStatus('error');
      onError?.(error);
      toast.error(error.message);
    }
  }, [messages, voiceId, onTranscription, onResponse, onError, playAudioChunks]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('Voice recording is not supported in your browser');
      return;
    }

    setError(null);
    setStatus('connecting');

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio context for visualization
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext) {
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Set up voice activity detection
        if (autoStopOnSilence) {
          vadRef.current = new VoiceActivityDetector({
            threshold: voiceThreshold,
            silenceTimeout,
            onSpeechEnd: () => {
              // Auto-stop recording after silence
              if (mediaRecorderRef.current?.state === 'recording') {
                stopRecording();
              }
            },
          });
          vadRef.current.setAnalyser(analyser);
          vadRef.current.start();
        }
      }

      // Set up media recorder
      const mimeType = getBestAudioFormat();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        cleanup();

        // Process the recorded audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm',
          });
          await processAudio(audioBlob);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setStatus('error');
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setStatus('listening');

      // Start audio level visualization
      updateAudioLevel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error.message);
      setStatus('error');
      onError?.(error);
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        toast.error('Microphone access was denied. Please allow microphone access and try again.');
      } else {
        toast.error(error.message);
      }
      
      cleanup();
    }
  }, [
    isSupported,
    autoStopOnSilence,
    voiceThreshold,
    silenceTimeout,
    cleanup,
    processAudio,
    updateAudioLevel,
    onError,
  ]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    status,
    isSupported,
    isRecording,
    isSpeaking,
    messages,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearMessages,
    stopSpeaking,
  };
}

