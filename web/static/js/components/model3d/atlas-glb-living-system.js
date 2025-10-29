/**
 * ATLAS GLB LIVING SYSTEM v4.0
 *
 * Повноцінна жива система для GLB моделі шолома Атласа
 * Реагує на всі події системи як жива розумна істота
 *
 * Features:
 * - 🎭 Емоційні реакції на події
 * - 🎤 Синхронізація з TTS (дихання під час мовлення)
 * - 🎯 Відстеження користувача (очі слідкують за мишкою)
 * - ⚡ Реакції на агентів (Atlas, Тетяна, Гриша)
 * - 🧠 Інтелектуальна поведінка (навчання, пам'ять)
 * - 💚 Природні анімації (дихання, мерехтіння, micro-movements)
 * - 🎨 Динамічні кольори ореолу на основі настрою (НОВИНКА v4.1)
 */

import { AtlasEmotionalStateService } from './atlas-emotional-state.js';
import { GestureAnimator, GestureDetector, AtlasGestures } from './atlas-gestures.js';

export class AtlasGLBLivingSystem {
  constructor(modelViewerSelector, options = {}) {
    this.modelViewer = document.querySelector(modelViewerSelector);

    if (!this.modelViewer) {
      throw new Error(`Model viewer not found: ${modelViewerSelector}`);
    }

    // Конфігурація
    this.config = {
      // Живі функції
      enableBreathing: options.enableBreathing !== false,
      enableEyeTracking: options.enableEyeTracking !== false,
      enableEmotions: options.enableEmotions !== false,
      enableTTSSync: options.enableTTSSync !== false,
      enableIntelligence: options.enableIntelligence !== false,

      // Параметри анімації
      breathingSpeed: options.breathingSpeed || 4000, // мс на цикл
      eyeTrackingSpeed: options.eyeTrackingSpeed || 0.08, // Зменшено для плавності
      rotationSmoothness: options.rotationSmoothness || 0.05, // Зменшено для більш природного руху
      emotionIntensity: options.emotionIntensity || 1.0,
      
      // Обмеження обертання для природності
      maxRotationX: options.maxRotationX || 20, // Максимальний нахил вгору/вниз
      maxRotationY: options.maxRotationY || 35, // Максимальний поворот вліво/вправо
      maxRotationZ: options.maxRotationZ || 5,  // Максимальний нахил вбік

      // TTS візуалізація
      ttsGlowIntensity: options.ttsGlowIntensity || 1.5,
      ttsRotationAmplitude: options.ttsRotationAmplitude || 1.5, // Зменшено з 3 до 1.5

      // Центр обертання (налаштовуваний)
      rotationCenter: {
        x: options.rotationCenterX || 5,  // Вище базова точка, щоб дивився ближче до верхнього краю екрана
        y: options.rotationCenterY || -1, // Трохи вліво (до логів) - theta
        z: options.rotationCenterZ || 0
      },

      // Особистість
      personality: {
        curiosity: 0.9,
        friendliness: 0.95,
        playfulness: 0.7,
        focus: 0.85,
        ...options.personality
      }
    };

    // Живий стан
    this.livingState = {
      isAlive: false,
      isAwake: false,
      currentEmotion: 'neutral',
      currentAgent: null,
      attentionLevel: 0.5,
      energyLevel: 1.0,

      // Позиція та орієнтація
      targetRotation: { x: 0, y: 0, z: 0 },
      currentRotation: { x: 0, y: 0, z: 0 },
      baseRotation: {
        x: this.config.rotationCenter.x,
        y: this.config.rotationCenter.y,
        z: this.config.rotationCenter.z
      },

      // Миша і користувач
      mousePosition: { x: 0, y: 0 },
      isUserPresent: false,
      lastMouseMove: Date.now(),

      // TTS стан
      isSpeaking: false,
      speechIntensity: 0,
      isListening: false,

      // Пам'ять і навчання
      interactionHistory: [],
      emotionalMemory: new Map(),
      preferredEmotions: new Map(),

      // Анімація
      breathingPhase: 0,
      idlePhase: 0,
      microMovementPhase: 0,

      // НОВИНКА (29.10.2025): Система пріоритетів анімацій
      animationMode: 'idle', // 'idle', 'gesture', 'speaking', 'listening'
      isGestureActive: false,
      eyeTrackingEnabled: true
    };

    // Емоційна палітра для різних агентів
    this.agentEmotions = {
      'atlas': {
        color: 'rgba(0, 255, 127, 0.8)',
        intensity: 0.9,
        personality: 'wise',
        glow: '#00ff7f'
      },
      'tetyana': {
        color: 'rgba(31, 156, 255, 0.8)',
        intensity: 0.85,
        personality: 'energetic',
        glow: '#1f9cff'
      },
      'grisha': {
        color: 'rgba(255, 170, 51, 0.8)',
        intensity: 0.8,
        personality: 'focused',
        glow: '#ffaa33'
      },
      'user': {
        color: 'rgba(0, 255, 127, 0.9)',
        intensity: 0.95,
        personality: 'attentive',
        glow: '#00ff7f'
      }
    };

    // Системи анімації
    this.animationFrameId = null;
    this.emotionTimeout = null;
    this.ttsAnalyser = null;

    // НОВИНКА (29.10.2025): Емоційна система для динамічного ореолу
    this.emotionalState = new AtlasEmotionalStateService();
    this.lastUserMessage = '';
    this.lastAtlasResponse = '';

    // НОВИНКА (29.10.2025): Система природних жестів
    this.gestureAnimator = null; // Ініціалізується після init
    this.gestureDetector = new GestureDetector();

    this.init();
  }

  /**
     * Ініціалізація системи
     */
  async init() {
    console.log('🧬 Initializing Atlas GLB Living System v4.0...');

    try {
      await this.waitForModelLoad();
      this.setupModelDefaults();
      this.hideInteractionPrompt();
      this.startLivingLoop();
      this.setupEventListeners();
      
      // Ініціалізуємо gesture animator після того як система готова
      this.gestureAnimator = new GestureAnimator(this);
      
      this.awaken();

      console.log('✨ Atlas helmet is now ALIVE with gestures!');
    } catch (error) {
      console.error('❌ Failed to initialize Living System:', error);
    }
  }

  /**
   * Примусово приховуємо interaction prompt (палець)
   */
  hideInteractionPrompt() {
    // Встановлюємо атрибути
    this.modelViewer.interactionPrompt = 'none';
    this.modelViewer.interactionPromptThreshold = 0;
    this.modelViewer.setAttribute('interaction-prompt', 'none');
    this.modelViewer.setAttribute('interaction-prompt-threshold', '0');

    // Знаходимо і видаляємо DOM елемент промпту
    setTimeout(() => {
      const promptElement = this.modelViewer.shadowRoot?.querySelector('.interaction-prompt');
      if (promptElement) {
        promptElement.style.display = 'none';
        promptElement.style.opacity = '0';
        promptElement.style.visibility = 'hidden';
        promptElement.remove();
        console.log('✅ Interaction prompt removed');
      }

      // Також приховуємо через CSS
      const style = document.createElement('style');
      style.textContent = `
        model-viewer::part(interaction-prompt) {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }, 100);

    console.log('🚫 Interaction prompt disabled');
  }

  /**
     * Очікування завантаження GLB моделі
     */
  async waitForModelLoad() {
    return new Promise((resolve, reject) => {
      if (this.modelViewer.loaded) {
        console.log('✅ GLB model already loaded');
        resolve();
        return;
      }

      console.log('⏳ Waiting for GLB model to load...');

      // Збільшено таймаут до 30 секунд
      const timeout = setTimeout(() => {
        console.warn('⚠️ Model load timeout (30s), continuing anyway...');
        console.log('💡 The system will continue to work, but 3D animations may be limited');
        resolve();
      }, 30000);

      this.modelViewer.addEventListener('load', () => {
        clearTimeout(timeout);
        console.log('✅ GLB model loaded successfully');

        // Логуємо інформацію про модель
        const model = this.modelViewer.model;
        if (model) {
          console.log('📦 Model info:', {
            hasAnimations: model.animations?.length > 0,
            animationCount: model.animations?.length || 0,
            boundingBox: model.boundingBox
          });
        }

        resolve();
      }, { once: true });

      this.modelViewer.addEventListener('error', (e) => {
        clearTimeout(timeout);
        console.error('❌ GLB model load error:', e);
        console.warn('💡 Continuing without 3D model - system will work in 2D mode');
        // Продовжуємо виконання замість відхилення
        resolve();
      }, { once: true });
    });
  }

  /**
     * Налаштування дефолтних параметрів моделі
     */
  setupModelDefaults() {
    // Примусово показуємо модель (якщо був reveal="manual")
    if (typeof this.modelViewer.dismissPoster === 'function') {
      this.modelViewer.dismissPoster();
    }

    // Отримуємо центр моделі для правильного обертання
    const model = this.modelViewer.model;
    if (model && model.boundingBox) {
      const bbox = model.boundingBox;
      // Використовуємо методи boundingBox для отримання центру
      const centerX = (bbox.min.x + bbox.max.x) / 2;
      const centerY = (bbox.min.y + bbox.max.y) / 2;
      const centerZ = (bbox.min.z + bbox.max.z) / 2;

      // Встановлюємо центр обертання на центр моделі
      this.modelViewer.cameraTarget = `${centerX}m ${centerY}m ${centerZ}m`;

      console.log('📦 Model center:', { x: centerX, y: centerY, z: centerZ });
    } else {
      // Якщо не вдалося отримати bbox, використовуємо дефолтний центр
      this.modelViewer.cameraTarget = 'auto auto auto';
    }

    // Налаштовуємо камеру для оптимального вигляду шолома
    this.modelViewer.cameraOrbit = '0deg 75deg 105%';
    this.modelViewer.fieldOfView = '30deg';

    // Встановлюємо мінімальну та максимальну відстань камери
    this.modelViewer.minCameraOrbit = 'auto auto 80%';
    this.modelViewer.maxCameraOrbit = 'auto auto 150%';

    // Увімкнення auto-rotate для базової живості
    this.modelViewer.autoRotate = false; // Вимикаємо, бо ми керуємо вручну

    // Вимикаємо interaction-prompt (палець)
    this.modelViewer.interactionPrompt = 'none';
    this.modelViewer.interactionPromptThreshold = 0;

    console.log('⚙️ Model defaults configured');
  }

  /**
     * Пробудження - початкова анімація
     */
  awaken() {
    console.log('🌅 Atlas is awakening...');

    this.livingState.isAlive = true;
    this.livingState.isAwake = true;
    this.livingState.currentEmotion = 'awakening';

    // Плавна анімація пробудження
    this.setEmotion('curious', 0.8, 3000);

    // Додаємо клас для CSS анімації
    this.modelViewer.classList.add('awakening');

    setTimeout(() => {
      this.modelViewer.classList.remove('awakening');
      this.setEmotion('neutral', 0.5, 1000);
    }, 3000);
  }

  /**
     * Головний цикл живої поведінки
     */
  startLivingLoop() {
    const animate = (timestamp) => {
      if (!this.livingState.isAlive) return;

      const deltaTime = timestamp - (this.lastTimestamp || timestamp);
      this.lastTimestamp = timestamp;

      // Природні анімації
      if (this.config.enableBreathing) {
        this.updateBreathing(timestamp);
      }

      // Micro-movements для реалізму
      this.updateMicroMovements(timestamp);

      // Відстеження очима (вимкнено під час мовлення)
      if (this.config.enableEyeTracking && this.livingState.isUserPresent && !this.livingState.isSpeaking) {
        this.updateEyeTracking();
      }

      // Idle анімації
      this.updateIdleBehavior(timestamp);

      // Застосовуємо всі обчислені трансформації
      this.applyTransformations();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
    console.log('🔄 Living loop started');
  }

  /**
     * Дихання - плавні коливання
     */
  updateBreathing(timestamp) {
    const speed = this.config.breathingSpeed;
    const phase = (timestamp % speed) / speed;
    this.livingState.breathingPhase = phase;

    // Базове дихання - легке масштабування
    const breathIntensity = this.livingState.isSpeaking ? 0.02 : 0.01;
    const breathScale = 1 + Math.sin(phase * Math.PI * 2) * breathIntensity;

    // Під час мовлення - більш інтенсивне дихання
    if (this.livingState.isSpeaking) {
      const speechBreath = 0.015 * this.livingState.speechIntensity;
      this.livingState.targetRotation.z = Math.sin(phase * Math.PI * 4) * 2 * speechBreath;
    }
  }

  /**
     * Micro-movements - невеликі випадкові рухи для життєвості
     * ОНОВЛЕНО: Більш органічні рухи з варіацією
     */
  updateMicroMovements(timestamp) {
    // Повільний перлін-подібний шум для природності
    const t = timestamp * 0.0001;

    // Багатошарові синусоїди для більш органічного руху
    const microX = (Math.sin(t * 1.3) + Math.sin(t * 2.7) * 0.5) * 0.2;
    const microY = (Math.cos(t * 0.7) + Math.cos(t * 1.9) * 0.3) * 0.15;
    const microZ = (Math.sin(t * 0.5) + Math.sin(t * 1.1) * 0.4) * 0.1;

    // Дуже повільне накопичення для природного дрейфу
    this.livingState.baseRotation.x += microX * 0.008;
    this.livingState.baseRotation.y += microY * 0.008;
    this.livingState.baseRotation.z += microZ * 0.008;

    // Обмежуємо базове обертання щоб не відходило занадто далеко
    this.livingState.baseRotation.x = this.clampRotation(this.livingState.baseRotation.x, 3);
    this.livingState.baseRotation.y = this.clampRotation(this.livingState.baseRotation.y, 3);
    this.livingState.baseRotation.z = this.clampRotation(this.livingState.baseRotation.z, 2);
  }

  /**
     * Відстеження очима (поворот шолома за мишкою)
     * ОНОВЛЕНО: Додано природні обмеження та ease-функції
     * FIXED (29.10.2025): Вимкнено під час жестів, TTS та слухання
     */
  updateEyeTracking() {
    if (!this.config.enableEyeTracking || !this.livingState.isUserPresent) return;

    // КРИТИЧНО: НЕ відстежуємо під час жестів, TTS або слухання
    if (this.livingState.isGestureActive || 
        this.livingState.isSpeaking || 
        this.livingState.isListening ||
        !this.livingState.eyeTrackingEnabled) {
      return;
    }

    const { x, y } = this.livingState.mousePosition;

    // Перетворення позиції мишки на обертання
    const targetY = x * this.config.maxRotationY;
    const targetX = -y * this.config.maxRotationX;

    // Обмеження обертання
    const clampedY = this.clampRotation(targetY, this.config.maxRotationY);
    const clampedX = this.clampRotation(targetX, this.config.maxRotationX);

    // Обчислення дельти (різниці) обертання
    const deltaY = clampedY - this.livingState.targetRotation.y;
    const deltaX = clampedX - this.livingState.targetRotation.x;

    // Адаптивна швидкість: повільніше для близьких позицій
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const baseSpeed = this.config.eyeTrackingSpeed;
    const speed = distance > 5 ? baseSpeed * 1.5 : baseSpeed * 0.8;

    // Квадратична ease-out функція
    const easeOutQuad = (t) => t * (2 - t);
    const easedSpeed = easeOutQuad(speed);

    this.livingState.targetRotation.y += deltaY * easedSpeed;
    this.livingState.targetRotation.x += deltaX * easedSpeed;
  }

  /**
   * Обмеження обертання для природності
   */
  clampRotation(value, max) {
    return Math.max(-max, Math.min(max, value));
  }

  /**
     * Idle поведінка - періодичні рухи коли нічого не відбувається
     * ОНОВЛЕНО: Додано виглядання за межі екрану як жива істота
     * FIXED (29.10.2025): Вимкнено під час активних анімацій
     */
  updateIdleBehavior(timestamp) {
    // КРИТИЧНО: НЕ виконуємо idle behavior під час жестів, TTS, слухання
    if (this.livingState.isGestureActive || 
        this.livingState.isSpeaking || 
        this.livingState.isListening) {
      return;
    }

    const timeSinceLastActivity = timestamp - this.livingState.lastMouseMove;

    if (timeSinceLastActivity > 5000 && !this.livingState.isSpeaking) {
      // Повільні idle рухи (базові)
      const t = timestamp * 0.00005;
      const idleRotationY = Math.sin(t) * 5;
      const idleRotationX = Math.cos(t * 0.7) * 3;

      this.livingState.targetRotation.y += idleRotationY * 0.02;
      this.livingState.targetRotation.x += idleRotationX * 0.02;

      // НОВА ПОВЕДІНКА: Виглядання за межі екрану (кожні 8-12 секунд)
      if (timeSinceLastActivity > 8000 && Math.random() < 0.0015) {
        this.performCuriousLook(timestamp);
      }
    }

    // Періодичне "моргання" емоцією
    if (timeSinceLastActivity > 15000 && Math.random() < 0.001) {
      const idleEmotions = ['contemplative', 'peaceful', 'curious'];
      const emotion = idleEmotions[Math.floor(Math.random() * idleEmotions.length)];
      this.setEmotion(emotion, 0.4, 2000);
    }
  }

  /**
   * Цікаве виглядання за межі екрану як жива істота
   */
  performCuriousLook(timestamp) {
    const directions = [
      { y: -45, x: 10, name: 'ліворуч' },   // Дивиться ліворуч
      { y: 45, x: 10, name: 'праворуч' },   // Дивиться праворуч
      { y: -30, x: -20, name: 'вгору-ліво' }, // Вгору-ліворуч
      { y: 30, x: -20, name: 'вгору-право' }, // Вгору-праворуч
      { y: 0, x: 25, name: 'вгору' }        // Прямо вгору
    ];

    const direction = directions[Math.floor(Math.random() * directions.length)];

    // Плавний поворот до цільової точки
    const duration = 2000; // 2 секунди на поворот
    const startY = this.livingState.targetRotation.y;
    const startX = this.livingState.targetRotation.x;
    const startTime = timestamp;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in-out для плавності
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      this.livingState.targetRotation.y = startY + (direction.y - startY) * eased;
      this.livingState.targetRotation.x = startX + (direction.x - startX) * eased;

      // Тримати погляд 1-2 секунди
      if (progress >= 1 && elapsed < duration + 1500) {
        requestAnimationFrame(animate);
      } else if (progress >= 1) {
        // Повернення до нормального стану
        this.returnToNeutralLook(currentTime);
      } else {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Повернення до нейтрального погляду після цікавого оглядання
   */
  returnToNeutralLook(timestamp) {
    const duration = 1500; // 1.5 секунди на повернення
    const startY = this.livingState.targetRotation.y;
    const startX = this.livingState.targetRotation.x;
    const startTime = timestamp;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3); // Ease-out

      this.livingState.targetRotation.y = startY - startY * eased;
      this.livingState.targetRotation.x = startX - startX * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
     * Застосування всіх трансформацій до моделі
     * ОНОВЛЕНО: Покращена інтерполяція з природними обмеженнями
     */
  applyTransformations() {
    const smoothness = this.config.rotationSmoothness;

    // Обчислюємо цільові значення
    let targetX = this.livingState.targetRotation.x + this.livingState.baseRotation.x;
    let targetY = this.livingState.targetRotation.y + this.livingState.baseRotation.y;
    let targetZ = this.livingState.targetRotation.z + this.livingState.baseRotation.z;

    // Застосовуємо глобальні обмеження для природності
    targetX = this.clampRotation(targetX, this.config.maxRotationX);
    targetY = this.clampRotation(targetY, this.config.maxRotationY);
    targetZ = this.clampRotation(targetZ, this.config.maxRotationZ);

    // Покращена інтерполяція з ease-функцією
    const deltaX = targetX - this.livingState.currentRotation.x;
    const deltaY = targetY - this.livingState.currentRotation.y;
    const deltaZ = targetZ - this.livingState.currentRotation.z;

    // Адаптивна швидкість: швидше для великих відстаней, повільніше для малих
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    const adaptiveSmoothness = distance > 10 ? smoothness * 1.5 : smoothness;

    // Cubic ease-out для природного сповільнення
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easedSmoothness = easeOutCubic(adaptiveSmoothness);

    this.livingState.currentRotation.x += deltaX * easedSmoothness;
    this.livingState.currentRotation.y += deltaY * easedSmoothness;
    this.livingState.currentRotation.z += deltaZ * easedSmoothness;

    // Застосовуємо до camera orbit з додатковою стабілізацією
    const theta = this.livingState.currentRotation.y;
    const phi = 75 + this.livingState.currentRotation.x;
    const radius = 105;

    this.modelViewer.cameraOrbit = `${theta}deg ${phi}deg ${radius}%`;
  }

  /**
     * Налаштування слухачів подій
     */
  setupEventListeners() {
    // Відстеження мишки
    document.addEventListener('mousemove', (e) => {
      if (!this.config.enableEyeTracking) return;

      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;

      this.livingState.mousePosition = { x, y };
      this.livingState.isUserPresent = true;
      this.livingState.lastMouseMove = Date.now();
    });

    // Користувач залишив сторінку
    document.addEventListener('mouseleave', () => {
      this.livingState.isUserPresent = false;
      this.setEmotion('lonely', 0.3, 1000);
    });

    document.addEventListener('mouseenter', () => {
      this.livingState.isUserPresent = true;
      this.setEmotion('welcoming', 0.6, 1000);
    });

    console.log('👂 Event listeners set up');
  }

  /**
     * Встановлення емоції
     */
  setEmotion(emotion, intensity = 0.7, duration = 1000) {
    if (!this.config.enableEmotions) return;

    // Запам'ятовуємо емоцію
    this.livingState.currentEmotion = emotion;

    // Застосовуємо візуальний стан
    this.applyEmotionVisuals(emotion, intensity);

    // Анімація емоції
    this.animateEmotion(emotion, intensity, duration);

    // Логування (опціонально)
    if (this.config.enableIntelligence) {
      this.recordEmotion(emotion, intensity);
    }

    console.log(`😊 Emotion: ${emotion} (${intensity.toFixed(2)})`);
  }

  /**
     * Застосування візуальних ефектів емоції
     */
  applyEmotionVisuals(emotion, intensity) {
    // Видаляємо попередні класи емоцій
    this.modelViewer.classList.remove('speaking', 'listening', 'thinking', 'focused');

    // Додаємо новий клас в залежності від емоції
    const emotionClassMap = {
      'speaking': 'speaking',
      'listening': 'listening',
      'thinking': 'thinking',
      'curious': 'thinking',
      'focused': 'focused',
      'alert': 'focused',
      'excited': 'speaking'
    };

    const className = emotionClassMap[emotion];
    if (className) {
      this.modelViewer.classList.add(className);
    }

    // НОВИНКА (29.10.2025): Оновлюємо колір ореолу на основі емоційного стану
    this.updateEmotionalGlow();
  }

  /**
   * Оновлення кольору ореолу на основі емоційного стану
   * НОВИНКА v4.1 (29.10.2025)
   */
  updateEmotionalGlow() {
    const state = this.emotionalState.getCurrentState();
    const css = this.emotionalState.getTransitionCSS();

    // Застосовуємо плавні CSS переходи
    this.modelViewer.style.filter = css.filter;
    this.modelViewer.style.transition = css.transition;
    this.modelViewer.style.opacity = css.opacity;

    console.log(`🎨 Emotional glow updated: ${state.label} (intensity: ${state.intensity.toFixed(2)})`);
  }

  /**
   * Аналіз повідомлення користувача та оновлення емоційного стану
   * НОВИНКА v4.1 (29.10.2025)
   */
  analyzeUserMessage(userMessage) {
    if (!userMessage || !userMessage.trim()) return;

    this.lastUserMessage = userMessage;
    const newState = this.emotionalState.analyzeEmotion(userMessage, this.lastAtlasResponse);

    console.log(`🧠 User message analyzed: "${userMessage.substring(0, 50)}..." -> ${newState.label}`);

    // Оновлюємо візуальний стан
    this.updateEmotionalGlow();

    // НОВИНКА (29.10.2025): Детекція жестів з ключових слів
    if (this.gestureAnimator) {
      const gesture = this.gestureDetector.detectGesture(userMessage);
      if (gesture) {
        console.log(`🎭 Detected gesture from user message: ${gesture.label}`);
        // Невелика затримка для природності
        setTimeout(() => {
          if (!this.livingState.isSpeaking) {
            this.gestureAnimator.performGesture(gesture);
          }
        }, 300);
      }
    }
  }

  /**
   * Обробка відповіді Atlas
   * НОВИНКА v4.1 (29.10.2025)
   */
  handleAtlasResponse(response) {
    if (!response || !response.trim()) return;

    this.lastAtlasResponse = response;
    console.log(`💬 Atlas response recorded: "${response.substring(0, 50)}..."`);

    // НОВИНКА (29.10.2025): Жести в відповідях Atlas
    if (this.gestureAnimator) {
      const gesture = this.gestureDetector.detectGesture(response);
      if (gesture) {
        console.log(`🎭 Atlas will perform gesture: ${gesture.label}`);
        // Жест виконується під час TTS
      }
    }
  }

  /**
   * Обробка події Whisper (слухання)
   * НОВИНКА v4.1 (29.10.2025)
   */
  startListening() {
    console.log('🎧 Atlas is listening...');
    this.livingState.isListening = true;

    // Жест прислуховування: наставляє вухо і трохи наближується
    if (this.gestureAnimator) {
      this.gestureAnimator.performGesture(AtlasGestures.LISTEN, { holdLast: true });
    }
  }

  /**
   * Завершення слухання
   */
  stopListening() {
    console.log('🔇 Atlas stopped listening');
    this.livingState.isListening = false;

    // Повертаємось до нормальної позиції
    if (this.gestureAnimator) {
      this.gestureAnimator.returnToNeutral();
    }
  }

  /**
     * Анімація емоції
     */
  animateEmotion(emotion, intensity, duration) {
    // Емоційні рухи
    const emotionMovements = {
      'joy': { x: 0, y: 5, z: 0 },
      'curious': { x: -5, y: 0, z: 2 },
      'focused': { x: -3, y: 0, z: 0 },
      'alert': { x: -8, y: 0, z: 1 },
      'excited': { x: 0, y: 8, z: 2 },
      'thinking': { x: -4, y: -3, z: 1 },
      'welcoming': { x: 0, y: 3, z: -1 },
      'satisfied': { x: 2, y: 2, z: 0 }
    };

    const movement = emotionMovements[emotion] || { x: 0, y: 0, z: 0 };

    // Застосовуємо рух
    this.livingState.targetRotation.x += movement.x * intensity;
    this.livingState.targetRotation.y += movement.y * intensity;
    this.livingState.targetRotation.z += movement.z * intensity;

    // Повернення до нейтралі
    if (this.emotionTimeout) {
      clearTimeout(this.emotionTimeout);
    }

    this.emotionTimeout = setTimeout(() => {
      this.livingState.targetRotation.x *= 0.5;
      this.livingState.targetRotation.y *= 0.5;
      this.livingState.targetRotation.z *= 0.5;
    }, duration);
  }

  /**
     * Початок мовлення (TTS)
     * FIXED (29.10.2025): Блокує eye tracking під час мовлення
     */
  startSpeaking(agent = 'atlas', intensity = 0.8) {
    console.log(`🎤 ${agent} started speaking`);

    this.livingState.isSpeaking = true;
    this.livingState.speechIntensity = intensity;
    this.livingState.currentAgent = agent;
    this.livingState.animationMode = 'speaking';
    this.livingState.eyeTrackingEnabled = false;

    // Емоція для агента
    const agentData = this.agentEmotions[agent] || this.agentEmotions['atlas'];
    this.setEmotion('speaking', agentData.intensity, 99999);

    // Динамічний рух під час мовлення
    this.startSpeechAnimation(agent);
  }

  /**
     * Анімація під час мовлення
     * ОНОВЛЕНО: Більш природні рухи з варіацією
     */
  startSpeechAnimation(agent) {
    const agentData = this.agentEmotions[agent] || this.agentEmotions['atlas'];
    let speechPhase = 0;

    // Природні коливання під час мовлення
    this.speechAnimationInterval = setInterval(() => {
      if (!this.livingState.isSpeaking) return;

      speechPhase += 0.1;
      const amplitude = this.config.ttsRotationAmplitude;
      
      // Синусоїдальні рухи замість випадкових для більшої природності
      const horizontalMove = Math.sin(speechPhase) * amplitude * 0.8;
      const verticalMove = Math.cos(speechPhase * 0.7) * amplitude * 0.4;
      const tiltMove = Math.sin(speechPhase * 1.3) * amplitude * 0.2;

      // Додаємо невеликий випадковий компонент для життєвості
      const randomFactor = (Math.random() - 0.5) * 0.3;

      this.livingState.targetRotation.y = horizontalMove + randomFactor;
      this.livingState.targetRotation.x = verticalMove + randomFactor * 0.5;
      this.livingState.targetRotation.z = tiltMove;
    }, this.config.ttsAnimationInterval);
  }

  /**
   * Зупинка мовлення
   * FIXED (29.10.2025): Розблоковує eye tracking після TTS
   */
  stopSpeaking() {
    console.log('🔇 Stopped speaking');

    this.livingState.isSpeaking = false;
    this.livingState.speechIntensity = 0;
    this.livingState.currentAgent = null;
    this.livingState.animationMode = 'idle';
    this.livingState.eyeTrackingEnabled = true;

    // Зупиняємо анімацію мовлення
    if (this.speechAnimationInterval) {
      clearInterval(this.speechAnimationInterval);
      this.speechAnimationInterval = null;
    }

    // Повертаємося до нейтрального стану
    this.setEmotion('neutral', 0.5, 1000);
  }

  /**
   * Compatibility method for TTS end (called from app-refactored.js)
   */
  onTTSEnd() {
    this.stopSpeaking();
  }

  /**
     * Реакція на подію системи
     */
  reactToEvent(eventType, data = {}) {
    console.log(`⚡ Reacting to event: ${eventType}`, data);

    const reactions = {
      'message-sent': () => this.setEmotion('listening', 0.7, 1500),
      'agent-thinking': () => this.setEmotion('thinking', 0.8, 2000),
      'agent-response': () => this.setEmotion('excited', 0.75, 1200),
      'error': () => this.setEmotion('alert', 1.0, 800),
      'keyword-detected': () => this.setEmotion('alert', 0.9, 600),
      'recording-start': () => this.setEmotion('focused', 0.9, 99999),
      'recording-stop': () => this.setEmotion('processing', 0.7, 1500)
    };

    const reaction = reactions[eventType];
    if (reaction) {
      reaction();
    }
  }

  /**
     * Запис емоції в пам'ять (для навчання)
     */
  recordEmotion(emotion, intensity) {
    const timestamp = Date.now();

    if (!this.livingState.emotionalMemory.has(emotion)) {
      this.livingState.emotionalMemory.set(emotion, []);
    }

    this.livingState.emotionalMemory.get(emotion).push({
      timestamp,
      intensity,
      context: this.livingState.currentAgent
    });

    // Обмежуємо розмір пам'яті
    const history = this.livingState.emotionalMemory.get(emotion);
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
     * Знищення системи
     */
  destroy() {
    console.log('💀 Destroying Atlas Living System...');

    this.livingState.isAlive = false;
    this.livingState.isAwake = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.emotionTimeout) {
      clearTimeout(this.emotionTimeout);
    }

    if (this.speechAnimationInterval) {
      clearInterval(this.speechAnimationInterval);
    }

    console.log('👋 Atlas Living System destroyed');
  }
}

export default AtlasGLBLivingSystem;
