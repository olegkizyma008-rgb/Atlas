# Аналіз формування мови на системі Atlas (2025-11-19)

## 🌍 Архітектура мови

### Основний принцип
```
СИСТЕМА (внутрішня): ЗАВЖДИ АНГЛІЙСЬКА (English)
КОРИСТУВАЧ (зовнішня): МОВА З .env (USER_LANGUAGE = 'uk')
```

---

## 📋 1. КОНФІГУРАЦІЯ МОВИ

### 1.1 Джерело конфігурації

**Файл:** `/config/localization-config.js`

```javascript
// Основна конфігурація мови
const LocalizationConfig = {
  // Мова користувача (з .env)
  USER_LANGUAGE: process.env.USER_LANGUAGE || 'uk',
  
  // Мова системи (завжди англійська)
  SYSTEM_LANGUAGE: 'en',
  
  // Показувати системні повідомлення
  SHOW_SYSTEM_MESSAGES: process.env.SHOW_SYSTEM_MESSAGES === 'true' || false,
  
  // Рівень деталізації системних повідомлень
  SYSTEM_MESSAGE_LEVEL: parseInt(process.env.SYSTEM_MESSAGE_LEVEL) || 1
};
```

### 1.2 Значення з .env

**Файл:** `/.env` (рядки 230-233)

```bash
# === LOCALIZATION ===
USER_LANGUAGE=uk                    # Мова користувача (uk = українська)
SHOW_SYSTEM_MESSAGES=false          # Показувати системні повідомлення
SYSTEM_MESSAGE_LEVEL=1              # Рівень: 0=None, 1=Errors, 2=Warnings, 3=Info
```

**Поточні налаштування:**
- ✅ `USER_LANGUAGE=uk` - Українська мова для користувача
- ✅ `SHOW_SYSTEM_MESSAGES=false` - Системні повідомлення ВИМКНЕНІ
- ✅ `SYSTEM_MESSAGE_LEVEL=1` - Показувати тільки помилки

---

## 🔄 2. ПОТІК ФОРМУВАННЯ МОВИ

### 2.1 Ініціалізація системи

```
1. Запуск сервера
   ↓
2. DI Container завантажує конфіг
   ↓
3. LocalizationService ініціалізується
   ↓
4. Логується: "[LOCALIZATION] User language: uk"
```

**Файл:** `/orchestrator/core/service-registry.js` (рядки 84-97)

```javascript
container.singleton('localizationService', (c) => new LocalizationService({
    logger: c.resolve('logger')
}), {
    dependencies: ['logger'],
    metadata: { category: 'core', priority: 75 },
    lifecycle: {
        onInit: async function () {
            await this.initialize();
            logger.system('startup', `[DI] User language: ${this.getUserLanguage()}`);
        }
    }
});
```

### 2.2 Передача мови в компоненти

```
┌─────────────────────────────────────────────────────────┐
│           LocalizationService (uk)                       │
└────────┬────────────────────────────────────────────────┘
         │
    ┌────┴────┬──────────────┬──────────────┐
    ↓         ↓              ↓              ↓
  Chat      Agents        TTS           Prompts
  (uk)      (uk)          (uk)          ({{USER_LANGUAGE}})
```

---

## 💬 3. ЧАТ (Web Interface)

### 3.1 Маршрут чату

**Файл:** `/orchestrator/api/routes/chat.routes.js` (рядки 155-168)

```javascript
// Резолюємо залежності з DI контейнера
const localizationService = container.resolve('localizationService');

// Передаємо в workflow
await executeWorkflow(message, {
    logger: loggerInstance,
    wsManager,
    ttsSyncManager,
    diContainer: container,
    localizationService,  // ← Мова передається сюди
    res
});
```

### 3.2 Обробка повідомлень у чаті

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядки 1019-1021)

```javascript
// Замінюємо {{USER_LANGUAGE}} у системному промпті
const enhancedSystemPrompt = chatPrompt.SYSTEM_PROMPT
    .replace('{{USER_LANGUAGE}}', GlobalConfig.USER_LANGUAGE || 'uk')
    .replace('{{DYNAMIC_CONSCIOUSNESS_PROMPT}}', dynamicPrompt || '');
```

### 3.3 Промпт Атласа

**Файл:** `/prompts/mcp/atlas_chat.js` (рядки 12, 52-55, 63, 100)

```javascript
export const SYSTEM_PROMPT = `You are Atlas...
Process every instruction in English but respond to the user exclusively in {{USER_LANGUAGE}}.

👤 ABOUT OLEG MYKOLAYOVYCH:
• Refer to him respectfully (use appropriate form in {{USER_LANGUAGE}}).
• You may address him respectfully using appropriate forms in {{USER_LANGUAGE}}.

🗣️ COMMUNICATION STYLE:
• Respond concisely yet warmly, always in {{USER_LANGUAGE}}.

Provide a natural, conversational response in {{USER_LANGUAGE}} as Atlas.`;
```

**Результат:** Atlas відповідає українською мовою (uk)

---

## 🤖 4. АГЕНТИ (Tetyana, Grisha, Atlas)

### 4.1 Tetyana (Виконавець)

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядки 1777-1796)

```javascript
// FIXED 2025-11-17: Normalize action to English for execution, 
// translate to user language for TTS

// Дія виконується англійською
const actionForExecution = item.action;  // English

// Але Tetyana говорить українською
const localizationService = container.resolve('localizationService');
const actionForTts = localizationService.translateToUser(item.action);

logger.system('executor', `[TTS] 🔊 Tetyana START: "${actionForTts}"`);
await ttsSyncManager.speak(actionForTts, {
    mode: 'normal',
    agent: 'tetyana',
    sessionId: session.id
});
```

**Логіка:**
- ✅ **Виконання:** Англійська (система)
- ✅ **TTS (голос):** Українська (користувач)

### 4.2 Grisha (Верифікатор)

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядки 1913-1943)

```javascript
// Grisha говорить українськими фразами
const successPhrases = [
    'Виконано',
    'Підтверджено',
    'Успішно'
];

await ttsSyncManager.speak(selectedPhrase, {
    mode: 'normal',
    agent: 'grisha',
    sessionId: session.id
});
```

**Логіка:**
- ✅ **Верифікація:** Англійська (система)
- ✅ **TTS (голос):** Українська (користувач)

### 4.3 Atlas (Чат)

**Файл:** `/prompts/mcp/atlas_chat.js`

```javascript
// Промпт: "Process every instruction in English 
// but respond to the user exclusively in {{USER_LANGUAGE}}"

// Результат: Atlas розуміє англійські інструкції,
// але відповідає українською
```

**Логіка:**
- ✅ **Розуміння:** Англійська (система)
- ✅ **Відповідь:** Українська (користувач)

---

## 🔊 5. TTS (Text-to-Speech)

### 5.1 TTSSyncManager

**Файл:** `/orchestrator/workflow/tts-sync-manager.js` (рядки 100-150)

```javascript
async speak(phrase, options = {}) {
    const {
        mode = 'normal',
        agent = 'tetyana',  // tetyana, grisha, atlas
        sessionId = null
    } = options;

    // Фраза передається як є (вже в мові користувача)
    this.wsManager.broadcastToSubscribers('chat', 'agent_message', {
        content: phrase,           // Українська фраза
        agent: agent,              // Агент (tetyana, grisha, atlas)
        ttsContent: phrase,        // Для TTS
        mode: validMode,
        messageId: `tts_${Date.now()}`,
        sessionId: sessionId
    });
}
```

### 5.2 Трансляція TTS

**Файл:** `/orchestrator/workflow/mcp-todo-manager.js` (рядки 478-484)

```javascript
// Переводимо повідомлення для користувача
const translatedMessage = skipLocalization
    ? message
    : this.localizationService.translateToUser(message);

const translatedTts = ttsContent
    ? this.localizationService.translateToUser(ttsContent)
    : null;
```

**Потік:**
```
1. Система генерує повідомлення (англійська)
   ↓
2. LocalizationService перекладає в українську
   ↓
3. TTSSyncManager відправляє в WebSocket
   ↓
4. Frontend отримує українське повідомлення
   ↓
5. TTS сервіс озвучує українською
```

---

## 📝 6. ПРОМПТИ (Prompt Templates)

### 6.1 Заміна {{USER_LANGUAGE}}

**Файл:** `/orchestrator/services/localization-service.js` (рядки 317-325)

```javascript
replaceLanguagePlaceholder(promptText) {
    if (!promptText) return promptText;

    // FIXED: Always use English for system prompts
    // User language setting only affects UI, not internal processing
    const languageName = 'English';

    return promptText.replace(/\{\{USER_LANGUAGE\}\}/g, languageName);
}
```

**⚠️ ВАЖЛИВО:** Промпти ЗАВЖДИ отримують `English` для внутрішньої обробки!

### 6.2 Приклади промптів з {{USER_LANGUAGE}}

**Файл:** `/prompts/mcp/tetyana_plan_tools_filesystem.js` (рядки 21-24)

```javascript
// LANGUAGE: System prompt is ENGLISH ONLY. 
// Use {{USER_LANGUAGE}} ONLY in "reasoning" and "tts_phrase" JSON fields
// FIXED 2025-11-18: "reasoning" field MUST be in {{USER_LANGUAGE}} (Ukrainian)
// FIXED 2025-11-18: "tts_phrase" field MUST be in {{USER_LANGUAGE}} (Ukrainian)
```

**Структура JSON:**
```json
{
  "tool_calls": [...],           // Англійські назви інструментів
  "reasoning": "Українська",     // {{USER_LANGUAGE}} = uk
  "tts_phrase": "Українська",    // {{USER_LANGUAGE}} = uk
  "needs_split": false
}
```

---

## 🔀 7. ПЕРЕКЛАД (Translation)

### 7.1 LocalizationService

**Файл:** `/orchestrator/services/localization-service.js` (рядки 147-256)

```javascript
translateToUser(text) {
    const userLang = this.config.getUserLanguage();  // 'uk'
    
    if (userLang === 'en') {
        return text;  // Без перекладу для англійської
    }

    // Кеш перекладів
    const cacheKey = `to_${userLang}:${text}`;
    if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
    }

    // Словник англійської → української
    const enToUk = {
        'Open calculator': 'Відкрити калькулятор',
        'Multiply': 'Помножити',
        'Add': 'Додати',
        'Subtract': 'Відняти',
        'Round': 'Округлити',
        // ... більше перекладів
    };

    // Переклад
    let translated = text;
    if (enToUk[text]) {
        translated = enToUk[text];
    } else {
        // Переклад частин тексту
        const sortedEntries = Object.entries(enToUk)
            .sort((a, b) => b[0].length - a[0].length);
        
        for (const [en, uk] of sortedEntries) {
            const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            if (regex.test(translated)) {
                translated = translated.replace(regex, uk);
                break;
            }
        }
    }

    this.translationCache.set(cacheKey, translated);
    return translated;
}
```

### 7.2 Словник перекладів

**Файл:** `/orchestrator/services/localization-service.js` (рядки 170-230)

```javascript
const enToUk = {
    // Повні фрази (перевіряються першими)
    'Enter multiplication operation': 'Ввести операцію множення',
    'Add 27 to current result in Calculator': 'Додати 27 до поточного результату в калькуляторі',
    'Round final result to two decimal places': 'Округлити фінальний результат до двох знаків після коми',
    
    // Окремі слова (fallback)
    'Open calculator': 'Відкрити калькулятор',
    'Multiply': 'Помножити',
    'Add': 'Додати',
    'result': 'результат',
    'file': 'файл',
    'folder': 'папка',
    // ... більше
};
```

---

## 🎯 8. ПОВНИЙ ПОТІК ПРИКЛАДУ

### Приклад: Tetyana виконує дію

```
1. СИСТЕМА (Англійська)
   ├─ TODO item: "Add 27 in Calculator"
   ├─ Success criteria: "Calculator display shows 915"
   └─ Execution: Англійська

2. TETYANA (Виконавець)
   ├─ Отримує: "Add 27 in Calculator"
   ├─ Виконує: Англійська дія
   └─ Говорить: LocalizationService.translateToUser()
      └─ "Додати 27 до поточного результату в калькуляторі"

3. TTS (Голос)
   ├─ Отримує: "Додати 27 до поточного результату в калькуляторі"
   ├─ Агент: tetyana
   └─ Озвучує: Українською мовою

4. GRISHA (Верифікатор)
   ├─ Верифікує: Англійська логіка
   └─ Говорить: "Підтверджено" (українська)

5. ATLAS (Чат)
   ├─ Розуміє: Англійські інструкції
   └─ Відповідає: Українською мовою
```

---

## 📊 9. МАТРИЦЯ МОВИ ПО КОМПОНЕНТАХ

| Компонент   | Внутрішня логіка | Користувач бачить      | TTS озвучує |
| ----------- | ---------------- | ---------------------- | ----------- |
| **Tetyana** | 🇬🇧 English        | 🇬🇧 English              | 🇺🇦 Ukrainian |
| **Grisha**  | 🇬🇧 English        | 🇬🇧 English              | 🇺🇦 Ukrainian |
| **Atlas**   | 🇬🇧 English        | 🇺🇦 Ukrainian            | 🇺🇦 Ukrainian |
| **Chat**    | 🇬🇧 English        | 🇺🇦 Ukrainian            | 🇺🇦 Ukrainian |
| **System**  | 🇬🇧 English        | 🇬🇧 English (if enabled) | N/A         |
| **Prompts** | 🇬🇧 English        | 🇬🇧 English              | N/A         |

---

## ⚙️ 10. КОНФІГУРАЦІЯ МОВИ

### Як змінити мову користувача?

**Крок 1:** Відредагуйте `.env`

```bash
# Було
USER_LANGUAGE=uk

# Стало (для англійської)
USER_LANGUAGE=en

# Або (для іспанської)
USER_LANGUAGE=es
```

**Крок 2:** Перезапустіть сервер

```bash
npm restart
```

**Крок 3:** Перевірте логи

```
[LOCALIZATION] User language: es
```

### Підтримувані мови

**Файл:** `/config/localization-config.js` (рядки 53-61)

```javascript
SUPPORTED_LANGUAGES: {
    'uk': 'Українська',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'pl': 'Polski',
    'ru': 'Русский'
}
```

---

## 🔍 11. ДІАГНОСТИКА

### Як перевірити мову?

**1. Перевірити конфіг:**
```bash
grep USER_LANGUAGE .env
# Результат: USER_LANGUAGE=uk
```

**2. Перевірити логи:**
```bash
grep "User language" logs/orchestrator.log
# Результат: [LOCALIZATION] User language: uk
```

**3. Перевірити переклади:**
```bash
# Відкрити DevTools → Console
// Перевірити TTS фрази в WebSocket повідомленнях
```

---

## 📌 12. ВИСНОВКИ

### ✅ Як формується мова на системі

1. **Конфіг:** `USER_LANGUAGE=uk` з `.env`
2. **Ініціалізація:** `LocalizationService` завантажує конфіг
3. **Передача:** Мова передається всім компонентам через DI контейнер
4. **Промпти:** `{{USER_LANGUAGE}}` замінюється на `English` для системи
5. **Переклад:** `LocalizationService.translateToUser()` перекладає для користувача
6. **TTS:** Агенти говорять українською через `TTSSyncManager`
7. **Чат:** Atlas розуміє англійські інструкції, відповідає українською

### ✅ Етапи на системі (англійська)

- ✅ **Stage 1.0:** Router Classifier (англійська)
- ✅ **Stage 2.0:** Server Selection (англійська)
- ✅ **Stage 2.1:** Plan Tools (англійська)
- ✅ **Stage 2.2:** Execute Tools (англійська)
- ✅ **Stage 2.3:** Verify Item (англійська)
- ✅ **Stage 3.0:** Final Summary (англійська)

### ✅ Агенти говорять українською

- ✅ **Tetyana:** "Додати 27 до поточного результату в калькуляторі"
- ✅ **Grisha:** "Підтверджено"
- ✅ **Atlas:** "Привіт! Як я можу тобі допомогти?"

---

## 📚 Посилання на файли

- `/config/localization-config.js` - Конфіг мови
- `/orchestrator/services/localization-service.js` - Сервіс локалізації
- `/orchestrator/workflow/tts-sync-manager.js` - Менеджер TTS
- `/orchestrator/workflow/executor-v3.js` - Виконавець workflow
- `/prompts/mcp/atlas_chat.js` - Промпт Atlas
- `/.env` - Конфіг середовища
