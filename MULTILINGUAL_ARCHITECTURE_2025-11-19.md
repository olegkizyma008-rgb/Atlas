# Архітектура: Багатомовна система TODO (2025-11-19)

## 🏗️ Архітектурна діаграма

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ATLAS MULTILINGUAL TODO SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 1. КОНФІГ (/.env)                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ USER_LANGUAGE=uk (або es, fr, de, pl, ru)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. LLM ГЕНЕРУЄ ПЛАН (atlas-todo-planning-processor.js)                 │
├─────────────────────────────────────────────────────────────────────────┤
│ Промпт: "Generate TODO in ALL languages"                              │
│ ├─ action_en: "Add 27 in Calculator"                                  │
│ ├─ action_uk: "Додати 27 в калькуляторі"                             │
│ ├─ action_es: "Agregar 27 en Calculadora"                            │
│ ├─ action_fr: "Ajouter 27 à la Calculatrice"                         │
│ └─ ... інші мови                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. MCPTodoManager ЗБЕРІГАЄ ПЛАН (mcp-todo-manager.js)                 │
├─────────────────────────────────────────────────────────────────────────┤
│ TODO item: {                                                            │
│   id: "1",                                                              │
│   action: "Add 27 in Calculator",        // Для системи               │
│   action_uk: "Додати 27 в калькуляторі",                             │
│   action_es: "Agregar 27 en Calculadora",                            │
│   action_fr: "Ajouter 27 à la Calculatrice",                         │
│   // ... інші мови                                                     │
│   success_criteria: "Calculator display shows 915",                    │
│   success_criteria_uk: "Дисплей показує 915",                        │
│   // ... інші мови                                                     │
│ }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌───────────────────────────┼───────────────────────────┐
        ↓                           ↓                           ↓
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  EXECUTOR        │      │  GRISHA          │      │  LOCALIZATION    │
│  (executor-v3)   │      │  (verify)        │      │  (fallback)      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                           │                           │
        │ userLanguage = 'uk'       │ successCriteria (en)      │ Fallback:
        │ actionFieldName =         │ Верифікація              │ Якщо немає
        │ 'action_uk'               │ англійською               │ мови -
        │ actionForTts =            │                           │ перекладати
        │ item.action_uk            │                           │ словником
        │                           │                           │
        ↓                           ↓                           ↓
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ TTS (готова      │      │ Логіка вірна     │      │ LocalizationSvc  │
│ українська)      │      │ (англійська)     │      │ (fallback)       │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                           │                           │
        ↓                           ↓                           ↓
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ [TETYANA]        │      │ [GRISHA]         │      │ translateToUser()│
│ Додати 27 в      │      │ Підтверджено     │      │ (якщо потрібно)  │
│ калькуляторі ✅  │      │ ✅               │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 📊 Потік для різних мов

### Сценарій 1: USER_LANGUAGE=uk

```
┌─────────────────────────────────────────────────────────────────┐
│ .env: USER_LANGUAGE=uk                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Executor:                                                       │
│ userLanguage = 'uk'                                            │
│ actionFieldName = 'action_uk'                                  │
│ actionForTts = item.action_uk                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ TTSSyncManager:                                                 │
│ [TETYANA]Додати 27 в калькуляторі ✅                          │
└─────────────────────────────────────────────────────────────────┘
```

### Сценарій 2: USER_LANGUAGE=es

```
┌─────────────────────────────────────────────────────────────────┐
│ .env: USER_LANGUAGE=es                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Executor:                                                       │
│ userLanguage = 'es'                                            │
│ actionFieldName = 'action_es'                                  │
│ actionForTts = item.action_es                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ TTSSyncManager:                                                 │
│ [TETYANA]Agregar 27 en Calculadora ✅                         │
└─────────────────────────────────────────────────────────────────┘
```

### Сценарій 3: USER_LANGUAGE=fr

```
┌─────────────────────────────────────────────────────────────────┐
│ .env: USER_LANGUAGE=fr                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Executor:                                                       │
│ userLanguage = 'fr'                                            │
│ actionFieldName = 'action_fr'                                  │
│ actionForTts = item.action_fr                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ TTSSyncManager:                                                 │
│ [TETYANA]Ajouter 27 à la Calculatrice ✅                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Детальний потік обробки

```
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: TODO PLANNING (atlas-todo-planning-processor.js)          │
├─────────────────────────────────────────────────────────────────────┤
│ Input: User request "Open calculator and add 27"                   │
│ ↓                                                                    │
│ LLM Prompt:                                                         │
│   "Generate TODO in ALL languages:                                 │
│    - action_en, action_uk, action_es, action_fr, ..."             │
│ ↓                                                                    │
│ LLM Response:                                                       │
│   [{                                                                │
│     "id": "1",                                                      │
│     "action_en": "Open Calculator application",                    │
│     "action_uk": "Відкрити калькулятор програму",                │
│     "action_es": "Abrir aplicación Calculadora",                  │
│     "action_fr": "Ouvrir l'application Calculatrice",             │
│     ...                                                             │
│   }]                                                                │
│ ↓                                                                    │
│ Output: TODO list (багатомовний)                                   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: EXECUTION (executor-v3.js)                                │
├─────────────────────────────────────────────────────────────────────┤
│ For each item:                                                      │
│   1. Get user language from config                                 │
│      userLanguage = localizationService.getUserLanguage()          │
│   2. Build field name                                              │
│      actionFieldName = `action_${userLanguage}`                    │
│   3. Get action for TTS                                            │
│      actionForTts = item[actionFieldName] || item.action           │
│   4. Speak                                                          │
│      ttsSyncManager.speak(actionForTts, {agent: 'tetyana'})       │
│   5. Execute tools                                                 │
│      (using item.action - англійська)                             │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: VERIFICATION (grisha-verify-item-processor.js)            │
├─────────────────────────────────────────────────────────────────────┤
│ For each item:                                                      │
│   1. Get success criteria (англійська)                             │
│      successCriteria = item.success_criteria                       │
│   2. Analyze screenshot                                            │
│      visionAnalysis = analyzeScreenshot(                           │
│        screenshot, successCriteria, context)                       │
│   3. Verify                                                         │
│      if (visionAnalysis.verified) → ✅                            │
│   4. Speak result                                                   │
│      ttsSyncManager.speak(result, {agent: 'grisha'})              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Компоненти системи

### 1. LocalizationService
```javascript
// /orchestrator/services/localization-service.js
- getUserLanguage() → 'uk' (з конфіга)
- translateTodoItem(item) → {system, user}
- translateToUser(text) → перекладає (fallback)
```

### 2. MCPTodoManager
```javascript
// /orchestrator/workflow/mcp-todo-manager.js
- createTodo(request) → TODO (багатомовний)
- Зберігає всі мовні версії
- Передає в executor
```

### 3. Executor
```javascript
// /orchestrator/workflow/executor-v3.js
- Вибирає мову користувача
- Використовує item.action_[lang] для TTS
- Використовує item.action (en) для виконання
```

### 4. GrishaVerifyItemProcessor
```javascript
// /orchestrator/workflow/stages/grisha-verify-item-processor.js
- Використовує item.success_criteria (англійська)
- Верифікує логіку
- Говорить результат на мові користувача
```

### 5. TTSSyncManager
```javascript
// /orchestrator/workflow/tts-sync-manager.js
- Отримує готову фразу на мові користувача
- Озвучує без перекладу
- Передає в WebSocket
```

---

## 🎯 Переваги архітектури

| Компонент               | Переваги                               |
| ----------------------- | -------------------------------------- |
| **LLM**                 | Генерує природні фрази для кожної мови |
| **MCPTodoManager**      | Зберігає всі версії в одному об'єкті   |
| **Executor**            | Динамічно вибирає мову користувача     |
| **Grisha**              | Верифікує логіку англійською           |
| **TTS**                 | Озвучує готову фразу без перекладу     |
| **LocalizationService** | Забезпечує fallback на словник         |

---

## 🌍 Підтримувані мови

```
uk - Українська
en - English
es - Español
fr - Français
de - Deutsch
pl - Polski
ru - Русский
```

Просто змініть `USER_LANGUAGE` в `.env` - система переключиться автоматично!

---

## 📊 Порівняння: Архітектури

### ПОТОЧНА (з перекладом):
```
TODO (en) → translateToUser() → словник → TTS (змішана) ❌
```

### ОПТИМІЗОВАНА (багатомовна):
```
TODO (багатомовна) → item.action_[lang] → TTS (чиста) ✅
```

---

## ✅ Висновок

**Багатомовна архітектура забезпечує:**
- ✅ Одну систему для всіх мов
- ✅ Генерацію один раз (LLM)
- ✅ Динамічний вибір мови (з конфіга)
- ✅ Чисту мову в TTS (без перекладу)
- ✅ Легку масштабованість (додати мову = додати поле)
- ✅ Fallback на словник (якщо потрібно)

**Результат:** Одна система, багато мов! 🌍
