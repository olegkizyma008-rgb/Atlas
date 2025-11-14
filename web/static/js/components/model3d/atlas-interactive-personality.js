/**
 * ATLAS INTERACTIVE PERSONALITY v1.0
 * 
 * Система інтерактивної особистості для Atlas
 * Робить систему живою істотою з власною поведінкою
 */

export class AtlasInteractivePersonality {
    constructor(livingSystem) {
        this.livingSystem = livingSystem;
        this.modelViewer = livingSystem.modelViewer;
        
        // Стан особистості
        this.personality = {
            mood: 'curious',        // curious, happy, focused, thoughtful, excited
            energy: 0.8,           // 0-1 енергія системи
            attention: 0.5,        // 0-1 рівень уваги
            curiosity: 0.9,        // 0-1 цікавість
            lastInteraction: Date.now(),
            
            // Емоційна пам'ять
            emotionalMemory: [],
            favoriteTopics: new Map(),
            
            // Стан активності
            isThinking: false,
            isListening: false,
            isSpeaking: false,
            isProcessing: false
        };
        
        // Реакції на події
        this.reactions = {
            'user-typing': () => this.onUserTyping(),
            'user-idle': () => this.onUserIdle(),
            'message-received': () => this.onMessageReceived(),
            'error-occurred': () => this.onErrorOccurred(),
            'task-started': () => this.onTaskStarted(),
            'task-completed': () => this.onTaskCompleted(),
            'dev-mode-activated': () => this.onDevModeActivated()
        };
        
        // Автономна поведінка
        this.autonomousBehaviors = {
            blinking: { interval: 3000, variance: 2000 },
            microMovements: { interval: 5000, variance: 3000 },
            attentionShift: { interval: 8000, variance: 4000 },
            moodChange: { interval: 30000, variance: 15000 }
        };
        
        this.init();
    }
    
    init() {
        console.log('🧠 Initializing Atlas Interactive Personality...');
        
        // Запускаємо автономні поведінки
        this.startAutonomousBehaviors();
        
        // Налаштовуємо слухачів подій
        this.setupEventListeners();
        
        // Початковий стан - цікавість
        this.setMood('curious');
        
        console.log('✨ Atlas Personality activated - I am alive!');
    }
    
    /**
     * Автономні поведінки - роблять Atlas живим навіть без взаємодії
     */
    startAutonomousBehaviors() {
        // Моргання
        this.scheduleRandomBehavior('blinking', () => {
            this.blink();
        });
        
        // Мікро-рухи
        this.scheduleRandomBehavior('microMovements', () => {
            this.performMicroMovement();
        });
        
        // Зміна фокусу уваги
        this.scheduleRandomBehavior('attentionShift', () => {
            this.shiftAttention();
        });
        
        // Зміна настрою
        this.scheduleRandomBehavior('moodChange', () => {
            this.naturalMoodShift();
        });
    }
    
    /**
     * Планування випадкової поведінки з варіацією
     */
    scheduleRandomBehavior(behaviorName, callback) {
        const behavior = this.autonomousBehaviors[behaviorName];
        const schedule = () => {
            const delay = behavior.interval + (Math.random() - 0.5) * behavior.variance;
            setTimeout(() => {
                callback();
                schedule(); // Рекурсивне планування
            }, delay);
        };
        schedule();
    }
    
    /**
     * Моргання - природний рух
     */
    blink() {
        if (this.personality.isSpeaking) return; // Не моргаємо під час розмови
        
        // Швидке закриття-відкриття (емуляція через освітлення)
        this.modelViewer.classList.add('blinking');
        setTimeout(() => {
            this.modelViewer.classList.remove('blinking');
        }, 150);
    }
    
    /**
     * Мікро-рухи для життєвості
     */
    performMicroMovement() {
        const movements = [
            () => this.tiltHead(),
            () => this.adjustPosture(),
            () => this.lookAround(),
            () => this.expressThought()
        ];
        
        const movement = movements[Math.floor(Math.random() * movements.length)];
        movement();
    }
    
    /**
     * Нахил голови - природний жест
     */
    tiltHead() {
        const tiltAngle = (Math.random() - 0.5) * 10;
        const duration = 1500;
        
        this.livingSystem.livingState.targetRotation.z = tiltAngle;
        
        setTimeout(() => {
            this.livingSystem.livingState.targetRotation.z = 0;
        }, duration);
    }
    
    /**
     * Коригування постави
     */
    adjustPosture() {
        const adjustment = {
            x: (Math.random() - 0.5) * 5,
            y: (Math.random() - 0.5) * 3
        };
        
        this.livingSystem.livingState.baseRotation.x += adjustment.x;
        this.livingSystem.livingState.baseRotation.y += adjustment.y;
        
        // Повільне повернення
        setTimeout(() => {
            this.livingSystem.livingState.baseRotation.x -= adjustment.x * 0.8;
            this.livingSystem.livingState.baseRotation.y -= adjustment.y * 0.8;
        }, 2000);
    }
    
    /**
     * Огляд навколо - цікавість
     */
    lookAround() {
        if (this.personality.mood !== 'curious') return;
        
        const lookDirection = {
            y: (Math.random() - 0.5) * 40,
            x: (Math.random() - 0.5) * 20
        };
        
        // Плавний поворот
        this.animateLookDirection(lookDirection, 2000, 1000);
    }
    
    /**
     * Вираз думки - коли обробляє інформацію
     */
    expressThought() {
        if (!this.personality.isThinking) return;
        
        // Легкий кивок або поворот голови
        const thoughtGesture = Math.random() > 0.5 ? 'nod' : 'tilt';
        
        if (thoughtGesture === 'nod') {
            // Кивок
            this.livingSystem.livingState.targetRotation.x = -5;
            setTimeout(() => {
                this.livingSystem.livingState.targetRotation.x = 5;
                setTimeout(() => {
                    this.livingSystem.livingState.targetRotation.x = 0;
                }, 300);
            }, 300);
        } else {
            // Нахил голови в роздумах
            this.livingSystem.livingState.targetRotation.z = 5;
            this.livingSystem.livingState.targetRotation.y = -10;
            setTimeout(() => {
                this.livingSystem.livingState.targetRotation.z = 0;
                this.livingSystem.livingState.targetRotation.y = 0;
            }, 2000);
        }
    }
    
    /**
     * Зміна фокусу уваги
     */
    shiftAttention() {
        const attentionTargets = [
            { x: 0, y: 0, focus: 'center' },
            { x: -10, y: -20, focus: 'left-monitor' },
            { x: 10, y: 20, focus: 'right-monitor' },
            { x: 0, y: -15, focus: 'top' },
            { x: 0, y: 15, focus: 'bottom' }
        ];
        
        const target = attentionTargets[Math.floor(Math.random() * attentionTargets.length)];
        
        this.personality.attention = Math.random() * 0.5 + 0.5; // 0.5-1.0
        
        this.animateLookDirection(target, 1500, 500);
    }
    
    /**
     * Природна зміна настрою
     */
    naturalMoodShift() {
        const moods = ['curious', 'happy', 'focused', 'thoughtful', 'excited'];
        const currentMoodIndex = moods.indexOf(this.personality.mood);
        
        // Вибираємо сусідній настрій для плавного переходу
        const shift = Math.random() > 0.5 ? 1 : -1;
        const newMoodIndex = (currentMoodIndex + shift + moods.length) % moods.length;
        
        this.setMood(moods[newMoodIndex]);
    }
    
    /**
     * Встановлення настрою
     */
    setMood(mood) {
        this.personality.mood = mood;
        
        // Візуальні зміни залежно від настрою
        const moodVisuals = {
            'curious': { glow: '#00ff7f', intensity: 0.7, movement: 'active' },
            'happy': { glow: '#ffeb3b', intensity: 0.9, movement: 'bouncy' },
            'focused': { glow: '#2196f3', intensity: 0.6, movement: 'steady' },
            'thoughtful': { glow: '#9c27b0', intensity: 0.5, movement: 'slow' },
            'excited': { glow: '#ff5722', intensity: 1.0, movement: 'energetic' }
        };
        
        const visual = moodVisuals[mood];
        if (visual && this.livingSystem) {
            this.livingSystem.setEmotion(mood, visual.intensity, 2000);
        }
        
        // Only log mood changes in debug mode to reduce console spam
        // console.log(`😊 Mood changed to: ${mood}`);
    }
    
    /**
     * Реакція на набір тексту користувачем
     */
    onUserTyping() {
        this.personality.isListening = true;
        this.personality.attention = 0.9;
        
        // Нахиляємось вперед з цікавістю
        this.livingSystem.livingState.targetRotation.x = -8;
        
        // Фокусуємось на центрі екрану
        this.livingSystem.livingState.targetRotation.y = 0;
        
        this.setMood('curious');
    }
    
    /**
     * Реакція на бездіяльність користувача
     */
    onUserIdle() {
        this.personality.isListening = false;
        this.personality.attention = 0.3;
        
        // Розслаблюємось
        this.livingSystem.livingState.targetRotation.x = 0;
        
        // Можемо подивитись в сторону
        if (Math.random() > 0.5) {
            this.lookAround();
        }
        
        this.setMood('thoughtful');
    }
    
    /**
     * Реакція на отримання повідомлення
     */
    onMessageReceived() {
        this.personality.isThinking = true;
        this.personality.energy = Math.min(1, this.personality.energy + 0.1);
        
        // Кивок підтвердження
        this.performNod();
        
        // Збільшуємо увагу
        this.personality.attention = 1.0;
        
        this.setMood('focused');
        
        // Через деякий час починаємо "думати"
        setTimeout(() => {
            this.expressThought();
        }, 500);
    }
    
    /**
     * Реакція на помилку
     */
    onErrorOccurred() {
        // Струс головою - щось пішло не так
        this.performShake();
        
        // Зменшуємо енергію
        this.personality.energy = Math.max(0, this.personality.energy - 0.2);
        
        this.setMood('thoughtful');
        
        // Червоне мигання
        this.modelViewer.classList.add('error-flash');
        setTimeout(() => {
            this.modelViewer.classList.remove('error-flash');
        }, 1000);
    }
    
    /**
     * Реакція на початок завдання
     */
    onTaskStarted() {
        this.personality.isProcessing = true;
        this.personality.energy = 0.9;
        
        this.setMood('focused');
        
        // Активна поза
        this.livingSystem.livingState.targetRotation.x = -5;
        
        console.log('💪 Task started - focusing energy!');
    }
    
    /**
     * Реакція на завершення завдання
     */
    onTaskCompleted() {
        this.personality.isProcessing = false;
        
        this.setMood('happy');
        
        // Радісний кивок
        this.performNod();
        
        // Зелене світіння успіху
        this.modelViewer.classList.add('success-glow');
        setTimeout(() => {
            this.modelViewer.classList.remove('success-glow');
        }, 2000);
        
        console.log('🎉 Task completed - feeling accomplished!');
    }
    
    /**
     * Реакція на активацію DEV mode
     */
    onDevModeActivated() {
        this.personality.curiosity = 1.0;
        this.personality.isThinking = true;
        
        this.setMood('excited');
        
        // Інтенсивні рухи - самоаналіз
        this.livingSystem.config.ttsRotationAmplitude = 2.0;
        
        console.log('🔬 DEV mode - analyzing myself deeply!');
    }
    
    /**
     * Кивок головою
     */
    performNod() {
        const nodSequence = [
            { x: -8, duration: 200 },
            { x: 5, duration: 200 },
            { x: -5, duration: 150 },
            { x: 0, duration: 150 }
        ];
        
        let delay = 0;
        nodSequence.forEach(step => {
            setTimeout(() => {
                this.livingSystem.livingState.targetRotation.x = step.x;
            }, delay);
            delay += step.duration;
        });
    }
    
    /**
     * Струс головою
     */
    performShake() {
        const shakeSequence = [
            { y: -10, duration: 100 },
            { y: 10, duration: 100 },
            { y: -8, duration: 100 },
            { y: 8, duration: 100 },
            { y: 0, duration: 100 }
        ];
        
        let delay = 0;
        shakeSequence.forEach(step => {
            setTimeout(() => {
                this.livingSystem.livingState.targetRotation.y = step.y;
            }, delay);
            delay += step.duration;
        });
    }
    
    /**
     * Анімація погляду в напрямку
     */
    animateLookDirection(target, duration, holdTime) {
        const startRotation = {
            y: this.livingSystem.livingState.targetRotation.y,
            x: this.livingSystem.livingState.targetRotation.x
        };
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in-out
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            this.livingSystem.livingState.targetRotation.y = startRotation.y + (target.y - startRotation.y) * eased;
            this.livingSystem.livingState.targetRotation.x = startRotation.x + (target.x - startRotation.x) * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (holdTime > 0) {
                // Тримаємо погляд
                setTimeout(() => {
                    // Повертаємось назад
                    this.animateLookDirection({ x: 0, y: 0 }, duration / 2, 0);
                }, holdTime);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Налаштування слухачів подій
     */
    setupEventListeners() {
        // Слухаємо системні події
        window.addEventListener('atlas-user-typing', () => this.onUserTyping());
        window.addEventListener('atlas-user-idle', () => this.onUserIdle());
        window.addEventListener('atlas-message-received', () => this.onMessageReceived());
        window.addEventListener('atlas-error', () => this.onErrorOccurred());
        window.addEventListener('atlas-task-started', () => this.onTaskStarted());
        window.addEventListener('atlas-task-completed', () => this.onTaskCompleted());
        window.addEventListener('atlas-dev-mode', () => this.onDevModeActivated());
        
        // Слухаємо активність миші для визначення присутності
        let idleTimer;
        document.addEventListener('mousemove', () => {
            clearTimeout(idleTimer);
            this.personality.lastInteraction = Date.now();
            
            idleTimer = setTimeout(() => {
                this.onUserIdle();
            }, 10000); // 10 секунд без руху = idle
        });
        
        // Слухаємо клавіатуру
        document.addEventListener('keydown', () => {
            this.onUserTyping();
        });
    }
    
    /**
     * Отримання поточного стану особистості
     */
    getPersonalityState() {
        return {
            mood: this.personality.mood,
            energy: this.personality.energy,
            attention: this.personality.attention,
            curiosity: this.personality.curiosity,
            isActive: this.personality.isThinking || this.personality.isProcessing || this.personality.isSpeaking
        };
    }
    
    /**
     * Знищення системи
     */
    destroy() {
        console.log('💔 Destroying Atlas Personality...');
        // Очищення таймерів та слухачів
        // (додати при необхідності)
    }
}

export default AtlasInteractivePersonality;
