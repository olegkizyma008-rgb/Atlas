# Аналіз Роботи Системи Верифікації - Всі Варіанти
**Дата:** 2025-10-24  
**Версія:** Atlas v5.0

## Огляд Змін

### Виправлення у цьому коміті:
1. ✅ Shell tool name: `shell__execute` → `shell__execute_command`
2. ✅ Infinite loop protection (3 рівні захисту)
3. ✅ AppleScript detection для macOS UI операцій
4. ✅ Shell keywords тепер специфічні для terminal операцій

---

## Аналіз Сценаріїв Верифікації

### Сценарій 1: Calculator Операції

**Приклад:** "Відкрити калькулятор і виконати 7 * 139"

**Потік:**
```
Action: "відкрити калькулятор і виконати 7 * 139"
Success Criteria: "результат 973"

1. _detectVisualIndicators()
   - Keyword: "калькулятор" → score 90, targetApp: "Calculator"
   
2. _detectAppleScriptIndicators()
   - Keyword: "відкрити програму" → score 85
   
3. _detectShellIndicators()
   - NO MATCH (видалено загальні keywords)
   
4. Decision: visualIndicators.score (90) >= 70
   → method: 'visual'
   → fallbackToMcp: true
   → mcpFallbackTools: ['applescript__applescript_execute']
```

**Результат:** ✅ Visual verification (screenshot + AI)  
**Fallback:** AppleScript MCP (якщо visual fails)

---

### Сценарій 2: Відкрити Програму (БЕЗ Calculator keyword)

**Приклад:** "Відкрити Notes і створити нотатку"

**Потік:**
```
Action: "відкрити notes і створити нотатку"
Success Criteria: "notes відкрито"

1. _detectVisualIndicators()
   - Keyword: "notes відкр" → score 80, targetApp: "Notes"
   
2. _detectAppleScriptIndicators()
   - Keyword: "відкрити програму" → score 85
   
3. Decision: visualIndicators.score (80) >= 70
   → method: 'visual'
   → fallbackToMcp: true
   → mcpFallbackTools: ['applescript__applescript_execute']
```

**Результат:** ✅ Visual verification  
**Fallback:** AppleScript MCP

---

### Сценарій 3: Закрити Програму (Тільки AppleScript)

**Приклад:** "Закрити Safari через меню"

**Потік:**
```
Action: "закрити safari через меню"
Success Criteria: "safari закрито"

1. _detectVisualIndicators()
   - Keyword: "safari" → score 85 (але "відкр" не знайдено)
   - Keyword: "меню" → score 55
   - Total: score ~60-65

2. _detectAppleScriptIndicators()
   - Keyword: "закрити програму" → score 85
   - Keyword: "меню" → score 80
   - Total: score 85
   
3. Decision: visualIndicators.score (65) < 70
   → Check applescriptIndicators.score (85) >= 60
   → method: 'mcp'
   → mcpServer: 'applescript'
   → fallbackToVisual: true
```

**Результат:** ✅ AppleScript MCP verification  
**Fallback:** Visual (якщо MCP fails)

**Чому це правильно:**
- "Закрити програму" - це AppleScript операція
- Visual може не побачити що app закрився (чорний екран)
- AppleScript може перевірити через `application "Safari" is running`

---

### Сценарій 4: Bash/Terminal Команди

**Приклад:** "Виконати bash скрипт для перевірки процесів"

**Потік:**
```
Action: "виконати bash скрипт для перевірки процесів"
Success Criteria: "процес знайдено"

1. _detectVisualIndicators()
   - NO MATCH (немає app keywords)
   
2. _detectAppleScriptIndicators()
   - NO MATCH (немає UI keywords)
   
3. _detectShellIndicators()
   - Keyword: "bash" → score 85
   - Keyword: "процес" → score 75
   - Total: score 85
   
4. Decision: shellIndicators.score (85) >= 60
   → method: 'mcp'
   → mcpServer: 'shell'
   → fallbackToVisual: false
```

**Результат:** ✅ Shell MCP verification  
**Fallback:** None (shell операції не мають visual fallback)

---

### Сценарій 5: Файлові Операції

**Приклад:** "Створити папку HackMode на Desktop"

**Потік:**
```
Action: "створити папку hackmode на desktop"
Success Criteria: "папка існує"

1. _detectVisualIndicators()
   - Keyword: "desktop" → score ~40 (слабкий)
   
2. _detectAppleScriptIndicators()
   - NO MATCH
   
3. _detectFilesystemIndicators()
   - Keyword: "створити папку" → score 85
   - Keyword: "desktop" → score 70
   - Total: score 85
   
4. Decision: filesystemIndicators.score (85) >= 60
   → method: 'mcp'
   → mcpServer: 'filesystem'
   → fallbackToVisual: false
```

**Результат:** ✅ Filesystem MCP verification  
**Fallback:** None

---

### Сценарій 6: Загальна Команда (Ambiguous)

**Приклад:** "Виконати операцію X" (без специфічних keywords)

**Потік:**
```
Action: "виконати операцію x"
Success Criteria: "операція виконана"

1. _detectVisualIndicators()
   - NO MATCH → score 0
   
2. _detectAppleScriptIndicators()
   - NO MATCH → score 0
   
3. _detectFilesystemIndicators()
   - NO MATCH → score 0
   
4. _detectShellIndicators()
   - NO MATCH (видалено "виконати" як загальний keyword)
   
5. Decision: Default strategy
   → method: 'visual'
   → confidence: 30 (мінімум)
   → fallbackToMcp: true
   → mcpFallbackTools: [] (empty)
```

**Результат:** ✅ Visual verification (default)  
**Fallback:** MCP (але без specific tools)

**Чому це правильно:**
- Visual може побачити результат на екрані
- Якщо visual fails → LLM eligibility processor визначить правильний MCP server

---

## Потенційні Проблеми та Рішення

### Проблема 1: Конфлікт Keywords

**Сценарій:** "Відкрити terminal і виконати bash команду"

**Аналіз:**
```
visualIndicators: score 0 (немає app keywords для "terminal")
applescriptIndicators: score 85 ("відкрити програму")
shellIndicators: score 85 ("terminal", "bash")
```

**Пріоритет (рядки 76-132):**
1. Visual (score ≥70) - НЕ спрацює
2. AppleScript (score ≥60) - ✅ СПРАЦЮЄ ПЕРШИМ
3. Shell (score ≥60) - не досягне

**Результат:** AppleScript MCP → НЕПРАВИЛЬНО для bash команд!

**Рішення:** 
Додати вищий пріоритет для shell keywords коли є "bash", "terminal":

```javascript
// BEFORE AppleScript check
if (shellIndicators.score >= 80 && 
    (action.includes('bash') || action.includes('terminal') || action.includes('shell'))) {
    return {
        method: 'mcp',
        mcpServer: 'shell',
        tools: shellIndicators.suggestedTools,
        confidence: shellIndicators.score,
        reason: 'High-confidence shell operation detected',
        fallbackToVisual: false
    };
}
```

### Проблема 2: "Відкрити Finder" - Visual vs AppleScript

**Сценарій:** "Відкрити Finder і перейти до Desktop"

**Аналіз:**
```
visualIndicators: score 80 ("finder відкр")
applescriptIndicators: score 85 ("відкрити програму")
```

**Пріоритет:**
1. Visual (score 80) ≥ 70 → ✅ СПРАЦЮЄ

**Результат:** Visual verification → ПРАВИЛЬНО (можна побачити Finder window)

**Але:** Якщо criteria "папка Desktop відображається" → краще AppleScript

**Рішення:** LLM eligibility processor має override heuristic для таких випадків.

### Проблема 3: AppleScript Execution Results

**Сценарій:** Після виконання AppleScript tool, execution.results містить:
```javascript
{
    tool: "applescript__applescript_execute",
    data: "..."
}
```

**Перевірка в _detectAppleScriptIndicators (рядок 334):**
```javascript
if (toolName.includes('applescript')) {
    score = Math.max(score, 90);
}
```

**Результат:** ✅ Правильно детектує що AppleScript був використаний

---

## Матриця Рішень

| Action Type | Visual Score | AppleScript Score | Shell Score | Filesystem Score | Final Decision | Правильно? |
|-------------|--------------|-------------------|-------------|------------------|----------------|------------|
| "Відкрити калькулятор" | 90 | 85 | 0 | 0 | Visual | ✅ |
| "Закрити Safari" | 65 | 85 | 0 | 0 | AppleScript | ✅ |
| "Bash скрипт" | 0 | 0 | 85 | 0 | Shell | ✅ |
| "Створити папку" | 40 | 0 | 0 | 85 | Filesystem | ✅ |
| "Відкрити terminal і bash" | 0 | 85 | 85 | 0 | AppleScript | ❌ ПРОБЛЕМА |
| "Виконати grep команду" | 0 | 0 | 90 | 0 | Shell | ✅ |
| "Натиснути кнопку в app" | 70 | 75 | 0 | 0 | Visual | ✅ |

---

## Рекомендації

### Виправлення 1: Shell Priority для Terminal Operations

**Файл:** `grisha-verification-strategy.js`, рядок 86 (перед AppleScript check)

```javascript
// HIGH PRIORITY: Shell operations with explicit terminal/bash keywords
if (shellIndicators.score >= 80) {
    const hasExplicitShell = action.includes('bash') || 
                            action.includes('terminal') || 
                            action.includes('shell') ||
                            action.includes('grep') ||
                            action.includes('awk') ||
                            action.includes('sed');
    
    if (hasExplicitShell) {
        return {
            method: 'mcp',
            mcpServer: 'shell',
            tools: shellIndicators.suggestedTools,
            confidence: shellIndicators.score,
            reason: 'Explicit shell/terminal operation detected',
            fallbackToVisual: false
        };
    }
}

// THEN check AppleScript (score >= 60)
if (applescriptIndicators.score >= 60) {
    // ...
}
```

### Виправлення 2: Уточнити AppleScript Keywords

**Проблема:** "відкрити програму" занадто загальне

**Рішення:** Розділити на:
- "відкрити програму/аплікацію" → AppleScript
- "відкрити terminal" → Shell (exception)

```javascript
const applescriptKeywords = [
    // SPECIFIC app launch (exclude terminal/shell)
    { 
        keywords: ['відкрити програму', 'відкрити аплікацію', 'open app', 'launch app'], 
        score: 85, 
        tool: 'applescript__applescript_execute',
        exclude: ['terminal', 'термінал', 'shell']  // NEW: exclusions
    },
    // ...
];

// Check with exclusions
for (const mapping of applescriptKeywords) {
    for (const keyword of mapping.keywords) {
        if (action.includes(keyword)) {
            // Check exclusions
            const hasExclusion = mapping.exclude?.some(excl => action.includes(excl));
            if (!hasExclusion) {
                score = Math.max(score, mapping.score);
                // ...
            }
        }
    }
}
```

---

## Висновок

**Загальна оцінка:** 8/10

**Що працює добре:**
- ✅ Visual verification для Calculator, Safari, Finder
- ✅ AppleScript для закриття apps, menu operations
- ✅ Shell для bash/grep/awk команд
- ✅ Filesystem для файлових операцій
- ✅ Fallback механізми

**Що потребує виправлення:**
- ❌ Конфлікт "відкрити terminal" → AppleScript замість Shell
- ⚠️ Загальні keywords можуть конфліктувати

**Критичність:** СЕРЕДНЯ  
Більшість сценаріїв працюють правильно. LLM eligibility processor може override heuristic decisions у складних випадках.

**Рекомендація:** Додати shell priority check перед AppleScript (Виправлення 1).
