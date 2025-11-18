# Оптимізація: Багатомовні TODO items (2025-11-19)

## 🌍 Ідея оптимізації (універсальна)

**Поточна архітектура:**
```
TODO item: "Add 27 in Calculator" (англійська)
   ↓
Tetyana говорить: translateToUser() → словник → змішана мова ❌
```

**Пропонована архітектура (універсальна):**
```
Конфіг: USER_LANGUAGE = 'uk' (або 'en', 'es', 'fr', тощо)
   ↓
TODO item: {
  action_en: "Add 27 in Calculator",
  action_[USER_LANGUAGE]: "Додати 27 в калькуляторі"  // Динамічна мова
}
   ↓
Tetyana говорить: item.action_[USER_LANGUAGE] (без перекладу) ✅
```

---

## 📊 Конфіг мови

**Файл:** `/.env`

```bash
USER_LANGUAGE=uk    # uk, en, es, fr, de, pl, ru
```

**Файл:** `/config/localization-config.js`

```javascript
const LocalizationConfig = {
  USER_LANGUAGE: process.env.USER_LANGUAGE || 'uk',
  
  SUPPORTED_LANGUAGES: {
    'uk': 'Українська',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'pl': 'Polski',
    'ru': 'Русский'
  }
};
```

---

## ✨ Пропонована структура TODO item

```javascript
{
  id: "1",
  // АНГЛІЙСЬКА (для системи)
  action: "Add 27 in Calculator",
  success_criteria: "Calculator display shows 915",
  
  // ДИНАМІЧНА МОВА (залежить від USER_LANGUAGE)
  action_uk: "Додати 27 в калькуляторі",      // Якщо USER_LANGUAGE=uk
  action_es: "Agregar 27 en Calculadora",     // Якщо USER_LANGUAGE=es
  action_fr: "Ajouter 27 à la Calculatrice",  // Якщо USER_LANGUAGE=fr
  
  success_criteria_uk: "Дисплей калькулятора показує 915",
  success_criteria_es: "La pantalla de la calculadora muestra 915",
  success_criteria_fr: "L'écran de la calculatrice affiche 915",
  
  // Інші поля
  status: "pending",
  dependencies: [],
  max_attempts: 3
}
```

---

## 🔄 Як це працюватиме

### 1. LLM генерує багатомовний план

**Промпт для LLM:**

```javascript
const SYSTEM_PROMPT = `
You are Atlas TODO Planner. Create structured TODO lists.

CRITICAL: For each TODO item, generate versions in MULTIPLE languages:
1. action_en (English) - for system processing
2. action_uk (Ukrainian)
3. action_es (Spanish)
4. action_fr (French)
5. action_de (German)
6. action_pl (Polish)
7. action_ru (Russian)

Format each item as JSON:
{
  "id": "1",
  "action_en": "Add 27 in Calculator",
  "action_uk": "Додати 27 в калькуляторі",
  "action_es": "Agregar 27 en Calculadora",
  "action_fr": "Ajouter 27 à la Calculatrice",
  "action_de": "27 im Taschenrechner hinzufügen",
  "action_pl": "Dodaj 27 w Kalkulatorze",
  "action_ru": "Добавить 27 в Калькулятор",
  "success_criteria_en": "Calculator display shows 915",
  "success_criteria_uk": "Дисплей калькулятора показує 915",
  "success_criteria_es": "La pantalla de la calculadora muestra 915",
  "success_criteria_fr": "L'écran de la calculatrice affiche 915",
  "success_criteria_de": "Der Taschenrechner zeigt 915 an",
  "success_criteria_pl": "Kalkulator wyświetla 915",
  "success_criteria_ru": "Калькулятор показывает 915",
  "dependencies": []
}

IMPORTANT:
- action_en: Must be clear, unambiguous English for system processing
- action_[LANG]: Must be natural in that language for user understanding
- All versions must describe the SAME action
- No translation needed later - use these directly
`;
```

### 2. MCPTodoManager зберігає багатомовний план

**Файл:** `/orchestrator/workflow/mcp-todo-manager.js`

```javascript
async createTodo(request, context = {}) {
  // ... існуючий код ...
  
  const todo = {
    id: generateId(),
    user_message: request,
    items: llmResponse.map(item => ({
      id: item.id,
      // Англійська для системи
      action: item.action_en,
      success_criteria: item.success_criteria_en,
      
      // Багатомовні версії
      action_uk: item.action_uk,
      action_es: item.action_es,
      action_fr: item.action_fr,
      action_de: item.action_de,
      action_pl: item.action_pl,
      action_ru: item.action_ru,
      
      success_criteria_uk: item.success_criteria_uk,
      success_criteria_es: item.success_criteria_es,
      success_criteria_fr: item.success_criteria_fr,
      success_criteria_de: item.success_criteria_de,
      success_criteria_pl: item.success_criteria_pl,
      success_criteria_ru: item.success_criteria_ru,
      
      // Інші поля
      status: "pending",
      dependencies: item.dependencies || [],
      max_attempts: 3
    }))
  };
  
  return todo;
}
```

### 3. Executor використовує мову користувача

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядок 1787-1789)

```javascript
// ОПТИМІЗОВАНО: Використовуємо мову користувача
if (ttsSyncManager && item.action) {
  try {
    const userLanguage = localizationService.config.getUserLanguage();
    
    // Динамічно вибираємо поле на основі мови користувача
    const actionFieldName = `action_${userLanguage}`;
    const actionForTts = item[actionFieldName] || item.action;
    
    logger.system('executor', `[TTS] 🔊 Tetyana START: "${actionForTts}" (lang: ${userLanguage})`);
    await ttsSyncManager.speak(actionForTts, {
      mode: 'normal',
      agent: 'tetyana',
      sessionId: session.id
    });
  } catch (error) {
    logger.error(`[TTS] ❌ Failed to send TTS: ${error.message}`);
  }
}
```

### 4. Grisha верифікує з англійською версією

**Файл:** `/orchestrator/workflow/stages/grisha-verify-item-processor.js`

```javascript
// Система ЗАВЖДИ використовує англійську версію
const successCriteria = currentItem.success_criteria;  // Англійська

// Верифікація
const visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
  screenshot.filepath,
  successCriteria,  // Англійська для логіки
  analysisContext
);
```

### 5. LocalizationService підтримує fallback

**Файл:** `/orchestrator/services/localization-service.js`

```javascript
translateTodoItem(item) {
  const userLang = this.config.getUserLanguage();
  
  // Якщо вже є багатомовні версії, використовувати їх
  const actionFieldName = `action_${userLang}`;
  const criteriaFieldName = `success_criteria_${userLang}`;
  
  if (item[actionFieldName]) {
    return {
      system: { 
        ...item, 
        action: item.action,
        success_criteria: item.success_criteria
      },
      user: { 
        ...item, 
        action: item[actionFieldName],
        success_criteria: item[criteriaFieldName]
      }
    };
  }
  
  // Fallback: перекладати як раніше
  return {
    system: { ...item, action: this.ensureEnglish(item.action) },
    user: { 
      ...item, 
      action: this.translateToUser(item.action),
      success_criteria: this.translateToUser(item.success_criteria)
    }
  };
}
```

---

## 📊 Приклади для різних мов

### Приклад 1: USER_LANGUAGE=uk (Українська)

```json
{
  "id": "1",
  "action": "Add 27 in Calculator",
  "action_uk": "Додати 27 в калькуляторі",
  "success_criteria": "Calculator display shows 915",
  "success_criteria_uk": "Дисплей калькулятора показує 915"
}
```

**Результат TTS:**
```
[TETYANA]Додати 27 в калькуляторі ✅
```

---

### Приклад 2: USER_LANGUAGE=es (Іспанська)

```json
{
  "id": "1",
  "action": "Add 27 in Calculator",
  "action_es": "Agregar 27 en Calculadora",
  "success_criteria": "Calculator display shows 915",
  "success_criteria_es": "La pantalla de la calculadora muestra 915"
}
```

**Результат TTS:**
```
[TETYANA]Agregar 27 en Calculadora ✅
```

---

### Приклад 3: USER_LANGUAGE=fr (Французька)

```json
{
  "id": "1",
  "action": "Add 27 in Calculator",
  "action_fr": "Ajouter 27 à la Calculatrice",
  "success_criteria": "Calculator display shows 915",
  "success_criteria_fr": "L'écran de la calculatrice affiche 915"
}
```

**Результат TTS:**
```
[TETYANA]Ajouter 27 à la Calculatrice ✅
```

---

## 🔄 Потік для різних мов

```
┌─────────────────────────────────────────────────────────┐
│ Конфіг: USER_LANGUAGE = 'uk'                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ LLM генерує план (багатомовний)                         │
│ ├─ action_en: "Add 27 in Calculator"                   │
│ ├─ action_uk: "Додати 27 в калькуляторі"              │
│ ├─ action_es: "Agregar 27 en Calculadora"             │
│ └─ ... інші мови                                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ MCPTodoManager зберігає всі версії                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Executor вибирає мову користувача                       │
│ actionFieldName = `action_${userLanguage}`              │
│ actionForTts = item.action_uk                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Tetyana говорить українською                            │
│ [TETYANA]Додати 27 в калькуляторі ✅                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Переваги універсальної оптимізації

| Аспект              | Переваги                                             |
| ------------------- | ---------------------------------------------------- |
| **Мови**            | Підтримує будь-яку мову з конфіга                    |
| **Масштабованість** | Легко додати нову мову (просто додати action_[lang]) |
| **Гнучкість**       | Користувач може змінити мову в .env                  |
| **Якість**          | LLM генерує природні фрази для кожної мови           |
| **Швидкість**       | Немає перекладу в runtime                            |
| **Fallback**        | Якщо мови немає, використовується словник            |

---

## 📋 План впровадження

### Крок 1: Оновити LLM промпти

**Файли:**
- `/prompts/mcp/atlas_todo_planning.js`
- `/prompts/mcp/atlas_replan_todo.js`

**Зміни:**
```javascript
// Додати інструкцію для LLM генерувати всі мови
"For each item, provide versions in ALL supported languages:
  - action_en, action_uk, action_es, action_fr, action_de, action_pl, action_ru
  - success_criteria_en, success_criteria_uk, success_criteria_es, ..."
```

### Крок 2: Оновити MCPTodoManager

**Файл:** `/orchestrator/workflow/mcp-todo-manager.js`

**Зміни:**
```javascript
// Зберігати всі мовні версії
const item = {
  action: parsed.action_en,
  action_uk: parsed.action_uk,
  action_es: parsed.action_es,
  // ... інші мови
  success_criteria: parsed.success_criteria_en,
  success_criteria_uk: parsed.success_criteria_uk,
  // ... інші мови
};
```

### Крок 3: Оновити executor-v3.js

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядок 1787-1789)

**Зміни:**
```javascript
// Динамічно вибирати мову
const userLanguage = localizationService.config.getUserLanguage();
const actionFieldName = `action_${userLanguage}`;
const actionForTts = item[actionFieldName] || item.action;
```

### Крок 4: Оновити LocalizationService

**Файл:** `/orchestrator/services/localization-service.js`

**Зміни:**
```javascript
// Підтримувати fallback на словник
if (item[actionFieldName]) {
  return { system: {...}, user: {...} };
}
// Інакше - перекладати як раніше
```

---

## 📊 Порівняння: Словник vs Багатомовні TODO

| Аспект              | Словник                  | Багатомовні TODO       |
| ------------------- | ------------------------ | ---------------------- |
| **Якість**          | Залежить від словника    | Залежить від LLM       |
| **Мови**            | Тільки ті, що в словнику | Всі, що генерує LLM    |
| **Гнучкість**       | Фіксована                | Динамічна (з конфіга)  |
| **Швидкість**       | Медленно (regex)         | Швидко (прямий доступ) |
| **Масштабованість** | Важко                    | Легко                  |
| **Точність**        | Середня                  | Висока                 |

---

## ✅ Результат

### БУЛО (з перекладом):
```
USER_LANGUAGE=uk
[TETYANA]Відкрити калькулятор application ❌

USER_LANGUAGE=es
[TETYANA]Open browser ❌ (не перекладено)
```

### СТАНЕ (багатомовні TODO):
```
USER_LANGUAGE=uk
[TETYANA]Відкрити калькулятор програму ✅

USER_LANGUAGE=es
[TETYANA]Abrir navegador ✅

USER_LANGUAGE=fr
[TETYANA]Ouvrir le navigateur ✅
```

---

## 🌍 Підтримувані мови

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

Просто змініть `USER_LANGUAGE` в `.env` - система автоматично використовуватиме правильну мову!

---

## 🎯 Висновок

**Багатомовні TODO items - універсальна оптимізація, яка:**
- ✅ Працює з будь-якою мовою користувача
- ✅ Генерується один раз LLM
- ✅ Використовується без перекладу
- ✅ Легко масштабується на нові мови
- ✅ Дозволяє користувачу вибрати мову в конфігу

**Рекомендація:** Впровадити для всіх мов одночасно!
