# Практичний приклад: Двомовні TODO items (2025-11-19)

## 📋 Приклад 1: Простий план (калькулятор)

### ПОТОЧНА СИСТЕМА (з перекладом):

```json
{
  "id": "todo_1",
  "items": [
    {
      "id": "1",
      "action": "Open Calculator application",
      "success_criteria": "Calculator application window is visible on the screen",
      "status": "pending"
    },
    {
      "id": "2",
      "action": "Add 27 in Calculator",
      "success_criteria": "Calculator display shows 915",
      "status": "pending"
    }
  ]
}
```

**Результат TTS:**
```
[TETYANA]Відкрити калькулятор application ❌ (змішана мова)
[TETYANA]Додати 27 in Calculator ❌ (змішана мова)
```

---

### ОПТИМІЗОВАНА СИСТЕМА (двомовні TODO):

```json
{
  "id": "todo_1",
  "items": [
    {
      "id": "1",
      "action": "Open Calculator application",
      "action_uk": "Відкрити калькулятор програму",
      "success_criteria": "Calculator application window is visible on the screen",
      "success_criteria_uk": "Вікно програми Калькулятор видимо на екрані",
      "status": "pending"
    },
    {
      "id": "2",
      "action": "Add 27 in Calculator",
      "action_uk": "Додати 27 в калькуляторі",
      "success_criteria": "Calculator display shows 915",
      "success_criteria_uk": "Дисплей калькулятора показує 915",
      "status": "pending"
    }
  ]
}
```

**Результат TTS:**
```
[TETYANA]Відкрити калькулятор програму ✅ (чиста українська)
[TETYANA]Додати 27 в калькуляторі ✅ (чиста українська)
```

---

## 📋 Приклад 2: Складний план (браузер + завантаження)

### ПОТОЧНА СИСТЕМА (з перекладом):

```json
{
  "id": "todo_2",
  "items": [
    {
      "id": "1",
      "action": "Open browser",
      "success_criteria": "Browser window is open and ready",
      "status": "pending"
    },
    {
      "id": "2",
      "action": "Navigate to google.com",
      "success_criteria": "Google homepage is loaded",
      "dependencies": ["1"],
      "status": "pending"
    },
    {
      "id": "3",
      "action": "Enter search query",
      "success_criteria": "Search query is entered in search box",
      "dependencies": ["2"],
      "status": "pending"
    },
    {
      "id": "4",
      "action": "Switch to Images tab",
      "success_criteria": "Images tab is active",
      "dependencies": ["3"],
      "status": "pending"
    },
    {
      "id": "5",
      "action": "Download image to /Users/dev/Documents/GitHub/atlas4/data/HackLab",
      "success_criteria": "Image file is saved in the specified directory",
      "dependencies": ["4"],
      "status": "pending"
    },
    {
      "id": "6",
      "action": "Set downloaded image as wallpaper on all monitors",
      "success_criteria": "Wallpaper is set on all connected monitors",
      "dependencies": ["5"],
      "status": "pending"
    }
  ]
}
```

**Результат TTS:**
```
[TETYANA]Open browser ❌ (не перекладено)
[TETYANA]Navigate to google.com ❌ (не перекладено)
[TETYANA]Enter search query ❌ (не перекладено)
[TETYANA]Switch to Images tab ❌ (не перекладено)
[TETYANA]Download image to /Users/dev/Documents/GitHub/atlas4/data/HackLab ❌ (не перекладено)
[TETYANA]Set downloaded image as wallpaper on all monitors ❌ (не перекладено)
```

---

### ОПТИМІЗОВАНА СИСТЕМА (двомовні TODO):

```json
{
  "id": "todo_2",
  "items": [
    {
      "id": "1",
      "action": "Open browser",
      "action_uk": "Відкрити браузер",
      "success_criteria": "Browser window is open and ready",
      "success_criteria_uk": "Вікно браузера відкрито і готово до роботи",
      "status": "pending"
    },
    {
      "id": "2",
      "action": "Navigate to google.com",
      "action_uk": "Перейти на google.com",
      "success_criteria": "Google homepage is loaded",
      "success_criteria_uk": "Домашня сторінка Google завантажена",
      "dependencies": ["1"],
      "status": "pending"
    },
    {
      "id": "3",
      "action": "Enter search query",
      "action_uk": "Ввести пошуковий запит",
      "success_criteria": "Search query is entered in search box",
      "success_criteria_uk": "Пошуковий запит введено в поле пошуку",
      "dependencies": ["2"],
      "status": "pending"
    },
    {
      "id": "4",
      "action": "Switch to Images tab",
      "action_uk": "Перейти на вкладку Зображення",
      "success_criteria": "Images tab is active",
      "success_criteria_uk": "Вкладка Зображення активна",
      "dependencies": ["3"],
      "status": "pending"
    },
    {
      "id": "5",
      "action": "Download image to /Users/dev/Documents/GitHub/atlas4/data/HackLab",
      "action_uk": "Завантажити зображення в /Users/dev/Documents/GitHub/atlas4/data/HackLab",
      "success_criteria": "Image file is saved in the specified directory",
      "success_criteria_uk": "Файл зображення збережено в указаній папці",
      "dependencies": ["4"],
      "status": "pending"
    },
    {
      "id": "6",
      "action": "Set downloaded image as wallpaper on all monitors",
      "action_uk": "Встановити завантажене зображення як шпалери на всі монітори",
      "success_criteria": "Wallpaper is set on all connected monitors",
      "success_criteria_uk": "Шпалери встановлені на всіх підключених моніторах",
      "dependencies": ["5"],
      "status": "pending"
    }
  ]
}
```

**Результат TTS:**
```
[TETYANA]Відкрити браузер ✅
[TETYANA]Перейти на google.com ✅
[TETYANA]Ввести пошуковий запит ✅
[TETYANA]Перейти на вкладку Зображення ✅
[TETYANA]Завантажити зображення в /Users/dev/Documents/GitHub/atlas4/data/HackLab ✅
[TETYANA]Встановити завантажене зображення як шпалери на всі монітори ✅
```

---

## 🔄 Потік обробки

### Крок 1: LLM генерує двомовний план

```javascript
// LLM промпт
const prompt = `
Create a TODO plan for: "Download an image and set as wallpaper"

For EACH item, provide TWO versions:
1. action_en: English (for system processing)
2. action_uk: Ukrainian (for user and Tetyana TTS)

Return JSON array with items like:
{
  "id": "1",
  "action_en": "Open browser",
  "action_uk": "Відкрити браузер",
  "success_criteria_en": "Browser window is open",
  "success_criteria_uk": "Вікно браузера відкрито",
  "dependencies": []
}
`;

// LLM відповідь
const response = [
  {
    "id": "1",
    "action_en": "Open browser",
    "action_uk": "Відкрити браузер",
    "success_criteria_en": "Browser window is open",
    "success_criteria_uk": "Вікно браузера відкрито",
    "dependencies": []
  },
  // ... більше items
];
```

### Крок 2: MCPTodoManager зберігає двомовний план

```javascript
// MCPTodoManager.createTodo()
const todo = {
  id: "todo_1",
  user_message: "Download an image and set as wallpaper",
  items: response.map(item => ({
    id: item.id,
    action: item.action_en,        // Для системи
    action_uk: item.action_uk,     // Для користувача
    success_criteria: item.success_criteria_en,
    success_criteria_uk: item.success_criteria_uk,
    dependencies: item.dependencies,
    status: "pending",
    max_attempts: 3
  }))
};
```

### Крок 3: Executor використовує готову українську версію

```javascript
// executor-v3.js (рядок 1787-1789)
if (ttsSyncManager && item.action) {
  try {
    // ОПТИМІЗОВАНО: Використовуємо готову українську версію
    const actionForTts = item.action_uk || item.action;
    
    logger.system('executor', `[TTS] 🔊 Tetyana START: "${actionForTts}"`);
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

### Крок 4: Grisha верифікує з англійською версією

```javascript
// grisha-verify-item-processor.js
const successCriteria = currentItem.success_criteria;  // Англійська для логіки
const successCriteriaUk = currentItem.success_criteria_uk; // Українська для користувача

this.logger.system('grisha-verify-item', `[GRISHA] Success criteria: ${successCriteria}`);

// Верифікація використовує англійську версію
const visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
  screenshot.filepath,
  successCriteria,  // Англійська
  analysisContext
);
```

---

## 📊 Порівняння розмірів

### ПОТОЧНА СИСТЕМА:

```json
{
  "id": "1",
  "action": "Add 27 in Calculator",
  "success_criteria": "Calculator display shows 915",
  "status": "pending"
}
// Розмір: ~120 байт
```

### ОПТИМІЗОВАНА СИСТЕМА:

```json
{
  "id": "1",
  "action": "Add 27 in Calculator",
  "action_uk": "Додати 27 в калькуляторі",
  "success_criteria": "Calculator display shows 915",
  "success_criteria_uk": "Дисплей калькулятора показує 915",
  "status": "pending"
}
// Розмір: ~280 байт (+160 байт на item)
```

**Вплив:** Для плану з 22 items: +3.5 KB (незначно)

---

## ✅ Переваги в реальності

### БУЛО:
```
[TETYANA]Відкрити калькулятор application
[TETYANA]Помножити by 139 in Calculator
[TETYANA]Set downloaded image as шпалери on all monitors
```

### СТАНЕ:
```
[TETYANA]Відкрити калькулятор програму
[TETYANA]Помножити на 139 в калькуляторі
[TETYANA]Встановити завантажене зображення як шпалери на всі монітори
```

---

## 🎯 Висновок

**Двомовні TODO items дозволяють:**
- ✅ Генерувати природні українські фрази з LLM
- ✅ Уникнути перекладу через словник
- ✅ Отримати чисту українську мову в TTS
- ✅ Легко додати інші мови
- ✅ Зберегти англійську версію для системи

**Рекомендація:** Впровадити цю оптимізацію для нових планів, починаючи з наступного запуску.
