# MCP Retry Configuration Fix - 2025-10-18

## Проблема

З логів оркестратора виявлено наступні проблеми:

1. **Hardcoded кількість спроб**: У коді було жорстко закодовано значення `maxAttempts = 3` та `threshold = 3`
2. **Відсутність конфігурації**: Користувач не міг налаштувати кількість спроб через конфіг
3. **Занадто багато повторних спроб**: За замовчуванням система робила 3 спроби, що призводило до довгих очікувань при помилках
4. **Проблеми з tool planning**: LLM іноді не генерував tool calls, що призводило до помилок "No tool calls generated - plan is empty"

## Виправлення

### 1. Додано конфігурацію retry параметрів (global-config.js)

```javascript
retry: {
  get maxAttempts() { return parseInt(process.env.MCP_MAX_ATTEMPTS || '1', 10); },
  get timeoutMs() { return parseInt(process.env.MCP_TIMEOUT_MS || '30000', 10); },
  get exponentialBackoff() { return process.env.MCP_EXPONENTIAL_BACKOFF !== 'false'; },
  
  // Окремі налаштування для різних типів операцій
  itemExecution: {
    get maxAttempts() { return parseInt(process.env.MCP_ITEM_MAX_ATTEMPTS || '1', 10); }
  },
  
  circuitBreaker: {
    get threshold() { return parseInt(process.env.MCP_CIRCUIT_BREAKER_THRESHOLD || '3', 10); },
    get resetTimeout() { return parseInt(process.env.MCP_CIRCUIT_BREAKER_RESET_MS || '60000', 10); }
  }
}
```

### 2. Оновлено файли для використання конфігу

#### `orchestrator/workflow/executor-v3.js`
- **До**: `const mcpCircuitBreaker = new CircuitBreaker(3, 60000);`
- **Після**: 
```javascript
const mcpCircuitBreaker = new CircuitBreaker(
  GlobalConfig.AI_BACKEND_CONFIG.retry.circuitBreaker.threshold,
  GlobalConfig.AI_BACKEND_CONFIG.retry.circuitBreaker.resetTimeout
);
```

- **До**: `const maxAttempts = item.max_attempts || 3;`
- **Після**: `const maxAttempts = item.max_attempts || GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts;`

#### `orchestrator/workflow/mcp-todo-manager.js`
- **До**: `newItem.max_attempts = newItem.max_attempts || 3;`
- **Після**: `newItem.max_attempts = newItem.max_attempts || GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts;`

#### `orchestrator/workflow/stages/grisha-verify-item-processor.js`
- **До**: `const maxAttempts = item.max_attempts || 3;`
- **Після**: `const maxAttempts = item.max_attempts || GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts;`
- Додано імпорт: `import GlobalConfig from '../../../config/global-config.js';`

### 3. Додано ENV змінні (.env.example)

```bash
# === MCP RETRY CONFIGURATION (NEW 18.10.2025) ===
# Maximum number of retry attempts for MCP operations
# Default: 1 (changed from 3 to reduce unnecessary retries)
MCP_MAX_ATTEMPTS=1

# Maximum retry attempts specifically for TODO item execution
# Default: 1 (each TODO item will be attempted once)
MCP_ITEM_MAX_ATTEMPTS=1

# Circuit breaker threshold (failures before opening circuit)
# Default: 3 (after 3 consecutive failures, circuit opens)
MCP_CIRCUIT_BREAKER_THRESHOLD=3

# Circuit breaker reset timeout in milliseconds
# Default: 60000 (60 seconds before attempting to close circuit)
MCP_CIRCUIT_BREAKER_RESET_MS=60000

# MCP operation timeout in milliseconds
# Default: 30000 (30 seconds per operation)
MCP_TIMEOUT_MS=30000

# Enable/disable exponential backoff for retries
# Default: true (enabled)
MCP_EXPONENTIAL_BACKOFF=true
```

### 4. Перевірено API endpoints

Всі стаджі правильно використовують API endpoint з порта 4000:
- ✅ `mode-selection-processor.js` - `http://localhost:4000/v1/chat/completions`
- ✅ `atlas-replan-todo-processor.js` - використовує `GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint`
- ✅ `grisha-verify-item-processor.js` - `http://localhost:4000/v1/chat/completions`
- ✅ `mcp-todo-manager.js` - використовує `GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint`
- ✅ Всі процесори мають fallback на `http://localhost:4000/v1/chat/completions`

## Результати

### Переваги:
1. **Гнучкість**: Користувач може налаштувати кількість спроб через ENV змінні
2. **Швидкість**: За замовчуванням 1 спроба замість 3 - швидше fail-fast поведінка
3. **Консистентність**: Всі місця використовують єдину конфігурацію
4. **Прозорість**: Всі параметри документовані в .env.example

### Зміни в поведінці:
- **До**: Кожен TODO item намагався виконатись 3 рази (по дефолту)
- **Після**: Кожен TODO item намагається виконатись 1 раз (по дефолту)
- **Налаштування**: Можна змінити через `MCP_ITEM_MAX_ATTEMPTS=3` в .env файлі

### Додаткові можливості:
- Circuit breaker threshold: налаштовується через `MCP_CIRCUIT_BREAKER_THRESHOLD`
- Timeout для операцій: налаштовується через `MCP_TIMEOUT_MS`
- Exponential backoff: можна вимкнути через `MCP_EXPONENTIAL_BACKOFF=false`

## Проблеми з tool planning (частково вирішено)

Виявлено що помилки "No tool calls generated" виникають коли:
1. LLM не генерує JSON відповідь
2. LLM генерує JSON з порожнім масивом `tool_calls: []`
3. LLM не розуміє доступні інструменти з `{{AVAILABLE_TOOLS}}`

Існуючі механізми захисту:
- ✅ JSON sanitization в `_parseToolPlan()`
- ✅ Aggressive JSON extraction (видалення `<think>` tags, markdown)
- ✅ Validation tools проти доступних MCP серверів
- ✅ Спеціалізовані промпти для різних MCP серверів (playwright, filesystem, etc)

Рекомендації для подальшого покращення:
1. Додати більш детальне логування відповідей LLM
2. Покращити промпт для гарантування генерації хоча б одного tool call
3. Додати fallback стратегію якщо LLM не може згенерувати plan

## Файли змінені

1. `config/global-config.js` - додано retry конфігурацію
2. `orchestrator/workflow/executor-v3.js` - використання конфігу
3. `orchestrator/workflow/mcp-todo-manager.js` - використання конфігу
4. `orchestrator/workflow/stages/grisha-verify-item-processor.js` - використання конфігу
5. `.env.example` - додано ENV змінні з документацією

## Тестування

Для тестування нових налаштувань:

```bash
# Встановити 3 спроби (старий режим)
export MCP_ITEM_MAX_ATTEMPTS=3

# Встановити 1 спробу (новий режим, за замовчуванням)
export MCP_ITEM_MAX_ATTEMPTS=1

# Вимкнути exponential backoff
export MCP_EXPONENTIAL_BACKOFF=false

# Перезапустити оркестратор
npm run orchestrator
```

## Дата виправлення
2025-10-18

## Автор
Atlas System (Cascade AI)
