/**
 * Audio Utilities
 * Helper functions for audio processing and format handling
 */

/**
 * Supported audio formats for browser recording
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
] as const;

/**
 * Check if a MIME type is supported for recording
 */
export function isAudioFormatSupported(mimeType: string): boolean {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return false;
  }
  return MediaRecorder.isTypeSupported(mimeType);
}

/**
 * Get the best supported audio format for recording
 * @returns The best supported MIME type or null if none supported
 */
export function getBestAudioFormat(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return null;
  }

  for (const format of SUPPORTED_AUDIO_FORMATS) {
    if (MediaRecorder.isTypeSupported(format)) {
      return format;
    }
  }
  return null;
}

/**
 * Check if voice recording is supported in the current browser
 */
export function isVoiceRecordingSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined' &&
    typeof window.AudioContext !== 'undefined'
  );
}

/**
 * Convert an ArrayBuffer to a base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert a Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Create an audio context with fallback for older browsers
 */
export function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  return new AudioContextClass();
}

/**
 * Calculate audio volume/level from an AnalyserNode
 * @returns Volume level between 0 and 1
 */
export function calculateAudioLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Calculate RMS (root mean square) for a more accurate level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);

  // Normalize to 0-1 range (255 is max value for Uint8Array)
  return rms / 255;
}

/**
 * Audio player for playing audio chunks
 */
export class AudioChunkPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private volume = 1.0;

  constructor(volume: number = 1.0) {
    this.volume = volume;
  }

  async initialize() {
    if (this.audioContext) return;

    this.audioContext = createAudioContext();
    if (!this.audioContext) {
      throw new Error('AudioContext not supported');
    }

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioContext.destination);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  async addChunk(audioData: ArrayBuffer) {
    this.audioQueue.push(audioData);
    if (!this.isPlaying) {
      await this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (!this.audioContext || !this.gainNode || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(
        audioData.slice(0) // Clone the buffer as decodeAudioData detaches it
      );

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      source.onended = () => {
        this.playNextChunk();
      };

      source.start();
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      // Continue to next chunk even if this one fails
      await this.playNextChunk();
    }
  }

  stop() {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  cleanup() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }
}

/**
 * Voice Activity Detection (VAD) helper
 * Detects when the user is speaking vs silent
 */
export class VoiceActivityDetector {
  private analyser: AnalyserNode | null = null;
  private threshold: number;
  private silenceTimeout: number;
  private lastSpeechTime = 0;
  private isSpeaking = false;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    threshold?: number; // Volume threshold (0-1), default 0.05
    silenceTimeout?: number; // Ms of silence before speech ends, default 1500
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
  } = {}) {
    this.threshold = options.threshold ?? 0.05;
    this.silenceTimeout = options.silenceTimeout ?? 1500;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
  }

  setAnalyser(analyser: AnalyserNode) {
    this.analyser = analyser;
  }

  start() {
    if (!this.analyser) return;

    this.checkInterval = setInterval(() => {
      const level = calculateAudioLevel(this.analyser!);
      const now = Date.now();

      if (level > this.threshold) {
        this.lastSpeechTime = now;
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeechStart?.();
        }
      } else if (this.isSpeaking && now - this.lastSpeechTime > this.silenceTimeout) {
        this.isSpeaking = false;
        this.onSpeechEnd?.();
      }
    }, 100); // Check every 100ms
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isSpeaking = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

