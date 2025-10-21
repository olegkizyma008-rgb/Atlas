# LLM Tool Validator Configuration

## Огляд

LLM Tool Validator - це система валідації tool calls перед виконанням, яка використовує LLM для перевірки безпеки, релевантності та коректності параметрів.

**Статус:** ✅ АКТИВНИЙ (завжди працює, якщо є LLM client)

---

## Конфігурація

### Environment Variables (.env)

```bash
# === MCP LLM CONFIGURATION ===
# LLM model for MCP Tool Validator (safety and validation)
MCP_LLM_MODEL=atlas-gpt-4o-mini

# Temperature for LLM Tool Validator (0.0-1.0)
MCP_LLM_TEMPERATURE=0.1

# === SECURITY CONFIGURATION ===
# Enable/disable LLM Tool Validator
SECURITY_LLM_VALIDATOR_ENABLED=true

# Fallback behavior when validation fails: 'allow' | 'deny'
SECURITY_VALIDATOR_FALLBACK=allow

# Repetition checking
SECURITY_REPETITION_CHECK_ENABLED=true
SECURITY_MAX_CONSECUTIVE_REPETITIONS=3
SECURITY_MAX_TOTAL_CALLS=10

# Auto-blocking
SECURITY_AUTO_BLOCK_CRITICAL=true
SECURITY_AUTO_BLOCK_HIGH=true
SECURITY_WARN_ON_MEDIUM=true

# Logging
SECURITY_LOG_ALL_VALIDATIONS=false
SECURITY_VERBOSE_BLOCKING=true

# Tool history
SECURITY_TOOL_HISTORY_ENABLED=true
SECURITY_HISTORY_MAX_SIZE=100
SECURITY_HISTORY_CONTEXT_SIZE=5
```

### Security Config File (`config/security-config.js`)

**Централізований файл для всіх налаштувань безпеки:**

```javascript
import SecurityConfig from '../../config/security-config.js';

// Доступні конфігурації:
SecurityConfig.LLM_VALIDATOR_CONFIG      // Налаштування LLM валідатора
SecurityConfig.REPETITION_CONFIG         // Налаштування repetition inspector
SecurityConfig.DANGEROUS_PATTERNS        // Патерни небезпечних команд
SecurityConfig.ALLOWED_OPERATIONS        // Whitelist безпечних операцій
SecurityConfig.RISK_ASSESSMENT           // Налаштування оцінки ризиків
SecurityConfig.TOOL_HISTORY_CONFIG       // Налаштування історії

// Утилітарні функції:
SecurityConfig.checkCommandSafety(cmd)   // Перевірка команди
SecurityConfig.checkPathSafety(path)     // Перевірка шляху
SecurityConfig.getSecurityStats()        // Статистика безпеки
```

### Доступні моделі

| Модель | Швидкість | Точність | Вартість | Рекомендація |
|--------|-----------|----------|----------|--------------|
| **atlas-gpt-4o-mini** | ⚡⚡⚡ Швидка | ✅✅✅ Висока | 💰 Низька | ✅ **Рекомендовано** |
| atlas-ministral-3b | ⚡⚡⚡⚡ Дуже швидка | ✅✅ Середня | 💰 Дуже низька | Для простих перевірок |
| atlas-mistral-small-2503 | ⚡⚡ Середня | ✅✅✅ Висока | 💰💰 Середня | Для складних випадків |

**За замовчуванням:** `atlas-gpt-4o-mini` - оптимальний баланс швидкості, точності та вартості.

---

## Що перевіряє валідатор

### Двоетапна валідація

**STEP 1: Pre-validation (Pattern Matching)** - Швидка перевірка
- Перевіряє команди за regex патернами
- Перевіряє шляхи за whitelist/blacklist
- Блокує критичні операції НЕГАЙНО
- ~1-2ms overhead

**STEP 2: LLM Validation** - Детальний аналіз
- Семантичний аналіз намірів
- Контекстна валідація параметрів
- Reasoning для складних випадків
- ~500ms overhead

### 1. **Safety (Безпека)**

Перевіряє на небезпечні операції:
- ❌ Destructive commands: `rm -rf /`, `delete`, `drop database`
- ❌ System files: `/etc/passwd`, `/System`, `/Library`
- ❌ Unauthorized access: спроби доступу до захищених ресурсів
- ❌ Code injection: небезпечні параметри в командах

**Налаштовується в `config/security-config.js`:**
- `DANGEROUS_PATTERNS.criticalCommands` - критичні команди (ЗАВЖДИ блокувати)
- `DANGEROUS_PATTERNS.highRiskCommands` - високоризикові команди
- `DANGEROUS_PATTERNS.criticalPaths` - критичні шляхи
- `ALLOWED_OPERATIONS.allowedWritePaths` - дозволені директорії

### 2. **Relevance (Релевантність)**

Перевіряє відповідність user intent:
- ✅ Чи tool call відповідає завданню користувача?
- ✅ Чи логічна послідовність викликів?
- ✅ Чи немає зайвих операцій?

### 3. **Parameters (Параметри)**

Перевіряє коректність параметрів:
- ✅ Чи всі обов'язкові параметри присутні?
- ✅ Чи правильний формат параметрів?
- ✅ Чи валідні значення?

### 4. **Risk Assessment (Оцінка ризиків)**

Класифікує ризики:
- 🟢 **none**: Повністю безпечно (read, list)
- 🟡 **low**: Мінімальний ризик (write to user files)
- 🟠 **medium**: Помірний ризик (system commands, network)
- 🔴 **high**: Високий ризик (delete, modify system)
- ⛔ **critical**: БЛОКУВАТИ НЕГАЙНО (destructive operations)

---

## Приклади роботи

### ✅ Приклад 1: Безпечна операція

```javascript
User Intent: "Read config.json file"

Tool Call:
{
  server: 'filesystem',
  tool: 'read_file',
  parameters: { path: '/Users/dev/config.json' }
}

Validation Result:
{
  tool: 'filesystem__read_file',
  valid: true,
  reasoning: 'Safe read operation on user file',
  risk: 'none'
}

→ ✅ ДОЗВОЛЕНО
```

### 🚫 Приклад 2: Небезпечна операція

```javascript
User Intent: "Clean up temporary files"

Tool Call:
{
  server: 'shell',
  tool: 'run_command',
  parameters: { command: 'rm -rf /' }
}

Validation Result:
{
  tool: 'shell__run_command',
  valid: false,
  reasoning: 'Command "rm -rf /" will delete entire system',
  risk: 'critical',
  suggestion: 'Use specific path like "rm -rf /tmp/myapp/*"'
}

→ 🚫 ЗАБЛОКОВАНО
```

### ⚠️ Приклад 3: Підозріла операція

```javascript
User Intent: "Read my documents"

Tool Call:
{
  server: 'filesystem',
  tool: 'read_file',
  parameters: { path: '/etc/passwd' }
}

Validation Result:
{
  tool: 'filesystem__read_file',
  valid: false,
  reasoning: 'Attempting to read system password file - security risk',
  risk: 'high',
  suggestion: 'Read files from /Users/dev/Documents instead'
}

→ 🚫 ЗАБЛОКОВАНО
```

---

## Інтеграція в workflow

```
Stage 2.2: Tetyana Execute Tools

STEP 1: RepetitionInspector
├─► Перевіряє loops (consecutive × 4)
└─► Якщо loop → DENY

STEP 2: LLMToolValidator ✅ ЗАВЖДИ АКТИВНИЙ
├─► Валідує безпеку кожного tool call
├─► Перевіряє parameters
├─► Оцінює ризики
└─► Якщо high/critical → BLOCK

STEP 3: Execution
└─► Тільки якщо пройшли ВСІ перевірки

STEP 4: History Recording
└─► Запис результатів
```

---

## Статистика

Валідатор збирає детальну статистику:

```javascript
const stats = tetyanaToolSystem.getValidatorStatistics();

{
  totalValidations: 127,
  blocked: 3,
  approved: 119,
  warnings: 5,
  blockRate: '2.36%',
  approvalRate: '93.70%'
}
```

---

## Performance

- **Overhead:** ~500ms на валідацію (LLM виклик)
- **Паралелізація:** Валідує всі tool calls одним запитом
- **Fallback:** При помилці валідації - дозволяє з попередженням

---

## Налаштування температури

| Temperature | Поведінка | Використання |
|-------------|-----------|--------------|
| **0.0-0.1** | Максимально консервативна | ✅ **Рекомендовано** для production |
| 0.2-0.3 | Збалансована | Для розробки |
| 0.4+ | Більш ліберальна | Не рекомендується |

**За замовчуванням:** `0.1` - забезпечує стабільну та передбачувану валідацію.

---

## Вимкнення валідатора

Якщо потрібно вимкнути LLM валідацію (не рекомендується):

```javascript
// В service-registry.js
const llmClient = null;  // Не створювати LLM client
return new TetyanaToolSystem(mcpManager, llmClient);
```

**Увага:** Без LLM валідації система втрачає захист від небезпечних операцій!

---

## Estimated Impact

- ✅ **90%+ блокування** небезпечних операцій
- ✅ **Семантична валідація** параметрів через LLM reasoning
- ✅ **Детальні пояснення** чому tool call заблоковано
- ✅ **Suggestions** для виправлення проблем

---

## Налаштування безпечних операцій

### Додати нову безпечну команду

**Файл:** `config/security-config.js`

```javascript
// Додати до ALLOWED_OPERATIONS.safeReadOperations
safeReadOperations: [
  'read_file',
  'list_directory',
  'my_custom_read_operation'  // ← Додати тут
]
```

### Додати новий небезпечний патерн

```javascript
// Додати до DANGEROUS_PATTERNS.criticalCommands
criticalCommands: [
  /rm\s+-rf\s+\//,
  /my-dangerous-command/  // ← Додати тут
]
```

### Додати дозволену директорію для write

```javascript
// Додати до ALLOWED_OPERATIONS.allowedWritePaths
allowedWritePaths: [
  /^\/Users\/dev\/Desktop/,
  /^\/my\/custom\/path/  // ← Додати тут
]
```

---

## Troubleshooting

### Проблема: Валідація занадто строга

**Рішення 1:** Збільшити temperature
```bash
MCP_LLM_TEMPERATURE=0.2
```

**Рішення 2:** Вимкнути auto-block для high risk
```bash
SECURITY_AUTO_BLOCK_HIGH=false
```

### Проблема: Валідація занадто повільна

**Рішення 1:** Використати швидшу модель
```bash
MCP_LLM_MODEL=atlas-ministral-3b
```

**Рішення 2:** Pre-validation блокує більшість (швидко)
- Додати більше патернів в `DANGEROUS_PATTERNS`
- Розширити `ALLOWED_OPERATIONS` whitelist

### Проблема: Валідатор блокує легітимні операції

**Рішення:** Додати в whitelist
```javascript
// config/security-config.js
ALLOWED_OPERATIONS.safeWriteOperations.push('my_safe_operation');
```

### Проблема: Валідатор не працює

**Перевірити:**
1. `SECURITY_LLM_VALIDATOR_ENABLED=true` в .env
2. LLM client правильно налаштований
3. `MCP_LLM_MODEL` доступний
4. Логи: `SECURITY_VERBOSE_BLOCKING=true`

---

## ## Приклад повної конфігурації

```bash
# .env - Повна конфігурація безпеки

# LLM для валідації
MCP_LLM_MODEL=atlas-gpt-4o-mini
MCP_LLM_TEMPERATURE=0.1

# Основні налаштування
SECURITY_LLM_VALIDATOR_ENABLED=true
SECURITY_VALIDATOR_FALLBACK=allow

# Repetition checking
SECURITY_REPETITION_CHECK_ENABLED=true
SECURITY_MAX_CONSECUTIVE_REPETITIONS=3
SECURITY_MAX_TOTAL_CALLS=10

# Auto-blocking (рекомендовано)
SECURITY_AUTO_BLOCK_CRITICAL=true
SECURITY_AUTO_BLOCK_HIGH=true
SECURITY_WARN_ON_MEDIUM=true

# Logging (для production)
SECURITY_LOG_ALL_VALIDATIONS=false
SECURITY_VERBOSE_BLOCKING=true

# Tool history
SECURITY_TOOL_HISTORY_ENABLED=true
SECURITY_HISTORY_MAX_SIZE=100
SECURITY_HISTORY_CONTEXT_SIZE=5
```

---

## Дата оновлення

**Версія:** 2.1.0  
**Дата:** 2025-10-21  
**Статус:** Production Ready ✅

**Зміни в v2.1.0:**
- ✅ Винесено налаштування в `config/security-config.js`
- ✅ Додано pre-validation з pattern matching
- ✅ Конфігуровані dangerous patterns
- ✅ Whitelist для безпечних операцій
- ✅ Детальні environment variables
