# TODO JSON Parse Fix - 2025-10-18

## Проблема

```
18:02:52[SYSTEM]❌ MCP: TODO planning failed: TODO creation failed: Failed to parse TODO response: Expected ',' or '}' after property value in JSON at position 2198 (line 63 column 22)
```

LLM генерував JSON з синтаксичними помилками (trailing commas, невалідні символи), але метод `_parseTodoResponse` не використовував sanitization, на відміну від інших методів парсингу.

## Виправлення

### Додано агресивну обробку JSON в `_parseTodoResponse`

Метод тепер використовує ту ж логіку що й `_parseToolPlan`:

1. **Aggressive JSON extraction** - витягує JSON між першою `{` та останньою `}`
2. **Sanitization fallback** - якщо парсинг не вдається, використовує `_sanitizeJsonString()`
3. **Детальне логування** - показує де саме виникла помилка

### Код до:
```javascript
_parseTodoResponse(response, request) {
  try {
    let cleanResponse = response;
    if (typeof cleanResponse === 'string') {
      cleanResponse = cleanResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      cleanResponse = cleanResponse.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    const parsed = JSON.parse(cleanResponse); // ❌ Падає на trailing commas
```

### Код після:
```javascript
_parseTodoResponse(response, request) {
  try {
    let cleanResponse = response;
    if (typeof cleanResponse === 'string') {
      // Step 1: Remove markdown wrappers
      cleanResponse = cleanResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      // Step 2: Remove JS-style comments
      cleanResponse = cleanResponse.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Step 3: Aggressive JSON extraction - find first { to last }
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
      } else {
        throw new Error('No JSON object found in response (no curly braces)');
      }
    }
    
    let parsed;
    try {
      parsed = JSON.parse(cleanResponse);
    } catch (parseError) {
      // ✅ Use sanitization on parse errors
      this.logger.warn(`[MCP-TODO] Initial TODO JSON parse failed: ${parseError.message}. Attempting sanitization...`);
      
      try {
        const sanitized = this._sanitizeJsonString(cleanResponse);
        parsed = JSON.parse(sanitized);
        this.logger.warn('[MCP-TODO] ✅ TODO JSON sanitization successful');
      } catch (sanitizedError) {
        this.logger.error(`[MCP-TODO] ❌ TODO JSON sanitization also failed`);
        throw sanitizedError;
      }
    }
```

### Також виправлено hardcoded max_attempts

```javascript
// До:
max_attempts: 3,

// Після:
// UPDATED 18.10.2025: Use config for default max attempts
max_attempts: GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts,
```

## Що робить `_sanitizeJsonString`

1. Видаляє trailing commas: `{"key": "value",}` → `{"key": "value"}`
2. Виправляє одинарні лапки: `{'key': 'value'}` → `{"key": "value"}`
3. Видаляє коментарі: `{"key": "value" /* comment */}` → `{"key": "value"}`
4. Виправляє інші типові помилки LLM

## Результат

Тепер `_parseTodoResponse` має той самий рівень захисту що й інші методи парсингу:
- ✅ `_parseToolPlan` - має sanitization
- ✅ `_parseVerification` - має sanitization  
- ✅ `_parseAdjustment` - має sanitization
- ✅ `_parseTodoResponse` - **тепер теж має sanitization** (FIXED)

## Файли змінені

- `orchestrator/workflow/mcp-todo-manager.js` - додано aggressive JSON extraction та sanitization fallback

## Тестування

Система тепер має обробляти:
- Trailing commas в JSON
- Одинарні лапки замість подвійних
- Коментарі в JSON
- Текст до/після JSON об'єкта
- Markdown wrappers

## Дата виправлення
2025-10-18 18:07

## Автор
Atlas System (Cascade AI)
