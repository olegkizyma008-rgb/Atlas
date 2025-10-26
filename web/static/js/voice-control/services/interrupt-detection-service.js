/**
 * @fileoverview Interrupt Detection Service
 * Виявлення спроб користувача перервати Atlas під час TTS
 *
 * WORKFLOW:
 * 1. TTS_STARTED → увімкнути continuous listening для interrupt keywords
 * 2. Whisper розпізнає фрагменти під час TTS
 * 3. Перевірка на interrupt keywords (стоп, почекай, перебиваю, тощо)
 * 4. INTERRUPT_DETECTED → пауза TTS → запит підтвердження → запис відповіді
 *
 * @version 1.0.0
 * @date 2025-10-26
 */

import { BaseService } from '../core/base-service.js';
import { Events } from '../events/event-manager.js';
import { containsInterruptKeyword } from '../utils/voice-utils.js';
import { API_ENDPOINTS } from '../../core/config.js';

/**
 * Сервіс виявлення переривань під час TTS
 */
export class InterruptDetectionService extends BaseService {
  constructor(config = {}) {
    super({
      name: 'INTERRUPT_DETECTION',
      version: '1.0.0',
      ...config
    });

    this.whisperUrl = config.whisperUrl || API_ENDPOINTS.whisper;

    // Конфігурація
    this.config = {
      chunkDuration: config.chunkDuration || 2000, // 2 сек chunks під час TTS
      pauseBetweenChunks: config.pauseBetweenChunks || 100, // 100ms пауза
      ...config
    };

    // Стан
    this.isListening = false;
    this.isTTSActive = false;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.loopTimer = null;
    this.recordingTimer = null;

    // Генератор відповідей на переривання
    this._interruptResponses = null;
  }

  /**
   * Ініціалізація
   */
  async onInitialize() {
    try {
      // Підписка на події
      this.subscribeToEvents();

      this.logger.info('Interrupt detection service initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize interrupt detection', null, error);
      return false;
    }
  }

  /**
   * Підписка на події
   */
  subscribeToEvents() {
    if (!this.eventManager) {
      this.logger.error('EventManager not available');
      return;
    }

    // Початок TTS - увімкнути interrupt listening
    this.eventManager.on('TTS_STARTED', async (event) => {
      this.logger.info('🔊 TTS started - enabling interrupt detection');
      this.isTTSActive = true;
      await this.startListening();
    });

    // Завершення TTS - вимкнути interrupt listening
    this.eventManager.on(Events.TTS_COMPLETED, async () => {
      this.logger.info('✅ TTS completed - disabling interrupt detection');
      this.isTTSActive = false;
      await this.stopListening();
    });

    // Пауза TTS (якщо виявлено переривання)
    this.eventManager.on('TTS_PAUSED', () => {
      this.logger.info('⏸️ TTS paused - stopping interrupt detection');
      this.isTTSActive = false;
      this.stopListening();
    });
  }

  /**
   * Початок прослуховування для interrupt keywords
   */
  async startListening() {
    if (this.isListening) {
      this.logger.debug('Already listening for interrupts');
      return;
    }

    try {
      this.logger.info('🎙️ Starting interrupt detection listening...');

      // Get microphone access
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');

      // Find real microphone (avoid virtual devices)
      let realMic = audioInputs.find(d => {
        const label = d.label.toLowerCase();
        return (label.includes('airpods') ||
          label.includes('macbook') ||
          label.includes('built-in')) &&
          !label.includes('virtual');
      });

      if (!realMic) {
        realMic = audioInputs.find(d => {
          const label = d.label.toLowerCase();
          return !label.includes('camo') &&
            !label.includes('blackhole') &&
            !label.includes('loopback') &&
            !label.includes('virtual');
        });
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1
        }
      };

      if (realMic?.deviceId) {
        constraints.audio.deviceId = { exact: realMic.deviceId };
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioStream = this.stream;

      this.isListening = true;
      this.startRecognitionLoop();

      this.logger.info('✅ Interrupt detection listening started');

    } catch (error) {
      this.logger.error('Failed to start interrupt listening', null, error);
      this.emit('INTERRUPT_DETECTION_ERROR', { error: error.message });
    }
  }

  /**
   * Зупинка прослуховування
   */
  async stopListening() {
    this.isListening = false;

    // Зупинка таймерів
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Зупинка запису
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Закриття audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.logger.info('🛑 Interrupt detection listening stopped');
  }

  /**
   * Цикл розпізнавання: запис → транскрипція → перевірка → repeat
   */
  startRecognitionLoop() {
    if (!this.isListening || !this.isTTSActive) return;

    // Запис одного чанку
    this.recordChunk()
      .then(audioBlob => {
        if (!audioBlob || !this.isListening) return;

        // Відправка на Whisper
        return this.transcribeChunk(audioBlob);
      })
      .then(text => {
        if (!text || !this.isListening) return;

        // Перевірка на interrupt keyword
        this.checkForInterrupt(text);
      })
      .catch(error => {
        this.logger.warn('Interrupt recognition loop error', null, error);
      })
      .finally(() => {
        // Пауза перед наступним чанком
        if (this.isListening && this.isTTSActive) {
          this.loopTimer = setTimeout(() => {
            this.startRecognitionLoop();
          }, this.config.pauseBetweenChunks);
        }
      });
  }

  /**
   * Запис одного аудіо чанку
   */
  async recordChunk() {
    return new Promise((resolve, reject) => {
      if (!this.audioStream) {
        reject(new Error('No audio stream available'));
        return;
      }

      this.audioChunks = [];

      // Створення MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (error) => {
        this.logger.error('MediaRecorder error', null, error);
        reject(error);
      };

      // Запуск запису
      this.mediaRecorder.start();

      // Зупинка після chunkDuration
      this.recordingTimer = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, this.config.chunkDuration);
    });
  }

  /**
   * Транскрипція аудіо чанку через Whisper
   */
  async transcribeChunk(audioBlob) {
    try {
      // Конвертація в WAV для Whisper
      const wavBlob = await this.convertToWav(audioBlob);

      // Відправка на Whisper API
      const formData = new FormData();
      formData.append('audio', wavBlob, 'audio.wav');
      formData.append('language', 'uk');
      formData.append('temperature', '0.0');
      formData.append('beam_size', '5');
      formData.append('best_of', '5');

      const response = await fetch(`${this.whisperUrl}/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      const text = result.text?.trim() || '';

      this.logger.debug(`Interrupt chunk: "${text}"`);
      return text;

    } catch (error) {
      this.logger.warn('Failed to transcribe interrupt chunk', null, error);
      return null;
    }
  }

  /**
   * Конвертація webm → wav
   */
  async convertToWav(webmBlob) {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Отримання PCM даних
    const pcmData = audioBuffer.getChannelData(0);
    const wavBuffer = this.encodeWAV(pcmData, 48000);

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Кодування PCM → WAV
   */
  encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Запис string в DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Перевірка тексту на interrupt keyword
   */
  checkForInterrupt(text) {
    if (!text) {
      return;
    }

    // Перевірка через voice-utils
    const hasInterrupt = containsInterruptKeyword(text);

    if (hasInterrupt) {
      this.logger.info(`🛑 INTERRUPT DETECTED: "${text}"`);

      // Генерація відповіді на переривання
      const response = this.getRandomInterruptResponse();

      // Емісія події переривання
      this.emit('INTERRUPT_DETECTED', {
        transcript: text,
        response,
        timestamp: new Date()
      });

      // Зупинка listening після виявлення
      this.stopListening();
    }
  }

  /**
   * Отримання випадкової відповіді на переривання з ротацією
   * @returns {string} - Відповідь на переривання
   */
  getRandomInterruptResponse() {
    // Ініціалізація ротаційного буфера при першому виклику
    if (!this._interruptResponses) {
      this._interruptResponses = {
        responses: [
          'перепрошую, ви мене перебили, що бажаєте сказати?',
          'так, слухаю вас уважно',
          'ви хотіли щось додати?',
          'я весь увага, що сталося?',
          'так, Олег Миколайович, що важливого?',
          'зупиняюсь, що ви хотіли сказати?',
          'слухаю, що вас турбує?',
          'так, я тут, що потрібно?',
          'ви маєте щось важливе сказати?',
          'перепрошую за багатослівність, слухаю вас'
        ],
        currentPool: [],
        lastUsed: null
      };
    }

    const rotation = this._interruptResponses;

    // Якщо пул порожній - поповнюємо його (виключаючи останню використану)
    if (rotation.currentPool.length === 0) {
      rotation.currentPool = rotation.responses.filter(r => r !== rotation.lastUsed);
      this.logger.debug(`🔄 Interrupt response pool refreshed (${rotation.currentPool.length} responses)`);
    }

    // Вибираємо випадкову відповідь з пулу
    const randomIndex = Math.floor(Math.random() * rotation.currentPool.length);
    const selectedResponse = rotation.currentPool[randomIndex];

    // Видаляємо з пулу (не повториться до refresh)
    rotation.currentPool.splice(randomIndex, 1);

    // Зберігаємо як останню використану
    rotation.lastUsed = selectedResponse;

    this.logger.debug(`🎲 Selected interrupt response: "${selectedResponse}" (pool: ${rotation.currentPool.length} left)`);

    return selectedResponse;
  }

  /**
   * Знищення сервісу
   */
  async onDestroy() {
    await this.stopListening();
  }
}
