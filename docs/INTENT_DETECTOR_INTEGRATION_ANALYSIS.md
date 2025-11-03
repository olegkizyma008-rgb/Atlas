# 📊 АНАЛІЗ ІНТЕГРАЦІЇ INTENT DETECTOR

**Дата:** 2025-11-03 03:01  
**Питання:** Як правильно інтегрувати IntentDetector - через Stage 0 чи LLM config?

---

## 🔍 **АНАЛІЗ ПОТОЧНОЇ АРХІТЕКТУРИ:**

### **1. Чи DEV mode проходить через Stage 0?**

**ТАК! ✅**

**Файл:** `executor-v3.js:98-297`

```javascript
// Stage 0-MCP: Mode Selection
const modeProcessor = container.resolve('modeSelectionProcessor');
const result = await modeProcessor.execute({ userMessage, session });
const { mode, confidence } = result;

// Handle DEV mode
if (mode === 'dev') {
    const devProcessor = container.resolve('devSelfAnalysisProcessor');
    const analysisResult = await devProcessor.execute({ userMessage, session });
}
```

**Висновок:** DEV mode ЗАВЖДИ визначається через Stage 0

---

### **2. Де використовується IntentDetector?**

**Всередині DEV processor** (після Stage 0)

**Файл:** `dev-self-analysis-processor.js:390-403`

```javascript
// NEW 2025-11-03: Інтелектуальна детекція intent
const intentResult = await this.intentDetector.detectInterventionIntent(userMessage, {
    criticalIssues: analysisResult.findings?.critical_issues?.length || 0,
    performanceIssues: analysisResult.findings?.performance_bottlenecks?.length || 0,
    suggestions: analysisResult.findings?.improvement_suggestions?.length || 0
});

const userWantsIntervention = intentResult.detected;
```

**Висновок:** IntentDetector НЕ в Stage 0, а в DEV processor

---

### **3. Чи використовує IntentDetector LLM?**

**ТАК! ✅**

**Файл:** `intent-detector.js:139-165`

```javascript
async _detectLLMIntent(userMessage, analysisContext) {
    const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: JSON.stringify({
            model: 'mistral-small-latest',  // LLM model
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 150
        })
    });
}
```

**Висновок:** IntentDetector викликає LLM API

---

## 🎯 **РЕКОМЕНДАЦІЯ: ГІБРИДНИЙ ПІДХІД**

### **Архітектура:**

```
USER MESSAGE
    ↓
┌─────────────────────────────────────┐
│ Stage 0: Mode Selection (LLM)      │
│ - Визначає: chat / task / dev      │
│ - Використовує КЛЮЧОВІ СЛОВА        │
│ - Швидко і чітко                    │
└─────────────────────────────────────┘
    ↓ mode = "dev"
┌─────────────────────────────────────┐
│ DEV Processor                       │
│ 1. Виконує аналіз системи           │
│ 2. Збирає дані про проблеми         │
└─────────────────────────────────────┘
    ↓ є проблеми?
┌─────────────────────────────────────┐
│ IntentDetector (LLM Level 2)       │
│ - Семантичне розуміння              │
│ - "Зроби себе кращим" → виправити   │
│ - Тільки для складних випадків      │
└─────────────────────────────────────┘
```

---

## ✅ **ОПТИМАЛЬНЕ РІШЕННЯ:**

### **1. Stage 0 залишається без змін:**

**Причини:**
- ✅ Вже має DEV mode patterns в промпті
- ✅ Швидко визначає "виправ себе", "проаналізуй себе"
- ✅ Не треба додавати складність

**Stage 0 prompt (вже є):**
```javascript
3. Mode "dev" (DEV mode - self-analysis)
   ✅ "проаналізуй СЕБЕ"
   ✅ "виправ себе"
   ✅ "analyze YOURSELF"
```

---

### **2. IntentDetector отримує конфігурацію:**

**Додати в:** `/config/models-config.js`

```javascript
export const MCP_MODEL_CONFIG = {
  stages: {
    // ... існуючі stages
    
    intent_detection: {
      model: 'mistral-small-latest',
      temperature: 0.1,
      max_tokens: 150,
      description: 'Intent Detection - семантичне розуміння складних запитів на виправлення'
    }
  }
}
```

**Додати в:** `.env` (опціонально)

```bash
# Intent Detection (optional override)
INTENT_DETECTION_MODEL=mistral-small-latest
INTENT_DETECTION_TEMPERATURE=0.1
```

---

### **3. IntentDetector використовує конфігурацію:**

**Файл:** `intent-detector.js`

```javascript
_ensureConfig() {
    if (!this.modelConfig) {
        const apiConfig = GlobalConfig.MCP_MODEL_CONFIG?.apiEndpoint;
        this.apiEndpoint = apiConfig.primary || 'http://localhost:4000/v1/chat/completions';
        
        // Використовуємо конфігурацію зі Stage
        this.modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('intent_detection');
        
        // Fallback якщо немає конфігурації
        if (!this.modelConfig) {
            this.modelConfig = {
                model: 'mistral-small-latest',
                temperature: 0.1,
                max_tokens: 150
            };
        }
    }
}
```

---

## 📊 **ПОРІВНЯННЯ ВАРІАНТІВ:**

### **Варіант A: IntentDetector в Stage 0 ❌**

**Переваги:**
- Одне місце для mode detection

**Недоліки:**
- ❌ Збільшує час Stage 0 (2x LLM calls)
- ❌ Ускладнює Stage 0 prompt
- ❌ IntentDetector потребує context (проблеми знайдені в аналізі)
- ❌ Stage 0 не має цього контексту

---

### **Варіант B: Stage 0 property (keyword only) ❌**

**Переваги:**
- Швидко

**Недоліки:**
- ❌ Не розуміє "Зроби себе кращим"
- ❌ Не розуміє "Усунь баги"
- ❌ Втрачаємо інтелект

---

### **Варіант C: Гібридний (РЕКОМЕНДОВАНИЙ) ✅**

**Stage 0:**
- Визначає DEV mode по ключових словах
- Швидко і надійно

**IntentDetector в DEV processor:**
- Level 1: Keyword (0.1ms)
- Level 2: LLM (300ms) - тільки якщо є проблеми
- Має контекст проблем для розумного рішення

**Переваги:**
- ✅ Швидкий Stage 0
- ✅ Інтелектуальне розуміння складних запитів
- ✅ Економія токенів (LLM тільки коли треба)
- ✅ Має контекст для правильного рішення

---

## 🔧 **ЩО ТРЕБА ЗРОБИТИ:**

### **1. Додати конфігурацію IntentDetector** ✅

**Файл:** `/config/models-config.js:367`

```javascript
intent_detection: {
  model: 'mistral-small-latest',
  temperature: 0.1,
  max_tokens: 150,
  description: 'Intent Detection - semantic understanding of intervention requests'
}
```

### **2. Оновити IntentDetector** ✅

**Використовувати:** `GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('intent_detection')`

### **3. Додати в .env (опціонально)** 📝

```bash
# Можна override model для intent detection
INTENT_DETECTION_MODEL=mistral-small-latest
```

---

## 🎯 **ВИСНОВОК:**

**Гібридний підхід - оптимальний:**

1. ✅ **Stage 0** - швидке визначення DEV mode (keywords)
2. ✅ **IntentDetector** - семантичне розуміння в DEV processor (LLM Level 2)
3. ✅ **Конфігурація** - додати в `models-config.js`
4. ✅ **Не треба змінювати Stage 0**

**Результат:**
- Швидкість ✅
- Інтелект ✅
- Економія токенів ✅
- Правильний контекст ✅
