# Виправлення помилок валідації після рефакторингу (2025-10-23)

## Проблема

Після рефакторингу системи валідації (впровадження ValidationPipeline) виникла критична помилка:

```
03:24:26 ⚠️ Не вдалося спланувати інструменти для "Відкрити калькулятор": 
Cannot read properties of undefined (reading 'join')
03:38:13 timeout of 30000ms exceeded
```

## Аналіз

### Корінні причини

**Проблема #1:** У файлі `/orchestrator/ai/mcp-manager.js` метод `validateToolCalls()` (рядки 1002-1008) мав логічну помилку:

**Проблема #2:** У файлі `/orchestrator/workflow/mcp-todo-manager.js` метод `_buildToolCallsSchema()` (рядок 2805) не валідував структуру `availableTools`

**Проблема #3:** У файлі `/orchestrator/workflow/mcp-todo-manager.js` (рядок 1142) небезпечний доступ до вкладених властивостей `toolSchema`

**Проблема #4:** У файлі `/orchestrator/workflow/stages/tetyana-plan-tools-processor.js` (рядки 165, 168) небезпечний доступ до `validation.errors.join()` та `validation.suggestions.join()`

### Детальний аналіз проблеми #1 (mcp-manager.js)

```javascript
// ❌ НЕПРАВИЛЬНО (до виправлення):
const mcpServer = this.servers.get(server);
if (!mcpServer || !Array.isArray(mcpServer.tools)) {
  errors.push(`[Call ${i}] Server '${server}' has no tools loaded`);
  if (!autoCorrect) continue;  // Продовжувало якщо autoCorrect=true!
}

const availableTools = mcpServer.tools.map(t => t.name);  // 💥 CRASH: mcpServer undefined
```

**Проблема:** Коли `autoCorrect=true` (або взагалі не вказано, що є дефолтом), код НЕ робив `continue` після виявлення що `mcpServer` не має tools, і намагався викликати `.map()` на undefined.

### Детальний аналіз проблеми #2 (mcp-todo-manager.js - _buildToolCallsSchema)

```javascript
// ❌ НЕПРАВИЛЬНО (до виправлення):
_buildToolCallsSchema(availableTools) {
  if (!availableTools || availableTools.length === 0) {
    return null;
  }

  // Не перевіряє чи availableTools є масивом!
  const validToolNames = availableTools.map(t => t.name);  // 💥 CRASH якщо t.name undefined
  const validServerNames = [...new Set(availableTools.map(t => t.server))];
}
```

**Проблема:** Метод не валідував:
1. Чи `availableTools` є масивом
2. Чи кожен елемент має властивості `name` та `server`
3. Чи результат фільтрації не порожній

### Детальний аналіз проблеми #3 (mcp-todo-manager.js - небезпечний доступ)

```javascript
// ❌ НЕПРАВИЛЬНО (до виправлення):
if (toolSchema) {
  requestBody.response_format = { ... };
  // 💥 CRASH якщо toolSchema.properties undefined
  this.logger.system('mcp-todo', `[TODO] 🔒 Using JSON Schema with ${toolSchema.properties.tool_calls.items.properties.tool.enum.length} valid tool names`);
}
```

**Проблема:** Небезпечний доступ до глибоко вкладених властивостей без перевірки. Якщо `_buildToolCallsSchema()` повертає об'єкт без очікуваної структури, виникає crash.

### Чому це сталося

1. **ValidationPipeline** (нова архітектура) викликає `validateToolCalls()` з різними опціями
2. **SchemaValidator** та **MCPSyncValidator** реєструються у pipeline
3. Коли validation pipeline виконується, він може викликати старий метод `mcp-manager.validateToolCalls()` який мав цю логічну помилку
4. Помилка проявлялась тільки після рефакторингу, бо раніше метод не викликався в таких умовах

## Виправлення

### 1. Виправлено mcp-manager.js validateToolCalls() (рядок 1005)

```javascript
// ✅ ПРАВИЛЬНО (після виправлення):
const mcpServer = this.servers.get(server);
if (!mcpServer || !Array.isArray(mcpServer.tools)) {
  errors.push(`[Call ${i}] Server '${server}' has no tools loaded`);
  continue;  // FIXED: Завжди пропускаємо, незалежно від autoCorrect
}

const availableTools = mcpServer.tools.map(t => t.name);  // ✅ Безпечно
```

### 2. Виправлено mcp-todo-manager.js _buildToolCallsSchema() (рядки 2805-2831)

```javascript
// ✅ ПРАВИЛЬНО (після виправлення):
_buildToolCallsSchema(availableTools) {
  if (!availableTools || availableTools.length === 0) {
    return null;
  }

  // FIXED 2025-10-23: Validate availableTools structure before mapping
  if (!Array.isArray(availableTools)) {
    this.logger.error('[MCP-TODO] availableTools is not an array', {
      category: 'mcp-todo',
      component: 'mcp-todo',
      type: typeof availableTools
    });
    return null;
  }

  // Extract valid tool names (with server prefix) - filter out invalid entries
  const validToolNames = availableTools
    .filter(t => t && typeof t === 'object' && t.name)
    .map(t => t.name);
  
  // Extract valid server names
  const validServerNames = [...new Set(availableTools
    .filter(t => t && typeof t === 'object' && t.server)
    .map(t => t.server))];

  if (validToolNames.length === 0 || validServerNames.length === 0) {
    this.logger.error('[MCP-TODO] No valid tools found in availableTools', {
      category: 'mcp-todo',
      component: 'mcp-todo',
      totalItems: availableTools.length
    });
    return null;
  }
  // ... продовження
}
```

**Зміни:**
- Додано перевірку `Array.isArray(availableTools)`
- Додано фільтрацію невалідних елементів перед `.map()`
- Додано перевірку що результат не порожній
- Додано детальне логування помилок

### 3. Виправлено небезпечний доступ до toolSchema (mcp-todo-manager.js рядок 1142-1145)

```javascript
// ✅ ПРАВИЛЬНО (після виправлення):
if (toolSchema) {
  requestBody.response_format = {
    type: 'json_schema',
    json_schema: {
      name: 'tool_plan',
      strict: false,
      schema: toolSchema
    }
  };
  
  // FIXED 2025-10-23: Safe access to nested properties
  const toolCount = toolSchema?.properties?.tool_calls?.items?.properties?.tool?.enum?.length || 0;
  this.logger.system('mcp-todo', `[TODO] 🔒 Using JSON Schema with ${toolCount} valid tool names`);
}
```

**Зміни:**
- Використання optional chaining (`?.`) для безпечного доступу
- Fallback на `0` якщо властивість не існує

### 4. Виправлено небезпечний доступ до validation.errors (tetyana-plan-tools-processor.js рядки 165-174)

```javascript
// ❌ НЕПРАВИЛЬНО (до виправлення):
if (!validation.valid) {
  this.logger.warn(`Errors: ${validation.errors.join(', ')}`);
  if (validation.suggestions.length > 0) {
    this.logger.warn(`Suggestions: ${validation.suggestions.join(', ')}`);
  }
}

// ✅ ПРАВИЛЬНО (після виправлення):
if (!validation.valid) {
  // FIXED 2025-10-23: Safe access to validation.errors (may not be array)
  const errors = Array.isArray(validation.errors) ? validation.errors : [validation.errors || 'Unknown error'];
  this.logger.warn(`Errors: ${errors.join(', ')}`);

  // FIXED 2025-10-23: Safe access to validation.suggestions
  const suggestions = Array.isArray(validation.suggestions) ? validation.suggestions : [];
  if (suggestions.length > 0) {
    this.logger.warn(`Suggestions: ${suggestions.join(', ')}`);
  }
}
```

**Зміни:**
- Додано перевірку `Array.isArray()` перед викликом `.join()`
- Fallback на порожній масив або масив з одним елементом
- Використання локальних змінних для безпечного доступу

### 5. Перевірено інші validators

**SchemaValidator** (`/orchestrator/ai/validation/schema-validator.js`) - ✅ OK:
- Рядки 65-75: правильно обробляє відсутність server
- Використовує `warnings.push()` + `continue`

**MCPSyncValidator** (`/orchestrator/ai/validation/mcp-sync-validator.js`) - ✅ OK:
- Рядки 64-76: правильно обробляє відсутність serverTools
- Використовує `errors.push()` + `continue`

## Архітектура валідації

### ValidationPipeline (NEW 2025-10-23)

Багаторівнева валідація з early rejection:

```
1. FormatValidator (CRITICAL, ~1ms)
2. HistoryValidator (NON-CRITICAL, ~5ms) 
3. SchemaValidator (CRITICAL, ~10ms)  ← Тут була проблема
4. MCPSyncValidator (CRITICAL, ~100ms)
5. LLMValidator (NON-CRITICAL, ~500ms)
```

**Early Rejection:** Якщо CRITICAL stage failed → зупинка виконання

### Правильна робота з {{AVAILABLE_TOOLS}}

MCP промпти містять placeholder `{{AVAILABLE_TOOLS}}` який заміняється:

1. **mcpManager.getDetailedToolsSummary(serverNames)** генерує:
   - Список tools з сервера
   - Детальні параметри (required/optional)
   - Типи параметрів
   - Приклади викликів

2. **mcp-todo-manager.js** підставляє у промпт (рядок 1080):
   ```javascript
   systemPrompt = systemPrompt.replace('{{AVAILABLE_TOOLS}}', toolsSummary);
   ```

3. **LLM отримує РЕАЛЬНИЙ список інструментів** з параметрами

## Тестування

Для перевірки виправлення використати те саме завдання:

```
Відкрий калькулятор. Помнож 7 на 139. Відніми від отриманого результату 85, 
потім додай 27. Округли фінальний результат до двох знаків після коми. 
Збережи цей результат у файл result_calc.txt у /Users/dev/Documents/GitHub/atlas4/data.
```

**Очікуваний результат:**
- ✅ Валідація проходить успішно
- ✅ Tetyana планує інструменти (applescript + filesystem)
- ✅ Виконання без crashes

## Файли змінено

1. `/orchestrator/ai/mcp-manager.js` - рядок 1005 (додано безумовний continue)
2. `/orchestrator/workflow/mcp-todo-manager.js` - рядки 2805-2831 (додано валідацію структури в _buildToolCallsSchema)
3. `/orchestrator/workflow/mcp-todo-manager.js` - рядки 1142-1145 (безпечний доступ до toolSchema)
4. `/orchestrator/workflow/stages/tetyana-plan-tools-processor.js` - рядки 165-174 (безпечний доступ до validation.errors та validation.suggestions)

## Версії компонентів

- **ValidationPipeline**: v1.0.0 (2025-10-23)
- **SchemaValidator**: v1.0.0 (2025-10-23)
- **MCPSyncValidator**: v1.0.0 (2025-10-23)
- **MCPManager**: v4.0.0 → v4.0.1 (виправлено validateToolCalls)

## Висновок

Виправлено **4 критичні помилки** які виникли після рефакторингу валідації:

1. **mcp-manager.js** - логічна помилка з умовним `continue`
2. **mcp-todo-manager.js (_buildToolCallsSchema)** - відсутність валідації структури даних
3. **mcp-todo-manager.js (logging)** - небезпечний доступ до вкладених властивостей
4. **tetyana-plan-tools-processor.js** - небезпечний доступ до validation.errors.join()

Всі виправлення додають:
- ✅ Перевірки типів даних
- ✅ Валідацію структури об'єктів
- ✅ Безпечний доступ до властивостей (optional chaining)
- ✅ Детальне логування помилок
- ✅ Graceful degradation (повернення `null` замість crash)

Інші validators у ValidationPipeline правильно обробляють edge cases і не мають таких проблем.
