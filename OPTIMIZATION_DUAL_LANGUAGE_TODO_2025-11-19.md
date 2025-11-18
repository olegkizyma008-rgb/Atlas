# Оптимізація: Двомовні TODO items (2025-11-19)

## 🎯 Ідея оптимізації

**Поточна архітектура:**
```
TODO item: "Add 27 in Calculator" (англійська)
   ↓
Tetyana говорить: translateToUser() → "Додати 27 в калькуляторі"
   ↓
Словник перекладів (неповний) → Змішана мова ❌
```

**Пропонована архітектура:**
```
TODO item: {
  action_en: "Add 27 in Calculator",        // Для системи
  action_uk: "Додати 27 в калькуляторі"    // Для користувача/TTS
}
   ↓
Tetyana говорить: item.action_uk (без перекладу) ✅
   ↓
Чиста українська мова, без словника ✅
```

---

## 📊 Поточна структура TODO item

```javascript
{
  id: "1",
  action: "Add 27 in Calculator",           // Англійська
  success_criteria: "Calculator display shows 915",
  status: "pending",
  dependencies: [],
  max_attempts: 3,
  // ... інші поля
}
```

---

## ✨ Пропонована структура TODO item

```javascript
{
  id: "1",
  // ДВОМОВНІ ПОЛЯ
  action: "Add 27 in Calculator",           // Для системи (англійська)
  action_uk: "Додати 27 в калькуляторі",   // Для користувача (українська)
  
  success_criteria: "Calculator display shows 915",
  success_criteria_uk: "Дисплей калькулятора показує 915",
  
  // Інші поля залишаються без змін
  status: "pending",
  dependencies: [],
  max_attempts: 3,
  // ... інші поля
}
```

---

## 🔄 Як це працюватиме

### 1. Створення TODO (Stage 1-MCP)

**Файл:** `/orchestrator/workflow/stages/atlas-todo-planning-processor.js`

**Промпт для LLM:**

```javascript
const SYSTEM_PROMPT = `
You are Atlas TODO Planner. Create structured TODO lists.

CRITICAL: For each TODO item, generate TWO versions:
1. action_en (English) - for system processing
2. action_uk (Ukrainian) - for user display and Tetyana TTS

Format each item as JSON:
{
  "id": "1",
  "action_en": "Add 27 in Calculator",
  "action_uk": "Додати 27 в калькуляторі",
  "success_criteria_en": "Calculator display shows 915",
  "success_criteria_uk": "Дисплей калькулятора показує 915",
  "dependencies": []
}

IMPORTANT:
- action_en: Must be clear, unambiguous English for system processing
- action_uk: Must be natural Ukrainian for user understanding
- Both versions must describe the SAME action
- No translation needed later - use these directly
`;
```

### 2. Обробка TODO (Stage 2.1-MCP)

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядок 1787-1789)

**БУЛО:**
```javascript
const actionForTts = localizationService ?
  localizationService.translateToUser(item.action) :
  item.action;
```

**СТАНЕ:**
```javascript
// Використовуємо готову українську версію
const actionForTts = item.action_uk || 
  (localizationService ? localizationService.translateToUser(item.action) : item.action);
```

### 3. Верифікація (Stage 2.3-MCP)

**Файл:** `/orchestrator/workflow/stages/grisha-verify-item-processor.js`

**БУЛО:**
```javascript
this.logger.system('grisha-verify-item', `[GRISHA] Success criteria: ${currentItem.success_criteria}`);
```

**СТАНЕ:**
```javascript
// Система використовує англійську версію
const successCriteria = currentItem.success_criteria;  // Англійська для логіки
const successCriteriaUk = currentItem.success_criteria_uk; // Українська для користувача

this.logger.system('grisha-verify-item', `[GRISHA] Success criteria: ${successCriteria}`);
```

---

## 📈 Переваги оптимізації

### ✅ Переваги

1. **Немає перекладу в runtime** - Фрази готові заздалегідь
2. **Чиста українська мова** - Без змішування англійської
3. **Менше залежностей** - Не потрібен словник для TTS
4. **Швидше** - Немає regex перевірок для перекладу
5. **Точніше** - LLM генерує природні фрази, не словник
6. **Легше масштабувати** - Додати нову мову просто (action_es, action_fr)

### ⚠️ Недоліки

1. **Більший розмір TODO** - Додаткові поля для кожної мови
2. **Зміни в LLM промптах** - Потрібно оновити генерацію TODO
3. **Зміни в структурі** - Потрібно оновити всі місця, де використовується item.action

---

## 🔧 План впровадження

### Крок 1: Оновити промпти для LLM

**Файли:**
- `/prompts/mcp/atlas_todo_planning.js`
- `/prompts/mcp/atlas_replan_todo.js`

**Зміни:**
```javascript
// Додати інструкцію для LLM
"For each item, provide BOTH versions:
  - action_en: English (for system)
  - action_uk: Ukrainian (for user)
  
Example:
{
  'action_en': 'Add 27 in Calculator',
  'action_uk': 'Додати 27 в калькуляторі'
}"
```

### Крок 2: Оновити MCPTodoManager

**Файл:** `/orchestrator/workflow/mcp-todo-manager.js`

**Зміни:**
```javascript
// Парсити LLM відповідь з двомовними полями
const item = {
  id: parsed.id,
  action: parsed.action_en,        // Для системи
  action_uk: parsed.action_uk,     // Для користувача
  success_criteria: parsed.success_criteria_en,
  success_criteria_uk: parsed.success_criteria_uk,
  // ... інші поля
};
```

### Крок 3: Оновити executor-v3.js

**Файл:** `/orchestrator/workflow/executor-v3.js` (рядок 1787-1789)

**Зміни:**
```javascript
// Використовувати готову українську версію
const actionForTts = item.action_uk || item.action;
```

### Крок 4: Оновити grisha-verify-item-processor.js

**Файл:** `/orchestrator/workflow/stages/grisha-verify-item-processor.js`

**Зміни:**
```javascript
// Система використовує англійську версію
const successCriteria = currentItem.success_criteria;  // Англійська
```

### Крок 5: Оновити LocalizationService

**Файл:** `/orchestrator/services/localization-service.js`

**Зміни:**
```javascript
translateTodoItem(item) {
  // Якщо вже є двомовні версії, використовувати їх
  if (item.action_uk) {
    return {
      system: { ...item, action: item.action },
      user: { ...item, action: item.action_uk }
    };
  }
  
  // Інакше - перекладати як раніше (fallback)
  return {
    system: { ...item, action: this.ensureEnglish(item.action) },
    user: { ...item, action: this.translateToUser(item.action) }
  };
}
```

---

## 📋 Приклад: Повний потік

### БУЛО (з перекладом):

```
1. LLM генерує план (англійська):
   "Add 27 in Calculator"
   ↓
2. MCPTodoManager зберігає:
   item.action = "Add 27 in Calculator"
   ↓
3. Executor викликає translateToUser():
   "Add 27 in Calculator" → словник → "Додати 27 в калькуляторі" (неповно)
   ↓
4. Tetyana говорить (змішана мова):
   "Додати 27 in Calculator" ❌
```

### СТАНЕ (без перекладу):

```
1. LLM генерує план (двомовний):
   action_en: "Add 27 in Calculator"
   action_uk: "Додати 27 в калькуляторі"
   ↓
2. MCPTodoManager зберігає:
   item.action = "Add 27 in Calculator"
   item.action_uk = "Додати 27 в калькуляторі"
   ↓
3. Executor використовує готову версію:
   actionForTts = item.action_uk
   ↓
4. Tetyana говорить (чиста українська):
   "Додати 27 в калькуляторі" ✅
```

---

## 🎯 Результат

### Поточна система:

```
[TETYANA]Відкрити калькулятор application ❌
[TETYANA]Помножити by 139 in Calculator ❌
[TETYANA]Set downloaded image as шпалери on all monitors ❌
```

### Після оптимізації:

```
[TETYANA]Відкрити калькулятор програму ✅
[TETYANA]Помножити на 139 в калькуляторі ✅
[TETYANA]Встановити завантажене зображення як шпалери на всі монітори ✅
```

---

## 📊 Порівняння: Словник vs Двомовні TODO

| Аспект               | Словник                | Двомовні TODO          |
| -------------------- | ---------------------- | ---------------------- |
| **Якість перекладу** | Залежить від словника  | Залежить від LLM       |
| **Повнота**          | Неповна (багато слів)  | Повна (LLM генерує)    |
| **Швидкість**        | Медленно (regex)       | Швидко (прямий доступ) |
| **Масштабованість**  | Важко (додавати слова) | Легко (додати мову)    |
| **Точність**         | Середня                | Висока                 |
| **Розмір TODO**      | Малий                  | Більший                |
| **Залежності**       | LocalizationService    | LLM                    |

---

## 🚀 Рекомендація

**Впровадити поступово:**

### Фаза 1 (Тестування):
- Оновити LLM промпти для генерації двомовних TODO
- Тестувати на новому плані
- Перевірити якість українських фраз

### Фаза 2 (Впровадження):
- Оновити executor-v3.js для використання action_uk
- Оновити grisha-verify-item-processor.js
- Оновити LocalizationService для fallback

### Фаза 3 (Оптимізація):
- Видалити залежність від словника для TTS
- Залишити словник тільки для системних повідомлень
- Додати підтримку інших мов (es, fr, de)

---

## 📝 Висновок

**Двомовні TODO items - це розумна оптимізація, яка:**
- ✅ Усуває проблему змішування мов
- ✅ Покращує якість TTS фраз
- ✅ Зменшує залежність від словника
- ✅ Робить систему більш масштабованою
- ✅ Дозволяє LLM генерувати природні фрази

**Рекомендація:** Впровадити поступово, починаючи з тестування на новому плані.
