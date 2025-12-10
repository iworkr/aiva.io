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
  autoRestartAfterResponse?: boolean; // Auto-restart recording after AI finishes speaking
}

export interface UseVoiceChatReturn {
  status: VoiceChatStatus;
  isSupported: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  messages: VoiceChatMessage[];
  audioLevel: number;
  error: string | null;
  currentTranscript: string; // Live transcript of current recording
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
    voiceThreshold = 0.12, // Increased from 0.05 for better speech detection
    autoRestartAfterResponse = true, // Default to continuous conversation
  } = options;

  // State
  const [status, setStatus] = useState<VoiceChatStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>(''); // Live transcript
  const [pendingAutoRestart, setPendingAutoRestart] = useState(false); // Trigger for auto-restart

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
  const isRecordingRef = useRef(false); // Ref for immediate recording state access
  const shouldAutoRestartRef = useRef(false); // Track if we should auto-restart after speaking

  // Check browser support
  const isSupported = typeof window !== 'undefined' && isVoiceRecordingSupported();

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop recording ref first to stop animation loop
    isRecordingRef.current = false;
    
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

  // Update audio level visualization - uses ref for immediate state access
  const updateAudioLevel = useCallback(() => {
    // Use ref instead of state to avoid closure issues
    if (!analyserRef.current || !isRecordingRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedLevel = rms / 255;
    
    setAudioLevel(normalizedLevel);

    // Continue animation loop while recording
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []); // No dependencies needed - uses refs

  // Play audio chunks
  const playAudioChunks = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);
    setStatus('speaking');

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

    // Resume audio context if suspended (needed for auto-restart)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
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
    
    // Check if we should auto-restart recording
    if (shouldAutoRestartRef.current && autoRestartAfterResponse) {
      console.log('[Voice] 🔄 Auto-restarting recording after response');
      shouldAutoRestartRef.current = false;
      setPendingAutoRestart(true); // Trigger useEffect to call startRecording
    } else {
      setStatus('idle');
    }
  }, [autoRestartAfterResponse]);

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
    console.log('[Voice] Processing audio, size:', audioBlob.size, 'type:', audioBlob.type);
    setStatus('processing');
    setCurrentTranscript(''); // Clear previous transcript
    shouldAutoRestartRef.current = true; // Mark that we should auto-restart after response

    try {
      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      console.log('[Voice] Audio converted to base64, length:', base64Audio.length);

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

      console.log('[Voice] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('[Voice] API error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let userText = '';
      let buffer = ''; // Buffer for incomplete SSE lines
      setStatus('speaking');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages (separated by \n\n)
        const messages_arr = buffer.split('\n\n');
        buffer = messages_arr.pop() || ''; // Keep incomplete message in buffer

        for (const line of messages_arr) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              console.log('[Voice] SSE event:', data.type);

              switch (data.type) {
                case 'transcription':
                  userText = data.text;
                  console.log('[Voice] Transcription received:', data.text);
                  setCurrentTranscript(data.text); // Show transcript immediately
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
                  console.log('[Voice] Audio chunk received');
                  const audioBuffer = base64ToArrayBuffer(data.audio);
                  audioQueueRef.current.push(audioBuffer);
                  playAudioChunks();
                  break;

                case 'done':
                  console.log('[Voice] Response complete:', fullText);
                  onResponse?.(fullText);
                  // Add assistant message
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: fullText, timestamp: new Date() },
                  ]);
                  break;

                case 'error':
                  console.error('[Voice] Error from server:', data.error);
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('[Voice] Error parsing SSE data:', parseError, 'Line:', line);
            }
          }
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Voice processing failed');
      console.error('[Voice] Processing error:', error);
      setError(error.message);
      setStatus('error');
      onError?.(error);
      toast.error(error.message);
    }
  }, [messages, voiceId, onTranscription, onResponse, onError, playAudioChunks]);

  // Start recording
  const startRecording = useCallback(async () => {
    console.log('[Voice] startRecording called, isSupported:', isSupported);
    
    if (!isSupported) {
      toast.error('Voice recording is not supported in your browser');
      return;
    }

    setError(null);
    setStatus('connecting');

    try {
      // Get microphone access
      console.log('[Voice] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[Voice] Microphone access granted, tracks:', stream.getAudioTracks().length);

      streamRef.current = stream;

      // Set up audio context for visualization
      if (!audioContextRef.current) {
        console.log('[Voice] Creating new AudioContext...');
        audioContextRef.current = createAudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext) {
        // CRITICAL: Resume AudioContext - browsers start it suspended!
        if (audioContext.state === 'suspended') {
          console.log('[Voice] AudioContext was suspended, resuming...');
          await audioContext.resume();
        }
        console.log('[Voice] AudioContext state:', audioContext.state);

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3; // Faster response
        source.connect(analyser);
        analyserRef.current = analyser;
        console.log('[Voice] Audio analyser connected, fftSize:', analyser.fftSize);

        // Set up voice activity detection with enhanced options
        if (autoStopOnSilence) {
          console.log('[Voice] Setting up VAD with threshold:', voiceThreshold || 0.12);
          vadRef.current = new VoiceActivityDetector({
            threshold: voiceThreshold || 0.12, // Higher default for better detection
            silenceTimeout,
            minRecordingDuration: 1000, // Minimum 1 second before auto-stop
            onAudioLevel: (level) => {
              // VAD provides continuous level updates
              setAudioLevel(level);
            },
            onSpeechStart: () => {
              console.log('[Voice] 🎤 Speech STARTED - user is speaking');
            },
            onSpeechEnd: () => {
              console.log('[Voice] 🔇 Speech ENDED - auto-stopping recording');
              // Auto-stop recording after silence
              if (mediaRecorderRef.current?.state === 'recording') {
                stopRecording();
              }
            },
          });
          vadRef.current.setAnalyser(analyser);
          vadRef.current.start();
          console.log('[Voice] VAD started');
        }
      } else {
        console.error('[Voice] Failed to create AudioContext!');
      }

      // Set up media recorder
      const mimeType = getBestAudioFormat();
      console.log('[Voice] Using audio format:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[Voice] Audio chunk received, size:', event.data.size, 'total chunks:', audioChunksRef.current.length);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          console.log('[Voice] MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);
          setIsRecording(false);
          isRecordingRef.current = false;

          // Process the recorded audio
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: mimeType || 'audio/webm',
            });
            console.log('[Voice] Created audio blob, size:', audioBlob.size, 'type:', audioBlob.type);
            
            // Store blob before cleanup
            const blobToProcess = audioBlob;
            cleanup();
            
            // Process audio (this can throw)
            await processAudio(blobToProcess);
          } else {
            console.warn('[Voice] No audio chunks to process!');
            cleanup();
            setStatus('idle');
            toast.error('No audio recorded. Please try speaking louder.');
          }
        } catch (err) {
          console.error('[Voice] Error in onstop handler:', err);
          cleanup();
          setStatus('error');
          const errorMsg = err instanceof Error ? err.message : 'Recording failed';
          setError(errorMsg);
          toast.error(errorMsg);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setStatus('error');
        cleanup();
      };

      // Start recording - set ref BEFORE state for animation loop
      mediaRecorder.start(100); // Collect data every 100ms
      isRecordingRef.current = true; // Set ref first for immediate access
      setIsRecording(true);
      setStatus('listening');

      console.log('[Voice] ✅ Recording started! MediaRecorder state:', mediaRecorder.state);
      console.log('[Voice] Speak now... Auto-stop will trigger after', silenceTimeout, 'ms of silence');

      // Start audio level visualization (now works because ref is already true)
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

  // Auto-restart recording after AI finishes speaking
  useEffect(() => {
    if (pendingAutoRestart && !isSpeaking && !isRecording) {
      setPendingAutoRestart(false);
      // Small delay to ensure clean state transition
      const timer = setTimeout(() => {
        console.log('[Voice] 🎤 Starting new recording (auto-restart)');
        startRecording();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoRestart, isSpeaking, isRecording, startRecording]);

  return {
    status,
    isSupported,
    isRecording,
    isSpeaking,
    messages,
    audioLevel,
    error,
    currentTranscript,
    startRecording,
    stopRecording,
    cancelRecording,
    clearMessages,
    stopSpeaking,
  };
}

