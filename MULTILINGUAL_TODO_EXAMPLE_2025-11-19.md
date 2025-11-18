# Практичний приклад: Багатомовні TODO items (2025-11-19)

## 🌍 Один план - багато мов

### Один TODO план (багатомовний):

```json
{
  "id": "todo_1",
  "user_message": "Open calculator and add 27",
  "items": [
    {
      "id": "1",
      "action": "Open Calculator application",
      "action_uk": "Відкрити калькулятор програму",
      "action_es": "Abrir aplicación Calculadora",
      "action_fr": "Ouvrir l'application Calculatrice",
      "action_de": "Öffnen Sie die Rechner-Anwendung",
      "action_pl": "Otwórz aplikację Kalkulator",
      "action_ru": "Откройте приложение Калькулятор",
      
      "success_criteria": "Calculator application window is visible on the screen",
      "success_criteria_uk": "Вікно програми Калькулятор видимо на екрані",
      "success_criteria_es": "La ventana de la aplicación Calculadora es visible en la pantalla",
      "success_criteria_fr": "La fenêtre de l'application Calculatrice est visible à l'écran",
      "success_criteria_de": "Das Fenster der Rechner-Anwendung ist auf dem Bildschirm sichtbar",
      "success_criteria_pl": "Okno aplikacji Kalkulator jest widoczne na ekranie",
      "success_criteria_ru": "Окно приложения Калькулятор видно на экране",
      
      "status": "pending",
      "dependencies": []
    },
    {
      "id": "2",
      "action": "Add 27 in Calculator",
      "action_uk": "Додати 27 в калькуляторі",
      "action_es": "Agregar 27 en Calculadora",
      "action_fr": "Ajouter 27 à la Calculatrice",
      "action_de": "27 im Taschenrechner hinzufügen",
      "action_pl": "Dodaj 27 w Kalkulatorze",
      "action_ru": "Добавить 27 в Калькулятор",
      
      "success_criteria": "Calculator display shows 915",
      "success_criteria_uk": "Дисплей калькулятора показує 915",
      "success_criteria_es": "La pantalla de la calculadora muestra 915",
      "success_criteria_fr": "L'écran de la calculatrice affiche 915",
      "success_criteria_de": "Der Taschenrechner zeigt 915 an",
      "success_criteria_pl": "Kalkulator wyświetla 915",
      "success_criteria_ru": "Калькулятор показывает 915",
      
      "status": "pending",
      "dependencies": ["1"]
    }
  ]
}
```

---

## 🎭 Виконання для різних мов

### Сценарій 1: USER_LANGUAGE=uk (Українська)

```
.env: USER_LANGUAGE=uk

Executor:
  userLanguage = 'uk'
  actionFieldName = 'action_uk'
  actionForTts = item.action_uk

Результат:
  [TETYANA]Відкрити калькулятор програму ✅
  [GRISHA]Підтверджено
  [TETYANA]Додати 27 в калькуляторі ✅
  [GRISHA]Підтверджено
```

---

### Сценарій 2: USER_LANGUAGE=es (Іспанська)

```
.env: USER_LANGUAGE=es

Executor:
  userLanguage = 'es'
  actionFieldName = 'action_es'
  actionForTts = item.action_es

Результат:
  [TETYANA]Abrir aplicación Calculadora ✅
  [GRISHA]Confirmado
  [TETYANA]Agregar 27 en Calculadora ✅
  [GRISHA]Confirmado
```

---

### Сценарій 3: USER_LANGUAGE=fr (Французька)

```
.env: USER_LANGUAGE=fr

Executor:
  userLanguage = 'fr'
  actionFieldName = 'action_fr'
  actionForTts = item.action_fr

Результат:
  [TETYANA]Ouvrir l'application Calculatrice ✅
  [GRISHA]Confirmé
  [TETYANA]Ajouter 27 à la Calculatrice ✅
  [GRISHA]Confirmé
```

---

### Сценарій 4: USER_LANGUAGE=de (Німецька)

```
.env: USER_LANGUAGE=de

Executor:
  userLanguage = 'de'
  actionFieldName = 'action_de'
  actionForTts = item.action_de

Результат:
  [TETYANA]Öffnen Sie die Rechner-Anwendung ✅
  [GRISHA]Bestätigt
  [TETYANA]27 im Taschenrechner hinzufügen ✅
  [GRISHA]Bestätigt
```

---

## 🔄 Код: Як це працює

### 1. LLM генерує багатомовний план

```javascript
// atlas-todo-planning-processor.js
const llmPrompt = `
Create a TODO plan for: "Open calculator and add 27"

For EACH item, generate versions in ALL languages:
- action_en, action_uk, action_es, action_fr, action_de, action_pl, action_ru
- success_criteria_en, success_criteria_uk, success_criteria_es, ...

Return JSON array with items.
`;

const llmResponse = await llmClient.call(llmPrompt);
// Результат: [
//   {
//     "id": "1",
//     "action_en": "Open Calculator application",
//     "action_uk": "Відкрити калькулятор програму",
//     "action_es": "Abrir aplicación Calculadora",
//     ...
//   },
//   ...
// ]
```

### 2. MCPTodoManager зберігає всі версії

```javascript
// mcp-todo-manager.js
async createTodo(request, context = {}) {
  const llmResponse = await this.llmClient.call(prompt);
  
  const todo = {
    id: generateId(),
    user_message: request,
    items: llmResponse.map(item => ({
      id: item.id,
      // Англійська для системи
      action: item.action_en,
      success_criteria: item.success_criteria_en,
      
      // Всі мови
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
      
      status: "pending",
      dependencies: item.dependencies || [],
      max_attempts: 3
    }))
  };
  
  return todo;
}
```

### 3. Executor вибирає мову користувача

```javascript
// executor-v3.js (рядок 1787-1789)
if (ttsSyncManager && item.action) {
  try {
    // ОПТИМІЗОВАНО: Вибираємо мову користувача
    const userLanguage = localizationService.config.getUserLanguage();
    const actionFieldName = `action_${userLanguage}`;
    
    // Використовуємо готову версію на мові користувача
    const actionForTts = item[actionFieldName] || item.action;
    
    logger.system('executor', 
      `[TTS] 🔊 Tetyana START: "${actionForTts}" (lang: ${userLanguage})`
    );
    
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

### 4. Grisha верифікує з англійською

```javascript
// grisha-verify-item-processor.js
async verifyItem(item, screenshot) {
  // ЗАВЖДИ використовуємо англійську для логіки
  const successCriteria = item.success_criteria;  // Англійська
  
  // Верифікація
  const visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
    screenshot.filepath,
    successCriteria,  // Англійська для LLM аналізу
    analysisContext
  );
  
  // Результат верифікації
  if (visionAnalysis.verified) {
    this.logger.system('grisha-verify-item', 
      `[GRISHA] ✅ Verified: ${item.action}`
    );
  }
}
```

### 5. LocalizationService з fallback

```javascript
// localization-service.js
translateTodoItem(item) {
  const userLang = this.config.getUserLanguage();
  const actionFieldName = `action_${userLang}`;
  const criteriaFieldName = `success_criteria_${userLang}`;
  
  // Якщо вже є багатомовні версії
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

## 📊 Порівняння: Різні мови

### Українська (uk):
```
[TETYANA]Відкрити калькулятор програму
[TETYANA]Додати 27 в калькуляторі
```

### Іспанська (es):
```
[TETYANA]Abrir aplicación Calculadora
[TETYANA]Agregar 27 en Calculadora
```

### Французька (fr):
```
[TETYANA]Ouvrir l'application Calculatrice
[TETYANA]Ajouter 27 à la Calculatrice
```

### Німецька (de):
```
[TETYANA]Öffnen Sie die Rechner-Anwendung
[TETYANA]27 im Taschenrechner hinzufügen
```

### Польська (pl):
```
[TETYANA]Otwórz aplikację Kalkulator
[TETYANA]Dodaj 27 w Kalkulatorze
```

### Російська (ru):
```
[TETYANA]Откройте приложение Калькулятор
[TETYANA]Добавить 27 в Калькулятор
```

---

## 🎯 Переваги

### ✅ Універсальність
- Одна система для всіх мов
- Користувач вибирає мову в `.env`
- Автоматичне переключення

### ✅ Якість
- LLM генерує природні фрази
- Без змішування мов
- Точні переклади

### ✅ Масштабованість
- Легко додати нову мову
- Просто додати `action_[lang]` поле
- Немає залежностей від словника

### ✅ Швидкість
- Немає перекладу в runtime
- Прямий доступ до готової фрази
- Швидше, ніж regex перевірки

---

## 🌍 Як додати нову мову

### Крок 1: Додати мову в конфіг

**Файл:** `/config/localization-config.js`

```javascript
SUPPORTED_LANGUAGES: {
  'uk': 'Українська',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'pl': 'Polski',
  'ru': 'Русский',
  'it': 'Italiano'  // Нова мова
}
```

### Крок 2: Оновити LLM промпт

**Файл:** `/prompts/mcp/atlas_todo_planning.js`

```javascript
// Додати в список мов
"- action_it (Italian)
 - success_criteria_it (Italian)"
```

### Крок 3: Готово!

Система автоматично використовуватиме `action_it` при `USER_LANGUAGE=it`

---

## 📝 Висновок

**Багатомовні TODO items дозволяють:**
- ✅ Генерувати план один раз (LLM)
- ✅ Використовувати для всіх мов
- ✅ Вибирати мову в конфігу
- ✅ Отримувати чисту мову без перекладу
- ✅ Легко масштабувати на нові мови

**Результат:** Одна система, багато мов! 🌍
