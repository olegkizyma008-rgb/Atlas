/**
 * ATLAS GESTURES SYSTEM
 *
 * Система природних жестів та анімацій для Atlas
 * Реалістичні рухи: кивок, заперечення, поклін, прислухування
 *
 * @version 1.0.0
 * @date 2025-10-29
 */

/**
 * Бібліотека жестів Atlas
 */
export const AtlasGestures = {
  // Кивок (так/згода)
  NOD: {
    name: 'nod',
    label: 'Кивок',
    duration: 800,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.3, rotation: { x: 8, y: 0, z: 0 } }, // Нахил вниз
      { time: 0.6, rotation: { x: -2, y: 0, z: 0 } }, // Невеликий підйом
      { time: 1, rotation: { x: 0, y: 0, z: 0 } } // Повернення
    ],
    repeat: 2 // Подвійний кивок
  },

  // Заперечення (ні)
  SHAKE: {
    name: 'shake',
    label: 'Заперечення',
    duration: 900,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.25, rotation: { x: 0, y: -12, z: 0 } }, // Вліво
      { time: 0.5, rotation: { x: 0, y: 12, z: 0 } }, // Вправо
      { time: 0.75, rotation: { x: 0, y: -8, z: 0 } }, // Знову вліво (менше)
      { time: 1, rotation: { x: 0, y: 0, z: 0 } } // Повернення
    ],
    repeat: 1
  },

  // Поклін (дякую/вдячність)
  BOW: {
    name: 'bow',
    label: 'Поклін',
    duration: 1200,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.4, rotation: { x: 15, y: 0, z: 0 } }, // М'який нахил вниз
      { time: 0.7, rotation: { x: 15, y: 0, z: 0 } }, // Утримання
      { time: 1, rotation: { x: 0, y: 0, z: 0 } } // Повільне повернення
    ],
    repeat: 1,
    easing: 'ease-in-out'
  },

  // Прислухування (увага до звуку)
  LISTEN: {
    name: 'listen',
    label: 'Прислухування',
    duration: 1000,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.3, rotation: { x: -3, y: 15, z: 5 } }, // Нахил вбік + поворот
      { time: 0.6, rotation: { x: -2, y: 12, z: 4 } }, // Трохи ближче
      { time: 1, rotation: { x: -2, y: 12, z: 4 } } // Утримання позиції
    ],
    repeat: 1,
    holdLast: true // Утримувати останню позицію
  },

  // Наближення (цікавість/фокус)
  LEAN_FORWARD: {
    name: 'lean_forward',
    label: 'Наближення',
    duration: 800,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 }, scale: 1.0 },
      { time: 0.5, rotation: { x: -5, y: 0, z: 0 }, scale: 1.08 },
      { time: 1, rotation: { x: -5, y: 0, z: 0 }, scale: 1.08 }
    ],
    repeat: 1,
    holdLast: true
  },

  // Відхилення назад (здивування/відступ)
  LEAN_BACK: {
    name: 'lean_back',
    label: 'Відхилення',
    duration: 600,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 }, scale: 1.0 },
      { time: 0.5, rotation: { x: 5, y: 0, z: 0 }, scale: 0.95 },
      { time: 1, rotation: { x: 3, y: 0, z: 0 }, scale: 0.97 }
    ],
    repeat: 1,
    holdLast: true
  },

  // Нахил (цікавість/роздуми)
  TILT: {
    name: 'tilt',
    label: 'Нахил',
    duration: 700,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.5, rotation: { x: 0, y: 5, z: 8 } },
      { time: 1, rotation: { x: 0, y: 5, z: 8 } }
    ],
    repeat: 1,
    holdLast: true
  },

  // Готовність до відповіді
  READY: {
    name: 'ready',
    label: 'Готовність',
    duration: 500,
    keyframes: [
      { time: 0, rotation: { x: 0, y: 0, z: 0 } },
      { time: 0.4, rotation: { x: -2, y: 0, z: 0 } },
      { time: 1, rotation: { x: 0, y: 0, z: 0 } }
    ],
    repeat: 1
  }
};

/**
 * Детектор ключових слів для жестів
 */
export class GestureDetector {
  constructor() {
    // Мапінг ключових слів на жести
    this.keywordMap = {
      // Згода
      'так': AtlasGestures.NOD,
      'ага': AtlasGestures.NOD,
      'добре': AtlasGestures.NOD,
      'згоден': AtlasGestures.NOD,
      'звичайно': AtlasGestures.NOD,
      'yes': AtlasGestures.NOD,
      'okay': AtlasGestures.NOD,
      'ok': AtlasGestures.NOD,

      // Заперечення
      'ні': AtlasGestures.SHAKE,
      'не': AtlasGestures.SHAKE,
      'ніколи': AtlasGestures.SHAKE,
      'no': AtlasGestures.SHAKE,
      'nope': AtlasGestures.SHAKE,

      // Вдячність
      'дякую': AtlasGestures.BOW,
      'спасибі': AtlasGestures.BOW,
      'thank': AtlasGestures.BOW,
      'thanks': AtlasGestures.BOW,
      'вдячний': AtlasGestures.BOW,
      'дуже дякую': AtlasGestures.BOW
    };
  }

  /**
   * Визначення жесту з тексту
   */
  detectGesture(text) {
    if (!text || typeof text !== 'string') return null;

    const lowerText = text.toLowerCase().trim();

    // Перевіряємо точну відповідність
    if (this.keywordMap[lowerText]) {
      return this.keywordMap[lowerText];
    }

    // Перевіряємо наявність ключових слів у тексті
    for (const [keyword, gesture] of Object.entries(this.keywordMap)) {
      if (lowerText.includes(keyword)) {
        return gesture;
      }
    }

    return null;
  }

  /**
   * Визначення контекстного жесту
   */
  detectContextualGesture(text, context = {}) {
    // Спочатку намагаємось знайти прямий жест
    const directGesture = this.detectGesture(text);
    if (directGesture) return directGesture;

    // Контекстні жести на основі ситуації
    if (context.isListening) {
      return AtlasGestures.LISTEN;
    }

    if (context.isThinking) {
      return AtlasGestures.TILT;
    }

    if (context.isSurprised) {
      return AtlasGestures.LEAN_BACK;
    }

    if (context.isCurious) {
      return AtlasGestures.LEAN_FORWARD;
    }

    return null;
  }
}

/**
 * Аніматор жестів
 */
export class GestureAnimator {
  constructor(livingSystem) {
    this.livingSystem = livingSystem;
    this.currentGesture = null;
    this.isAnimating = false;
    this.animationFrame = null;
    this.gestureQueue = [];
  }

  /**
   * Виконання жесту
   * FIXED (29.10.2025): Блокує eye tracking під час виконання
   * TEMPORARY FIX (30.10.2025): HARD DISABLED - запобігає WebGL помилкам
   */
  async performGesture(gesture, _options = {}) {
    // CRITICAL: Повністю відключаємо gesture анімації до виправлення WebGL проблеми
    // Проблема: Canvas стає невалідним під час анімацій, спричинюючи framebuffer errors
    console.log('⚠️ Gesture animation disabled (WebGL protection):', gesture?.label);
    return;

    /* DISABLED CODE - Will be re-enabled after fixing canvas resize issue
    if (!gesture || this.isAnimating) {
      // Додаємо в чергу якщо вже виконується інша анімація
      if (gesture && !options.skipQueue) {
        this.gestureQueue.push({ gesture, options });
      }
      return;
    }

    this.isAnimating = true;
    this.currentGesture = gesture;

    // КРИТИЧНО: Блокуємо eye tracking під час жесту
    this.livingSystem.livingState.isGestureActive = true;
    this.livingSystem.livingState.animationMode = 'gesture';

    console.log(`🎭 Performing gesture: ${gesture.label}`);

    const repeatCount = options.repeat !== undefined ? options.repeat : gesture.repeat || 1;

    for (let i = 0; i < repeatCount; i++) {
      await this.animateKeyframes(gesture);
      if (i < repeatCount - 1) {
        await this.delay(100); // Невелика пауза між повтореннями
      }
    }

    // Якщо не потрібно утримувати останню позицію - повертаємось до нейтралі
    if (!gesture.holdLast && !options.holdLast) {
      await this.returnToNeutral();
    }

    this.isAnimating = false;
    this.currentGesture = null;

    // Розблоковуємо eye tracking
    this.livingSystem.livingState.isGestureActive = false;
    this.livingSystem.livingState.animationMode = 'idle';

    // Обробка черги
    if (this.gestureQueue.length > 0) {
      const next = this.gestureQueue.shift();
      await this.performGesture(next.gesture, next.options);
    }
    */
  }

  /**
   * Анімація по keyframes
   */
  async animateKeyframes(gesture) {
    const startTime = Date.now();
    const duration = gesture.duration;

    return new Promise((resolve) => {
      const animate = () => {
        // CRITICAL FIX (30.10.2025): Перевіряємо canvas перед кожним кадром анімації
        if (!this.livingSystem.isCanvasReady()) {
          // Canvas не готовий - відкладаємо анімацію
          console.log('⚠️ Canvas not ready, deferring animation frame');
          setTimeout(() => {
            if (this.livingSystem.isCanvasReady()) {
              this.animationFrame = requestAnimationFrame(animate);
            } else {
              resolve(); // Завершуємо якщо canvas все ще не готовий
            }
          }, 50);
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Знаходимо поточні та наступні keyframes
        let currentFrame = gesture.keyframes[0];
        let nextFrame = gesture.keyframes[1];

        for (let i = 0; i < gesture.keyframes.length - 1; i++) {
          if (progress >= gesture.keyframes[i].time && progress < gesture.keyframes[i + 1].time) {
            currentFrame = gesture.keyframes[i];
            nextFrame = gesture.keyframes[i + 1];
            break;
          }
        }

        // Якщо досягли кінця - беремо останній frame
        if (progress >= gesture.keyframes[gesture.keyframes.length - 1].time) {
          currentFrame = gesture.keyframes[gesture.keyframes.length - 1];
          nextFrame = currentFrame;
        }

        // Інтерполяція між keyframes
        const frameProgress = currentFrame === nextFrame ? 1 :
          (progress - currentFrame.time) / (nextFrame.time - currentFrame.time);

        const easedProgress = this.easeInOutCubic(frameProgress);

        // CRITICAL FIX (30.10.2025 v3): Перевіряємо canvas перед кожною операцією зміни
        if (!this.livingSystem.isCanvasReady()) {
          console.log('⚠️ Canvas became invalid during animation, aborting frame');
          resolve(); // Завершуємо анімацію безпечно
          return;
        }

        // Застосовуємо ротацію
        this.livingSystem.livingState.targetRotation.x =
          this.lerp(currentFrame.rotation.x, nextFrame.rotation.x, easedProgress);
        this.livingSystem.livingState.targetRotation.y =
          this.lerp(currentFrame.rotation.y, nextFrame.rotation.y, easedProgress);
        this.livingSystem.livingState.targetRotation.z =
          this.lerp(currentFrame.rotation.z, nextFrame.rotation.z, easedProgress);

        // Якщо є scale - застосовуємо
        if (currentFrame.scale !== undefined && nextFrame.scale !== undefined) {
          const scale = this.lerp(currentFrame.scale, nextFrame.scale, easedProgress);
          // Перевіряємо canvas перед зміною scale
          if (this.livingSystem.isCanvasReady()) {
            this.livingSystem.modelViewer.scale = `${scale} ${scale} ${scale}`;
          }
        }

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Повернення до нейтральної позиції
   * FIXED (29.10.2025): Плавний перехід з ease-out
   * FIXED (30.10.2025): Додано перевірку canvas перед анімацією
   */
  async returnToNeutral() {
    // CRITICAL: Перевіряємо canvas перед початком анімації
    if (!this.livingSystem.isCanvasReady()) {
      console.log('⚠️ Canvas not ready for returnToNeutral animation, skipping');
      // Просто встановлюємо нейтральні значення без анімації
      this.livingSystem.livingState.targetRotation.x = 0;
      this.livingSystem.livingState.targetRotation.y = 0;
      this.livingSystem.livingState.targetRotation.z = 0;
      this.livingSystem.livingState.currentRotation.x = 0;
      this.livingSystem.livingState.currentRotation.y = 0;
      this.livingSystem.livingState.currentRotation.z = 0;
      return;
    }

    const currentRotation = {
      x: this.livingSystem.livingState.currentRotation.x,
      y: this.livingSystem.livingState.currentRotation.y,
      z: this.livingSystem.livingState.currentRotation.z
    };

    // Плавний перехід до нейтральної позиції
    const neutralGesture = {
      label: 'neutral',
      keyframes: [
        {
          rotation: { x: currentRotation.x * 0.5, y: currentRotation.y * 0.5, z: currentRotation.z * 0.5 },
          scale: 1.0,
          duration: 200
        },
        {
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1.0,
          duration: 300
        }
      ],
      easing: 'ease-out'
    };
    await this.animateKeyframes(neutralGesture);
  }

  /**
   * Лінійна інтерполяція
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Ease-in-out cubic функція
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Затримка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Скасування поточної анімації
   */
  cancel() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
    this.currentGesture = null;
    this.gestureQueue = [];
  }
}
