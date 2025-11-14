/**
 * WEB-SPECIFIC CONFIGURATION
 * Конфігурації специфічні для веб інтерфейсу
 *
 * Версія: 4.0.0
 * Дата створення: 2025-10-21
 */

// === AUDIO CONFIGURATION ===
export const AUDIO_CONFIG = {
  constraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,         // 48kHz for better quality
      channelCount: 1,
      sampleSize: 16,            // 16-bit samples
      latency: 0.01              // 10ms low latency
    }
  },
  recording: {
    maxDuration: 60000,          // 60 sec
    silenceTimeout: 1200,        // 1.2 sec - швидка детекція
    volumeThreshold: 0.01,
    timeslice: 100,              // 100ms chunks - швидша передача
    minDuration: 100             // 100ms мінімум
  },
  mimeType: 'audio/webm;codecs=opus',  // Opus codec
  audioBitsPerSecond: 128000           // 128 kbps якісне кодування
};

// === WEB UI CONFIGURATION ===
export const WEB_UI_CONFIG = {
  theme: 'dark-cyber',
  animations: true,
  keyboardShortcuts: true,
  responsiveBreakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1440
  }
};

// === UTILITY FUNCTIONS ===
export function createAudioConstraints(config = AUDIO_CONFIG) {
  return {
    audio: {
      ...config.constraints.audio,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };
}

export default {
  AUDIO_CONFIG,
  WEB_UI_CONFIG,
  createAudioConstraints
};
