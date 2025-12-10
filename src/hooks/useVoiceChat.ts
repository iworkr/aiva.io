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
  createSpeechRecognition,
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
  autoDetectVoice?: boolean; // Automatically start recording when voice is detected
}

export interface UseVoiceChatReturn {
  status: VoiceChatStatus;
  isSupported: boolean;
  isRecording: boolean;
  isListening: boolean; // Passively listening for voice (auto-detect mode)
  isSpeaking: boolean;
  messages: VoiceChatMessage[];
  audioLevel: number;
  error: string | null;
  currentTranscript: string; // Final transcript from Whisper
  liveTranscript: string; // Real-time transcript from Web Speech API
  streamingResponse: string; // AI's streaming response text
  pendingUserMessage: string; // User's message while AI is processing
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  startListening: () => Promise<void>; // Start auto-detect mode
  stopListening: () => void; // Stop auto-detect mode
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
    voiceThreshold = 0.08, // Lower threshold for better detection
    autoRestartAfterResponse = true, // Default to continuous conversation
    autoDetectVoice = true, // Default to auto voice detection
  } = options;

  // State
  const [status, setStatus] = useState<VoiceChatStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false); // Passive listening mode
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>(''); // Final transcript from Whisper
  const [liveTranscript, setLiveTranscript] = useState<string>(''); // Real-time transcript from Web Speech API
  const [streamingResponse, setStreamingResponse] = useState<string>(''); // AI's streaming response
  const [pendingUserMessage, setPendingUserMessage] = useState<string>(''); // User's message during processing
  const [pendingAutoRestart, setPendingAutoRestart] = useState(false); // Trigger for auto-restart

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const listeningStreamRef = useRef<MediaStream | null>(null); // Stream for passive listening
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const listeningVadRef = useRef<VoiceActivityDetector | null>(null); // VAD for auto-detect
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const listeningAnimationRef = useRef<number | null>(null); // Animation for listening mode
  const isRecordingRef = useRef(false); // Ref for immediate recording state access
  const isListeningRef = useRef(false); // Ref for listening state
  const shouldAutoRestartRef = useRef(false); // Track if we should auto-restart after speaking
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null); // Web Speech API for live transcript
  const startListeningRef = useRef<(() => Promise<void>) | null>(null); // Ref for startListening function

  // Check browser support
  const isSupported = typeof window !== 'undefined' && isVoiceRecordingSupported();

  // Cleanup recording (not listening mode)
  const cleanupRecording = useCallback(() => {
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

    // Stop Web Speech API
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // Already stopped, ignore
      }
      speechRecognitionRef.current = null;
    }
    
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  // Full cleanup including listening mode
  const cleanup = useCallback(() => {
    cleanupRecording();
    setLiveTranscript('');
    
    // Also cleanup listening mode
    isListeningRef.current = false;
    
    if (listeningAnimationRef.current) {
      cancelAnimationFrame(listeningAnimationRef.current);
      listeningAnimationRef.current = null;
    }
    
    if (listeningStreamRef.current) {
      listeningStreamRef.current.getTracks().forEach((track) => track.stop());
      listeningStreamRef.current = null;
    }
    
    if (listeningVadRef.current) {
      listeningVadRef.current.stop();
      listeningVadRef.current = null;
    }
    
    setIsListening(false);
  }, [cleanupRecording]);

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
                  setLiveTranscript(''); // Clear live transcript
                  setCurrentTranscript(data.text); // Show final transcript
                  // Don't set pendingUserMessage - message goes directly to array
                  onTranscription?.(data.text);
                  // Add user message immediately to the array
                  setMessages((prev) => [
                    ...prev,
                    { role: 'user', content: data.text, timestamp: new Date() },
                  ]);
                  setStatus('processing'); // Show we're processing
                  break;

                case 'text_delta':
                  fullText += data.text;
                  setStreamingResponse(fullText); // Display incrementally
                  setPendingUserMessage(''); // Clear pending since AI is now responding
                  setStatus('speaking');
                  break;

                case 'audio_chunk':
                  console.log('[Voice] Audio chunk received');
                  const audioBuffer = base64ToArrayBuffer(data.audio);
                  audioQueueRef.current.push(audioBuffer);
                  playAudioChunks();
                  break;

                case 'done':
                  console.log('[Voice] Response complete:', fullText);
                  setStreamingResponse(''); // Clear streaming state
                  setPendingUserMessage(''); // Clear any pending
                  onResponse?.(fullText);
                  // Add assistant message
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: fullText, timestamp: new Date() },
                  ]);
                  
                  // Schedule auto-restart - check repeatedly until audio is done
                  const checkAndRestart = () => {
                    console.log('[Voice] checkAndRestart: isPlaying=', isPlayingRef.current, 'shouldRestart=', shouldAutoRestartRef.current);
                    if (!isPlayingRef.current && shouldAutoRestartRef.current && autoRestartAfterResponse) {
                      console.log('[Voice] 🔄 Triggering auto-restart NOW');
                      shouldAutoRestartRef.current = false;
                      setStatus('idle');
                      setCurrentTranscript('');
                      // Directly restart after a short delay using the ref
                      setTimeout(() => {
                        console.log('[Voice] 🎤 Calling startListening via ref');
                        if (startListeningRef.current) {
                          startListeningRef.current();
                        }
                      }, 300);
                    } else if (isPlayingRef.current) {
                      // Audio still playing, check again soon
                      console.log('[Voice] Audio still playing, checking again...');
                      setTimeout(checkAndRestart, 200);
                    } else {
                      console.log('[Voice] Not restarting: shouldRestart=', shouldAutoRestartRef.current, 'autoRestart=', autoRestartAfterResponse);
                    }
                  };
                  setTimeout(checkAndRestart, 300);
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
      
      // Even on error, try to restart listening if enabled
      if (autoRestartAfterResponse) {
        setTimeout(() => {
          setPendingAutoRestart(true);
        }, 1000);
      }
    }
  }, [messages, voiceId, onTranscription, onResponse, onError, playAudioChunks, autoRestartAfterResponse]);

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

      // Start Web Speech API for real-time transcript display
      const recognition = createSpeechRecognition();
      if (recognition) {
        speechRecognitionRef.current = recognition;
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (!event.results[i].isFinal) {
              interimTranscript += transcript;
            }
          }
          if (interimTranscript) {
            setLiveTranscript(interimTranscript);
          }
        };

        recognition.onerror = (event) => {
          // Don't log 'no-speech' or 'aborted' as errors - they're expected
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.log('[Voice] Speech recognition info:', event.error);
          }
        };

        recognition.onend = () => {
          // Recognition ended - may restart if still recording
          if (isRecordingRef.current && speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.start();
            } catch {
              // Already started or stopped, ignore
            }
          }
        };

        try {
          recognition.start();
          console.log('[Voice] Web Speech API started for live transcript');
        } catch (e) {
          console.log('[Voice] Could not start Web Speech API:', e);
        }
      }
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
    setPendingUserMessage('');
    setLiveTranscript('');
  }, [cleanup]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingUserMessage('');
    setCurrentTranscript('');
    setStreamingResponse('');
  }, []);

  // Update audio level for listening mode
  const updateListeningAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isListeningRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedLevel = rms / 255;
    
    setAudioLevel(normalizedLevel);

    if (isListeningRef.current) {
      listeningAnimationRef.current = requestAnimationFrame(updateListeningAudioLevel);
    }
  }, []);

  // Start listening mode (auto voice detection)
  const startListening = useCallback(async () => {
    if (!isSupported) {
      toast.error('Voice is not supported in your browser');
      return;
    }

    if (isListeningRef.current || isRecordingRef.current) {
      return; // Already listening or recording
    }

    console.log('[Voice] Starting listening mode (auto voice detection)...');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      listeningStreamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);
      setStatus('listening');

      // Set up audio context for VAD
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext) {
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Set up VAD for auto voice detection
        listeningVadRef.current = new VoiceActivityDetector({
          threshold: voiceThreshold,
          silenceTimeout: 800, // Faster detection
          minRecordingDuration: 500,
          onAudioLevel: (level) => {
            setAudioLevel(level);
          },
          onSpeechStart: () => {
            console.log('[Voice] 🎤 Speech detected! Auto-starting recording...');
            // Stop listening mode and start recording
            if (isListeningRef.current && !isRecordingRef.current) {
              // Keep the stream for recording
              const currentStream = listeningStreamRef.current;
              
              // Stop listening VAD but keep stream
              listeningVadRef.current?.stop();
              isListeningRef.current = false;
              setIsListening(false);
              
              // Start actual recording with the existing stream
              startRecordingWithStream(currentStream!);
            }
          },
          onSpeechEnd: () => {
            // Not used in listening mode - we start recording on speech start
          },
        });
        listeningVadRef.current.setAnalyser(analyser);
        listeningVadRef.current.start();

        // Start audio level visualization
        updateListeningAudioLevel();
      }

      console.log('[Voice] ✅ Listening mode active - speak to start');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      console.error('[Voice] Listening error:', error);
      setError(error.message);
      isListeningRef.current = false;
      setIsListening(false);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      }
    }
  }, [isSupported, voiceThreshold, updateListeningAudioLevel]);

  // Start recording with an existing stream (for auto-detect)
  const startRecordingWithStream = useCallback(async (stream: MediaStream) => {
    if (isRecordingRef.current) return;
    
    console.log('[Voice] Starting recording with existing stream...');
    
    streamRef.current = stream;
    listeningStreamRef.current = null; // Transfer ownership
    isRecordingRef.current = true;
    setIsRecording(true);
    setStatus('listening');
    setLiveTranscript('');

    // Reuse existing audio context and analyser
    const audioContext = audioContextRef.current;
    if (audioContext && analyserRef.current) {
      // Set up VAD for auto-stop
      vadRef.current = new VoiceActivityDetector({
        threshold: voiceThreshold,
        silenceTimeout,
        minRecordingDuration: 1000,
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onSpeechStart: () => {
          console.log('[Voice] 🎤 Speech started');
        },
        onSpeechEnd: () => {
          console.log('[Voice] 🔇 Speech ended - stopping recording');
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        },
      });
      vadRef.current.setAnalyser(analyserRef.current);
      vadRef.current.start();
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
      try {
        setIsRecording(false);
        isRecordingRef.current = false;

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm',
          });
          
          const blobToProcess = audioBlob;
          cleanupRecording();
          await processAudio(blobToProcess);
        } else {
          cleanupRecording();
          setStatus('idle');
          // Restart listening if auto-restart is enabled
          if (autoRestartAfterResponse && autoDetectVoice) {
            startListening();
          }
        }
      } catch (err) {
        console.error('[Voice] Error in onstop:', err);
        cleanupRecording();
        setStatus('error');
      }
    };

    mediaRecorder.onerror = () => {
      setStatus('error');
      cleanupRecording();
    };

    // Start recording
    mediaRecorder.start(100);

    // Start Web Speech API for live transcript
    const recognition = createSpeechRecognition();
    if (recognition) {
      speechRecognitionRef.current = recognition;
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (!event.results[i].isFinal) {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript) {
          setLiveTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.log('[Voice] Speech recognition:', event.error);
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.start();
          } catch {
            // Ignore
          }
        }
      };

      try {
        recognition.start();
      } catch {
        // Ignore
      }
    }

    console.log('[Voice] ✅ Recording started!');
  }, [voiceThreshold, silenceTimeout, cleanupRecording, processAudio, autoRestartAfterResponse, autoDetectVoice, startListening]);

  // Stop listening mode
  const stopListening = useCallback(() => {
    console.log('[Voice] Stopping listening mode');
    isListeningRef.current = false;
    setIsListening(false);
    
    if (listeningAnimationRef.current) {
      cancelAnimationFrame(listeningAnimationRef.current);
      listeningAnimationRef.current = null;
    }
    
    if (listeningStreamRef.current) {
      listeningStreamRef.current.getTracks().forEach((track) => track.stop());
      listeningStreamRef.current = null;
    }
    
    if (listeningVadRef.current) {
      listeningVadRef.current.stop();
      listeningVadRef.current = null;
    }
    
    setAudioLevel(0);
    setStatus('idle');
  }, []);

  // Store startListening in ref for access from callbacks
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Auto-restart listening after AI finishes speaking (backup mechanism)
  useEffect(() => {
    if (pendingAutoRestart && !isSpeaking && !isRecording && !isListening) {
      console.log('[Voice] ✅ Backup auto-restart triggered via useEffect');
      setPendingAutoRestart(false);
      setPendingUserMessage('');
      setCurrentTranscript('');
      setStatus('idle');
      
      const timer = setTimeout(() => {
        console.log('[Voice] 🎤 Auto-restarting listening mode (backup)');
        if (autoDetectVoice) {
          startListening();
        } else {
          startRecording();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoRestart, isSpeaking, isRecording, isListening, startRecording, startListening, autoDetectVoice]);

  return {
    status,
    isSupported,
    isRecording,
    isListening,
    isSpeaking,
    messages,
    audioLevel,
    error,
    currentTranscript,
    liveTranscript,
    streamingResponse,
    pendingUserMessage,
    startRecording,
    stopRecording,
    startListening,
    stopListening,
    cancelRecording,
    clearMessages,
    stopSpeaking,
  };
}

