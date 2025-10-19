# Підтримка подвійних спеціалізованих промптів
**Дата:** 2025-10-19  
**Версія:** 5.1.2  
**Тип:** Feature Enhancement

## 🎯 Запит користувача
> "Якщо вибирається два MCP, потрібно щоб два промпта підтягувалося спеціалізованих а не загальний один"

## 📋 Проблема

**Було:**
```
1 сервер → спеціалізований промпт ✅
2 сервери → загальний промпт ❌
>2 сервери → загальний промпт ✅
```

**Приклад:**
- Завдання: "Відкрити браузер та створити файл"
- Stage 2.0 обирає: `['playwright', 'filesystem']`
- Stage 2.1 використовувала: `TETYANA_PLAN_TOOLS` (загальний) ❌

**Наслідок:** LLM отримував загальні інструкції замість детальних спеціалізованих для обох серверів.

---

## ✅ Рішення

### Нова логіка вибору промптів:

```javascript
// tetyana-plan-tools-processor.js

if (selected_servers.length === 1) {
    // Один сервер → один спеціалізований промпт
    promptOverride = 'TETYANA_PLAN_TOOLS_PLAYWRIGHT';
}
else if (selected_servers.length === 2) {
    // Два сервери → обидва спеціалізовані промпти
    promptOverride = [
        'TETYANA_PLAN_TOOLS_PLAYWRIGHT',
        'TETYANA_PLAN_TOOLS_FILESYSTEM'
    ];
}
else {
    // >2 сервери → загальний промпт
    promptOverride = null; // Uses TETYANA_PLAN_TOOLS
}
```

### Об'єднання 2 промптів:

```javascript
// mcp-todo-manager.js

if (Array.isArray(options.promptOverride) && options.promptOverride.length === 2) {
    const prompt1 = MCP_PROMPTS[options.promptOverride[0]];
    const prompt2 = MCP_PROMPTS[options.promptOverride[1]];
    
    // Взяти JSON rules з першого промпту (вони однакові)
    const commonHeader = prompt1.SYSTEM_PROMPT.split('\n\n## ')[0];
    
    // Взяти спеціалізацію з обох
    const spec1 = prompt1.SYSTEM_PROMPT.split('\n\n## ').slice(1).join('\n\n## ');
    const spec2 = prompt2.SYSTEM_PROMPT.split('\n\n## ').slice(1).join('\n\n## ');
    
    // Об'єднати
    combinedSystemPrompt = `
${commonHeader}

## ПОДВІЙНА СПЕЦІАЛІЗАЦІЯ

Ти Тетяна - експерт з playwright та filesystem.

### PLAYWRIGHT:
${spec1}

### FILESYSTEM:
${spec2}
`;
}
```

---

## 📊 Результат

### Приклад об'єднаного промпту:

```
You are a JSON-only API. You must respond ONLY with valid JSON.

⚠️ CRITICAL JSON OUTPUT RULES:
[...JSON rules identical for all prompts...]

🚨🚨🚨 TRAILING COMMAS WILL BREAK EVERYTHING 🚨🚨🚨
[...trailing comma warnings...]

## ПОДВІЙНА СПЕЦІАЛІЗАЦІЯ

Ти Тетяна - експерт з playwright та filesystem.

### PLAYWRIGHT:
**ТВОЯ ЕКСПЕРТИЗА:**
- Навігація сайтів та взаємодія з UI
- Пошук елементів через селектори (CSS, XPath, text)
- Заповнення форм та кліки
- Скріншоти та витяг тексту
[...]

### FILESYSTEM:
**ТВОЯ ЕКСПЕРТИЗА:**
- Читання та запис файлів (text, JSON, CSV)
- Створення та управління директоріями
- Перевірка існування файлів
[...]
```

---

## 🔬 Технічна реалізація

### 1. Файл: `tetyana-plan-tools-processor.js` (рядки 83-117)

```javascript
// NEW 19.10.2025: Select MCP-specific prompt(s) based on selected servers
let promptOverride = null;

if (selected_servers && selected_servers.length === 1) {
    // Single server - use specialized prompt
    const serverName = selected_servers[0].toLowerCase();
    if (specializedPrompts[serverName]) {
        promptOverride = specializedPrompts[serverName];
        this.logger.system('tetyana-plan-tools', 
            `[STAGE-2.1-MCP] 🎯 Using specialized prompt: ${promptOverride}`);
    }
} 
else if (selected_servers && selected_servers.length === 2) {
    // Two servers - use both specialized prompts (combined)
    const prompts = selected_servers
        .map(s => specializedPrompts[s.toLowerCase()])
        .filter(Boolean);
    
    if (prompts.length === 2) {
        promptOverride = prompts; // Array of 2 prompts
        this.logger.system('tetyana-plan-tools', 
            `[STAGE-2.1-MCP] 🎯 Using 2 specialized prompts: ${prompts.join(' + ')}`);
    }
}
```

### 2. Файл: `mcp-todo-manager.js` (рядки 889-920)

```javascript
// NEW 19.10.2025: Support array of prompts for 2 servers
let planPrompt;
let combinedSystemPrompt = null; // For 2-prompt case

if (Array.isArray(options.promptOverride) && options.promptOverride.length === 2) {
    // Two specialized prompts - combine them
    const prompt1 = MCP_PROMPTS[options.promptOverride[0]];
    const prompt2 = MCP_PROMPTS[options.promptOverride[1]];
    
    if (prompt1 && prompt2) {
        // Combine SYSTEM_PROMPTs from both specialized prompts
        const commonHeader = prompt1.SYSTEM_PROMPT.split('\n\n## ')[0];
        const spec1 = prompt1.SYSTEM_PROMPT.split('\n\n## ').slice(1).join('\n\n## ');
        const spec2 = prompt2.SYSTEM_PROMPT.split('\n\n## ').slice(1).join('\n\n## ');
        
        combinedSystemPrompt = `${commonHeader}\n\n## ПОДВІЙНА СПЕЦІАЛІЗАЦІЯ\n\n...`;
        
        this.logger.system('mcp-todo', 
            `[TODO] 🎯🎯 Using 2 combined specialized prompts: ${options.promptOverride.join(' + ')}`);
    }
}

// Later use combinedSystemPrompt if available
let systemPrompt = combinedSystemPrompt || planPrompt.systemPrompt || planPrompt.SYSTEM_PROMPT;
```

---

## 📝 Логи для тестування

### 1 сервер (playwright):
```
[STAGE-2.1-MCP] 🎯 Using specialized prompt: TETYANA_PLAN_TOOLS_PLAYWRIGHT
[TODO] 🎯 Using specialized prompt: TETYANA_PLAN_TOOLS_PLAYWRIGHT
```

### 2 сервери (playwright + filesystem):
```
[STAGE-2.1-MCP] 🎯 Using 2 specialized prompts: TETYANA_PLAN_TOOLS_PLAYWRIGHT + TETYANA_PLAN_TOOLS_FILESYSTEM
[TODO] 🎯🎯 Using 2 combined specialized prompts: TETYANA_PLAN_TOOLS_PLAYWRIGHT + TETYANA_PLAN_TOOLS_FILESYSTEM
```

### >2 сервери (playwright + filesystem + shell):
```
[TODO] Using general TETYANA_PLAN_TOOLS prompt
```

---

## 🧪 Тестування

### Тест 1: Завдання з 1 сервером
```
Запит: "Відкрити сайт google.com"
Очікуване: playwright → TETYANA_PLAN_TOOLS_PLAYWRIGHT
```

### Тест 2: Завдання з 2 серверами
```
Запит: "Відкрити auto.ria.com та зберегти результат в файл data.txt"
Очікуване: playwright + filesystem → Combined prompt
```

### Тест 3: Завдання з >2 серверами
```
Запит: "Відкрити сайт, зберегти файл, виконати команду"
Очікуване: playwright + filesystem + shell → General prompt
```

---

## 📈 Переваги

1. **Більш точні інструкції:** LLM отримує детальні знання про обидва сервери
2. **Кращі tool_calls:** Спеціалізовані приклади для кожного серверу
3. **Менше помилок:** Детальніші параметри та use cases
4. **Backward compatible:** Старі завдання (1 сервер, >2 сервери) працюють як раніше

---

## ⚠️ Обмеження

1. **Тільки для 2 серверів:** >2 серверів використовують загальний промпт (prompt був би занадто довгий)
2. **Потрібні обидва промпти:** Якщо один із серверів не має спеціалізованого промпту, використовується тільки один або загальний
3. **Розмір промпту:** Об'єднаний промпт більший (~2x), але в межах token limit

---

## 🔄 Сумісність

- ✅ Backward compatible з існуючими завданнями
- ✅ Не ламає логіку для 1 серверу
- ✅ Не ламає логіку для >2 серверів
- ✅ Додає нову функціональність для 2 серверів

**Статус:** ✅ READY FOR TESTING
