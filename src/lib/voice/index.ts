/**
 * Voice Services Index
 * Re-exports all voice-related services and utilities
 */

// Speech-to-Text Service (OpenAI Whisper)
export {
  transcribeAudio,
  transcribeBase64Audio,
  isSTTConfigured,
  type TranscriptionResult,
  type TranscriptionOptions,
} from './stt-service';

// Text-to-Speech Service (ElevenLabs)
export {
  textToSpeech,
  streamTextToSpeech,
  getAvailableVoices,
  isTTSConfigured,
  getDefaultVoiceId,
  type TTSOptions,
  type TTSResult,
} from './tts-service';

// Voice Chat Orchestrator
export {
  processVoiceInput,
  streamVoiceResponse,
  getVoiceResponse,
  getVoiceChatContext,
  type VoiceChatMessage,
  type VoiceChatContext,
  type VoiceChatOptions,
} from './voice-chat-orchestrator';

// Audio Utilities
export {
  isVoiceRecordingSupported,
  getBestAudioFormat,
  isAudioFormatSupported,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  blobToBase64,
  base64ToBlob,
  createAudioContext,
  calculateAudioLevel,
  AudioChunkPlayer,
  VoiceActivityDetector,
  SUPPORTED_AUDIO_FORMATS,
} from './audio-utils';

