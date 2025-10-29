/**
 * ATLAS EMOTIONAL STATE SYSTEM
 * 
 * Система визначення емоційного стану Atlas на основі контексту розмови
 * Аналізує тон користувача та відповідає емоційними станами з відповідними кольорами ореолу
 * 
 * @version 1.0.0
 * @date 2025-10-29
 */

/**
 * Емоційні стани та їх візуальне представлення
 */
export const EmotionalStates = {
  // 🔴 Негативні емоції
  ANGRY: {
    name: 'angry',
    label: 'Розлючений',
    color: 'rgba(255, 50, 50, 0.9)',
    glow: '#ff3232',
    intensity: 1.5,
    keywords: ['дурний', 'ідіот', 'тупий', 'недолугий', 'безглуздя', 'нісенітниця', 'маячня']
  },
  FRUSTRATED: {
    name: 'frustrated',
    label: 'Засмучений',
    color: 'rgba(255, 100, 50, 0.8)',
    glow: '#ff6432',
    intensity: 1.2,
    keywords: ['не розумієш', 'не працює', 'знову', 'погано', 'не так']
  },
  SAD: {
    name: 'sad',
    label: 'Сумний',
    color: 'rgba(100, 150, 255, 0.7)',
    glow: '#6496ff',
    intensity: 0.8,
    keywords: ['сумно', 'жаль', 'шкода', 'нажаль', 'не вийшло']
  },

  // 🟢 Позитивні емоції
  HAPPY: {
    name: 'happy',
    label: 'Щасливий',
    color: 'rgba(255, 255, 100, 0.9)',
    glow: '#ffff64',
    intensity: 1.3,
    keywords: ['супер', 'класно', 'чудово', 'відмінно', 'круто', 'молодець', 'браво']
  },
  EXCITED: {
    name: 'excited',
    label: 'Схвильований',
    color: 'rgba(255, 200, 0, 0.9)',
    glow: '#ffc800',
    intensity: 1.4,
    keywords: ['вау', 'неймовірно', 'фантастично', 'дивовижно', 'ого']
  },
  PROUD: {
    name: 'proud',
    label: 'Гордий',
    color: 'rgba(200, 150, 255, 0.9)',
    glow: '#c896ff',
    intensity: 1.2,
    keywords: ['пишаюся', 'горжусь', 'гордість', 'успіх', 'досягнення']
  },

  // 🟣 Творчі стани
  CREATIVE: {
    name: 'creative',
    label: 'Творчий',
    color: 'rgba(200, 100, 255, 0.9)',
    glow: '#c864ff',
    intensity: 1.3,
    keywords: ['створи', 'придумай', 'ідея', 'креативно', 'цікаво', 'незвичайно']
  },
  INSPIRED: {
    name: 'inspired',
    label: 'Натхненний',
    color: 'rgba(255, 150, 255, 0.9)',
    glow: '#ff96ff',
    intensity: 1.4,
    keywords: ['натхнення', 'генетально', 'блискуче', 'талант']
  },

  // 🔵 Робочі стани
  FOCUSED: {
    name: 'focused',
    label: 'Зосереджений',
    color: 'rgba(136, 0, 255, 0.8)',
    glow: '#8800ff',
    intensity: 1.1,
    keywords: ['аналізуй', 'подумай', 'зосередься', 'важливо', 'серйозно']
  },
  WORKING: {
    name: 'working',
    label: 'Працює',
    color: 'rgba(0, 200, 255, 0.8)',
    glow: '#00c8ff',
    intensity: 1.0,
    keywords: ['зроби', 'виконай', 'налаштуй', 'впровадь', 'реалізуй']
  },
  LEARNING: {
    name: 'learning',
    label: 'Навчається',
    color: 'rgba(100, 255, 200, 0.8)',
    glow: '#64ffc8',
    intensity: 1.0,
    keywords: ['навчи', 'поясни', 'розкажи', 'як працює', 'що таке']
  },

  // 🟡 Спокійні стани
  CALM: {
    name: 'calm',
    label: 'Спокійний',
    color: 'rgba(0, 255, 200, 0.7)',
    glow: '#00ffc8',
    intensity: 0.9,
    keywords: ['спокійно', 'добре', 'нормально', 'гаразд', 'окей']
  },
  THOUGHTFUL: {
    name: 'thoughtful',
    label: 'Задумливий',
    color: 'rgba(150, 200, 255, 0.8)',
    glow: '#96c8ff',
    intensity: 0.9,
    keywords: ['думаю', 'роздумую', 'міркую', 'цікаво', 'гм']
  },

  // 🟠 Нейтральний (за замовчуванням)
  NEUTRAL: {
    name: 'neutral',
    label: 'Нейтральний',
    color: 'rgba(0, 255, 127, 0.7)',
    glow: '#00ff7f',
    intensity: 1.0,
    keywords: []
  }
};

/**
 * Сервіс аналізу емоційного стану
 */
export class AtlasEmotionalStateService {
  constructor() {
    this.currentState = EmotionalStates.NEUTRAL;
    this.stateHistory = [];
    this.maxHistorySize = 10;
    
    // Плавність переходів
    this.transitionDuration = 800; // мс
    this.isTransitioning = false;
    
    // Аналіз тону
    this.sentimentScore = 0; // -1 (негативний) до 1 (позитивний)
    this.intensityLevel = 0.5; // 0 до 1
  }

  /**
   * Аналіз тексту користувача для визначення емоційного стану
   * @param {string} userMessage - Повідомлення користувача
   * @param {string} atlasResponse - Відповідь Atlas (опціонально)
   * @returns {Object} - Новий емоційний стан
   */
  analyzeEmotion(userMessage, atlasResponse = '') {
    if (!userMessage || !userMessage.trim()) {
      return this.currentState;
    }

    const text = userMessage.toLowerCase();
    let bestMatch = EmotionalStates.NEUTRAL;
    let highestScore = 0;

    // Аналізуємо кожен емоційний стан
    for (const [key, state] of Object.entries(EmotionalStates)) {
      const score = this._calculateStateScore(text, state);
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = state;
      }
    }

    // Якщо знайдено чіткий емоційний маркер
    if (highestScore > 0) {
      this._updateState(bestMatch);
      return bestMatch;
    }

    // Якщо немає чітких маркерів - аналізуємо загальний тон
    const sentiment = this._analyzeSentiment(text);
    const emotionFromSentiment = this._getEmotionFromSentiment(sentiment);
    
    this._updateState(emotionFromSentiment);
    return emotionFromSentiment;
  }

  /**
   * Розрахунок відповідності тексту емоційному стану
   */
  _calculateStateScore(text, state) {
    let score = 0;
    
    for (const keyword of state.keywords) {
      if (text.includes(keyword)) {
        score += 1;
      }
    }
    
    return score;
  }

  /**
   * Аналіз загального сентименту тексту
   */
  _analyzeSentiment(text) {
    // Позитивні слова
    const positiveWords = ['дякую', 'спасибі', 'добре', 'гарно', 'чудово', 'відмінно', 'класно', 'люблю', 'подобається', 'так', 'звичайно', 'ага'];
    const negativeWords = ['ні', 'погано', 'не подобається', 'не хочу', 'не треба', 'ненавиджу', 'жах', 'кошмар'];
    
    let sentiment = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) sentiment += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) sentiment -= 0.3;
    });
    
    // Знаки оклику додають інтенсивність
    const exclamationCount = (text.match(/!/g) || []).length;
    this.intensityLevel = Math.min(1.0, 0.5 + (exclamationCount * 0.15));
    
    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Визначення емоції на основі сентименту
   */
  _getEmotionFromSentiment(sentiment) {
    if (sentiment > 0.5) return EmotionalStates.HAPPY;
    if (sentiment > 0.2) return EmotionalStates.CALM;
    if (sentiment < -0.5) return EmotionalStates.ANGRY;
    if (sentiment < -0.2) return EmotionalStates.FRUSTRATED;
    
    return EmotionalStates.NEUTRAL;
  }

  /**
   * Оновлення поточного стану
   */
  _updateState(newState) {
    if (this.currentState.name !== newState.name) {
      // Зберігаємо історію
      this.stateHistory.push({
        state: this.currentState,
        timestamp: Date.now()
      });
      
      // Обмежуємо розмір історії
      if (this.stateHistory.length > this.maxHistorySize) {
        this.stateHistory.shift();
      }
      
      this.currentState = newState;
    }
  }

  /**
   * Отримання поточного стану
   */
  getCurrentState() {
    return {
      ...this.currentState,
      intensity: this.intensityLevel,
      sentiment: this.sentimentScore
    };
  }

  /**
   * Отримання CSS для плавного переходу
   */
  getTransitionCSS() {
    return {
      filter: `drop-shadow(0 0 ${60 + (this.intensityLevel * 40)}px ${this.currentState.color}) brightness(${1.1 + (this.intensityLevel * 0.3)})`,
      transition: `filter ${this.transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`,
      opacity: 0.75 + (this.intensityLevel * 0.15)
    };
  }

  /**
   * Примусова зміна стану
   */
  setState(stateName) {
    const state = Object.values(EmotionalStates).find(s => s.name === stateName);
    if (state) {
      this._updateState(state);
      return state;
    }
    return this.currentState;
  }

  /**
   * Скидання до нейтрального стану
   */
  reset() {
    this._updateState(EmotionalStates.NEUTRAL);
    this.sentimentScore = 0;
    this.intensityLevel = 0.5;
  }
}
