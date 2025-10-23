# План рефакторингу системи валідації MCP tools - Частина 2
**Дата**: 2025-10-23  
**Версія**: 1.0  

---

## 🚀 PHASE-BY-PHASE IMPLEMENTATION (продовження)

### PHASE 4: History Validator (2 дні)
**Мета**: Інтеграція історії в pipeline

**Файли**:
1. Створити `/orchestrator/ai/validation/history-validator.js`

**Логіка**:
```javascript
export class HistoryBasedValidator {
  validate(toolCalls, context) {
    const errors = [];
    const warnings = [];
    
    for (const call of toolCalls) {
      // Перевірка 1: Повторення після помилки
      const recentFailure = historyManager.checkRepetitionAfterFailure(
        call, 100
      );
      
      if (recentFailure && recentFailure.count >= 3) {
        errors.push({
          tool: `${call.server}__${call.tool}`,
          reason: `Tool failed ${recentFailure.count} times in last 100 calls`,
          lastError: recentFailure.lastError,
          suggestion: 'Use alternative tool'
        });
      }
      
      // Перевірка 2: Низька успішність (<30%)
      const successRate = historyManager.getToolSuccessRate(
        call.server, call.tool
      );
      
      if (successRate < 0.3 && successRate > 0) {
        warnings.push({
          tool: `${call.server}__${call.tool}`,
          successRate: (successRate * 100).toFixed(0) + '%',
          suggestion: 'Tool may be unreliable'
        });
      }
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}
```

**Deliverables**:
- Захист від повторень (0% після 3 помилок)
- Попередження про ненадійні інструменти

---

### PHASE 5: Schema Validator (2 дні)
**Мета**: Перенести існуючу валідацію в pipeline

**Файли**:
1. Створити `/orchestrator/ai/validation/schema-validator.js`
2. Перенести логіку з `mcp-manager.js:_validateParameters()`

**Функціонал**:
- Валідація через inputSchema
- Перевірка required parameters
- Перевірка типів (string, number, boolean, array, object)
- Перевірка enum values
- Автокорекція назв параметрів (fuzzy matching)

**Deliverables**:
- Повна валідація параметрів
- Автокорекція типових помилок
- Детальні error messages

---

### PHASE 6: MCP Sync Validator (4 дні) ⭐ КРИТИЧНИЙ
**Мета**: Звірка з актуальним tools/list перед виконанням

**Файли**:
1. Створити `/orchestrator/ai/validation/mcp-sync-validator.js`
2. Оновити `/orchestrator/ai/mcp-manager.js` (додати `refreshToolsList()`)

**Ключовий функціонал**:
```javascript
export class MCPSyncValidator {
  constructor(mcpManager) {
    this.mcpManager = mcpManager;
    this.cache = new Map();
    this.cacheTTL = 60000; // 60 секунд
  }
  
  async validate(toolCalls, context) {
    // 1. Отримати СВІЖИЙ tools/list з усіх серверів
    const actualTools = await this._getActualToolsList();
    
    // 2. Для кожного tool call - перевірити чи існує ЗАРАЗ
    for (const call of toolCalls) {
      const serverTools = actualTools.get(call.server);
      const toolExists = serverTools.some(t => t.name === call.tool);
      
      if (!toolExists) {
        // 3. Автокорекція через fuzzy matching з РЕАЛЬНИМИ інструментами
        const realNames = serverTools.map(t => t.name);
        const corrected = this._findSimilar(call.tool, realNames);
        
        if (corrected.similarity > 0.8) {
          call.tool = corrected.name; // АВТОКОРЕКЦІЯ
        } else {
          return { valid: false, error: 'Tool not found in MCP' };
        }
      }
    }
    
    return { valid: true };
  }
  
  async _getActualToolsList() {
    // Запитати tools/list з кешем 60 сек
    // Fallback на кешований список якщо помилка
  }
}
```

**Переваги**:
- ✅ 100% актуальні назви інструментів
- ✅ Автокорекція на основі РЕАЛЬНИХ даних з MCP
- ✅ Захист від застарілих назв

**Deliverables**:
- Робоча звірка з MCP
- Кешування на 60 секунд
- Автокорекція через реальні дані

---

### PHASE 7: LLM Validator Integration (1 день)
**Мета**: Інтегрувати існуючий LLM validator в pipeline

**Файли**:
1. Оновити `/orchestrator/ai/validation/validation-pipeline.js` (додати LLM stage)

**Зміни**:
- Перемістити існуючий `LLMToolValidator` в pipeline як Level 5
- Позначити як NON-CRITICAL (тільки warnings)
- Запускати останнім після всіх інших

**Deliverables**:
- Повний 5-рівневий pipeline

---

### PHASE 8: Static Tool Descriptions (3 дні)
**Мета**: Оптимізувати промпти з повними статичними описами

**Файли для оновлення**:
1. `/prompts/mcp/tetyana_plan_tools_playwright.js`
2. `/prompts/mcp/tetyana_plan_tools_filesystem.js`
3. `/prompts/mcp/tetyana_plan_tools_shell.js`
4. `/prompts/mcp/tetyana_plan_tools_applescript.js`
5. `/prompts/mcp/tetyana_plan_tools_memory.js`

**Формат опису кожного інструменту**:
```javascript
/**
 * tool_name
 * Description: Full description
 * Parameters:
 *   • param1 (type, REQUIRED): Description
 *   • param2 (type, optional) [default: value]: Description
 *     Valid values: enum1, enum2
 * Example: {"server": "...", "tool": "...", "parameters": {...}}
 */
```

**Процес**:
1. Запустити MCP сервер
2. Викликати `tools/list`
3. Взяти РЕАЛЬНІ описи
4. Оптимізувати для LLM (видалити зайве, додати приклади)
5. Записати в промпт

**Переваги**:
- Менше токенів (статичні описи коротші)
- Завжди актуальні (оновлюються вручну при потребі)
- Оптимізовані під LLM

**Deliverables**:
- 5 оновлених промптів з повними описами
- Економія ~30% токенів
- Більша точність LLM

---

### PHASE 9: Integration & Testing (4 дні)
**Мета**: Інтеграція в workflow та тестування

**Day 1-2: Integration**
Файли:
1. Оновити `/orchestrator/workflow/stages/tetyana-plan-tools-processor.js`
2. Оновити `/orchestrator/ai/tetyana-tool-system.js`

Зміни:
```javascript
// tetyana-plan-tools-processor.js

// СТАРИЙ КОД (видалити):
if (this.tetyanaToolSystem) {
  validation = this.tetyanaToolSystem.validateToolCalls(plan.tool_calls);
} else {
  validation = this.mcpManager.validateToolCalls(plan.tool_calls);
}

// НОВИЙ КОД:
const pipeline = new ValidationPipeline(
  this.mcpManager,
  this.historyManager,
  this.llmValidator
);

const validation = await pipeline.validate(plan.tool_calls, {
  itemAction: currentItem.action,
  sessionId: session.id,
  todoId: todo.id
});

// Якщо rejected - повернути детальні помилки
if (!validation.valid) {
  return {
    success: false,
    error: `Validation failed at stage: ${validation.rejectedAt}`,
    validationErrors: validation.errors,
    suggestions: validation.suggestions,
    metadata: { rejectedAt: validation.rejectedAt }
  };
}
```

**Day 3: Unit Tests**
Створити тести для кожного validator:
- `/tests/unit/validation/format-validator.test.js`
- `/tests/unit/validation/history-validator.test.js`
- `/tests/unit/validation/schema-validator.test.js`
- `/tests/unit/validation/mcp-sync-validator.test.js`

**Day 4: Integration Tests**
- Повний цикл валідації
- Early rejection scenarios
- Auto-correction scenarios

**Deliverables**:
- Повна інтеграція в workflow
- 80%+ code coverage
- Документація

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: MCP Registry ✅
- [ ] Створити `/config/mcp-registry.js`
- [ ] Оновити `/config/models-config.js`
- [ ] Оновити `/orchestrator/ai/mcp-manager.js`
- [ ] Знайти та оновити всі імпорти `MCP_SERVERS`
- [ ] Тестування: реєстр працює, всі сервери доступні

### Phase 2: History Manager ✅
- [ ] Розширити `recordExecution()` з лейблами
- [ ] Додати `getRecentFailures()`
- [ ] Додати `checkRepetitionAfterFailure()`
- [ ] Додати `getToolSuccessRate()`
- [ ] Тестування: історія записується, статистика працює

### Phase 3: Pipeline Core ✅
- [ ] Створити `ValidationPipeline` з early rejection
- [ ] Створити `FormatValidator`
- [ ] Створити `validation-config.js`
- [ ] Тестування: pipeline працює, early exit працює

### Phase 4: History Validator ✅
- [ ] Створити `HistoryBasedValidator`
- [ ] Інтеграція в pipeline як Level 2
- [ ] Тестування: повторення блокуються

### Phase 5: Schema Validator ✅
- [ ] Створити `SchemaValidator`
- [ ] Перенести логіку з `mcp-manager.js`
- [ ] Інтеграція в pipeline як Level 3
- [ ] Тестування: параметри валідуються

### Phase 6: MCP Sync Validator ⭐ ✅
- [ ] Створити `MCPSyncValidator`
- [ ] Додати `refreshToolsList()` в MCP Manager
- [ ] Реалізувати кешування (60 сек)
- [ ] Реалізувати автокорекцію через реальні дані
- [ ] Інтеграція в pipeline як Level 4
- [ ] Тестування: звірка працює, автокорекція працює

### Phase 7: LLM Integration ✅
- [ ] Додати LLM validator як Level 5 (NON-CRITICAL)
- [ ] Тестування: весь pipeline працює

### Phase 8: Static Descriptions ✅
- [ ] Оновити `tetyana_plan_tools_playwright.js`
- [ ] Оновити `tetyana_plan_tools_filesystem.js`
- [ ] Оновити `tetyana_plan_tools_shell.js`
- [ ] Оновити `tetyana_plan_tools_applescript.js`
- [ ] Оновити `tetyana_plan_tools_memory.js`
- [ ] Тестування: LLM генерує правильні назви

### Phase 9: Integration & Testing ✅
- [ ] Інтеграція в `tetyana-plan-tools-processor.js`
- [ ] Інтеграція в `tetyana-tool-system.js`
- [ ] Unit tests для всіх validators
- [ ] Integration tests для pipeline
- [ ] E2E тестування
- [ ] Документація + приклади

---

## 🔍 CRITICAL REVIEW QUESTIONS

### 1. Чи всі етапи валідації ПОСЛІДОВНІ?
✅ **ТАК** - Pipeline виконує stages один за одним

### 2. Чи є ранє відсіювання?
✅ **ТАК** - Early exit на CRITICAL помилках

### 3. Чи історія інтегрована в валідацію?
✅ **ТАК** - Level 2 (History Validator)

### 4. Чи є звірка з MCP tools/list?
✅ **ТАК** - Level 4 (MCP Sync Validator) - КРИТИЧНИЙ

### 5. Чи є централізований реєстр?
✅ **ТАК** - `/config/mcp-registry.js`

### 6. Чи описи інструментів оптимізовані?
✅ **ТАК** - Статичні описи в промптах (Phase 8)

### 7. Чи автокорекція використовує реальні дані?
✅ **ТАK** - MCP Sync Validator використовує tools/list

---

## 📊 SUCCESS METRICS

### Технічні метрики:
- **Validation time**: <150ms (early rejection)
- **Auto-correction success**: >85% (через MCP tools/list)
- **First-attempt valid tools**: >95%
- **Repetition after failure**: <5%
- **Execution success rate**: >90%

### Бізнес метрики:
- **User satisfaction**: Менше помилок → краще UX
- **Task completion**: >90% завдань виконуються без помилок
- **Developer time**: Легше додавати нові сервери

---

## 🚨 RISKS & MITIGATION

### Risk 1: MCP Sync Validator повільний
**Mitigation**: 
- Кешування на 60 секунд
- Паралельні запити до серверів
- Fallback на кешований список

### Risk 2: Статичні описи застаріють
**Mitigation**:
- Script для автоматичного оновлення з MCP
- CI/CD перевірка відповідності описів
- Fallback на dynamic generation

### Risk 3: Breaking changes в існуючому коді
**Mitigation**:
- Поетапне впровадження (9 phases)
- Feature flag для нової системи
- Extensive testing

---

## 📚 DOCUMENTATION

### Файли документації:
1. `/docs/VALIDATION_SYSTEM.md` - Архітектура системи валідації
2. `/docs/MCP_REGISTRY.md` - Як додавати нові сервери
3. `/docs/VALIDATION_CONFIG.md` - Конфігурація системи
4. `/docs/TROUBLESHOOTING.md` - Вирішення проблем

### Code comments:
- Кожен validator має JSDoc коментарі
- Pipeline має детальні коментарі по етапах
- Приклади використання в кожному файлі

---

## ✅ FINAL CHECKLIST BEFORE PRODUCTION

- [ ] Всі 9 phases завершені
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass (реальні MCP сервери)
- [ ] Performance tests (validation <150ms)
- [ ] Документація завершена
- [ ] Code review пройдено
- [ ] Feature flag готовий для production
- [ ] Rollback план готовий
- [ ] Monitoring налаштовано (success rate, validation time)

---

## 🎯 EXPECTED OUTCOME

Після рефакторингу система буде:

✅ **Надійна**: 95%+ валідних інструментів з 1-ї спроби  
✅ **Швидка**: <150ms валідація через early rejection  
✅ **Розумна**: Захист від повторень, автокорекція через MCP  
✅ **Масштабована**: Легко додавати нові сервери та validators  
✅ **Підтримувана**: Централізований реєстр, статичні описи  

**Результат**: Майже 100% виконання інструментів без помилок 🎉
