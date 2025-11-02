# Validation System - Usage Guide
**Дата**: 2025-10-23  
**Версія**: 1.0  

---

## 📋 Огляд

Нова система валідації MCP tools складається з 5 рівнів валідації з раннім відсіюванням:

1. **Format Validation** (CRITICAL) - базовий формат
2. **History Validation** (NON-CRITICAL) - захист від повторень
3. **Schema Validation** (CRITICAL) - параметри через inputSchema
4. **MCP Sync Validation** (CRITICAL) - звірка з tools/list ⭐
5. **LLM Validation** (NON-CRITICAL) - семантична перевірка

---

## 🚀 Quick Start

### 1. Базове використання

```javascript
import { ValidationPipeline } from './orchestrator/ai/validation/validation-pipeline.js';
import { FormatValidator } from './orchestrator/ai/validation/format-validator.js';
import { HistoryValidator } from './orchestrator/ai/validation/history-validator.js';
import { SchemaValidator } from './orchestrator/ai/validation/schema-validator.js';
import { MCPSyncValidator } from './orchestrator/ai/validation/mcp-sync-validator.js';

// Створити pipeline
const pipeline = new ValidationPipeline({
  mcpManager,
  historyManager,
  llmValidator  // optional
});

// Зареєструвати validators
pipeline.registerValidator('format', new FormatValidator());
pipeline.registerValidator('history', new HistoryValidator(historyManager));
pipeline.registerValidator('schema', new SchemaValidator(mcpManager));
pipeline.registerValidator('mcpSync', new MCPSyncValidator(mcpManager));

// Валідувати tool calls
const toolCalls = [
  {
    server: 'playwright',
    tool: 'playwright__browser_navigate',
    parameters: { url: 'https://example.com' }
  }
];

const result = await pipeline.validate(toolCalls, {
  itemAction: 'Navigate to website',
  sessionId: 'session_123'
});

if (result.valid) {
  console.log('✅ Validation passed');
  console.log('Corrections applied:', result.corrections.length);
  
  // Використовувати correctedCalls якщо є корекції
  const finalCalls = result.correctedCalls || toolCalls;
  await executeTool(finalCalls[0]);
} else {
  console.log('❌ Validation failed at:', result.rejectedAt);
  console.log('Errors:', result.errors);
  console.log('Suggestions:', result.errors.map(e => e.suggestion).filter(Boolean));
}
```

---

## 📊 Validation Result Structure

```javascript
{
  valid: true,              // Чи пройшла валідація
  toolCalls: [...],         // Оригінальні tool calls
  errors: [],               // Критичні помилки (CRITICAL stages)
  warnings: [],             // Попередження (NON-CRITICAL stages)
  corrections: [],          // Застосовані автокорекції
  rejectedAt: null,         // Назва stage де rejected (якщо failed)
  
  stages: {                 // Результати кожного stage
    format: { valid: true, duration: 1, ... },
    history: { valid: true, duration: 5, ... },
    schema: { valid: true, duration: 10, corrections: [...] },
    mcpSync: { valid: true, duration: 100, corrections: [...] }
  },
  
  metadata: {
    totalDuration: 116,     // Загальний час валідації (ms)
    stagesExecuted: 4,      // Кількість виконаних stages
    earlyRejection: false   // Чи був early exit
  }
}
```

---

## 🔧 Auto-Correction Examples

### Schema Validator - Parameter Name Correction

```javascript
// INPUT (помилка в назві параметру):
{
  server: 'filesystem',
  tool: 'filesystem__write_file',
  parameters: {
    filepath: '/tmp/test.txt',  // ❌ Неправильно
    content: 'Hello'
  }
}

// OUTPUT (автокорекція):
{
  server: 'filesystem',
  tool: 'filesystem__write_file',
  parameters: {
    path: '/tmp/test.txt',      // ✅ Виправлено
    content: 'Hello'
  }
}

// Correction info:
{
  type: 'parameter_renamed',
  from: 'filepath',
  to: 'path',
  stage: 'schema'
}
```

### MCP Sync Validator - Tool Name Correction

```javascript
// INPUT (помилка в назві інструменту):
{
  server: 'playwright',
  tool: 'playwright__navigate',  // ❌ Неправильно
  parameters: { url: 'https://example.com' }
}

// OUTPUT (автокорекція через MCP tools/list):
{
  server: 'playwright',
  tool: 'playwright__browser_navigate',  // ✅ Виправлено
  parameters: { url: 'https://example.com' }
}

// Correction info:
{
  type: 'tool_name_corrected',
  original: 'playwright__navigate',
  corrected: 'playwright__browser_navigate',
  similarity: 0.85,
  source: 'mcp_tools_list',
  stage: 'mcpSync'
}
```

---

## ⚙️ Configuration

### validation-config.js

```javascript
export const VALIDATION_CONFIG = {
  pipeline: {
    enabled: true,
    earlyRejection: true,     // Зупинка на CRITICAL помилках
    logLevel: 'info'
  },
  
  history: {
    maxSize: 1000,            // Розмір історії
    antiRepetitionWindow: 100, // Вікно для перевірки повторень
    maxFailuresBeforeBlock: 3, // Блокування після N помилок
    minSuccessRate: 0.3       // Мінімальна успішність (30%)
  },
  
  mcpSync: {
    cacheTTL: 60000,          // 60 секунд кеш
    autoCorrect: true,        // Автокорекція увімкнена
    similarityThreshold: 0.8, // 80% для корекції
    fallbackToCached: true    // Fallback на кеш
  },
  
  stages: {
    format: { enabled: true, critical: true, timeout: 10 },
    history: { enabled: true, critical: false, timeout: 50 },
    schema: { enabled: true, critical: true, timeout: 100 },
    mcpSync: { enabled: true, critical: true, timeout: 5000 },
    llm: { enabled: true, critical: false, timeout: 10000 }
  }
};
```

### Environment Variables

```bash
# History settings
VALIDATION_HISTORY_MAX_SIZE=1000
VALIDATION_ANTI_REPETITION_WINDOW=100
VALIDATION_MAX_FAILURES_BEFORE_BLOCK=3
VALIDATION_MIN_SUCCESS_RATE=0.3

# MCP Sync settings
VALIDATION_MCP_CACHE_TTL=60000
VALIDATION_SIMILARITY_THRESHOLD=0.8
```

---

## 🎯 Integration Examples

### Інтеграція в TetyanaToolSystem

```javascript
// orchestrator/ai/tetyana-tool-system.js

import { ValidationPipeline } from './validation/validation-pipeline.js';
import { FormatValidator } from './validation/format-validator.js';
import { HistoryValidator } from './validation/history-validator.js';
import { SchemaValidator } from './validation/schema-validator.js';
import { MCPSyncValidator } from './validation/mcp-sync-validator.js';

export class TetyanaToolSystem {
  constructor(mcpManager, llmClient) {
    this.mcpManager = mcpManager;
    this.llmClient = llmClient;
    this.historyManager = new ToolHistoryManager();
    
    // Створити validation pipeline
    this.validationPipeline = new ValidationPipeline({
      mcpManager: this.mcpManager,
      historyManager: this.historyManager,
      llmValidator: null  // Додати пізніше
    });
    
    // Зареєструвати validators
    this._registerValidators();
  }
  
  _registerValidators() {
    this.validationPipeline.registerValidator('format', 
      new FormatValidator());
    
    this.validationPipeline.registerValidator('history', 
      new HistoryValidator(this.historyManager));
    
    this.validationPipeline.registerValidator('schema', 
      new SchemaValidator(this.mcpManager));
    
    this.validationPipeline.registerValidator('mcpSync', 
      new MCPSyncValidator(this.mcpManager));
  }
  
  async validateToolCalls(toolCalls, context = {}) {
    const result = await this.validationPipeline.validate(toolCalls, context);
    
    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors,
        suggestions: this._generateSuggestions(result)
      };
    }
    
    return {
      valid: true,
      toolCalls: result.correctedCalls || toolCalls,
      corrections: result.corrections,
      warnings: result.warnings
    };
  }
  
  async executeToolCalls(toolCalls, context = {}) {
    // 1. Валідація
    const validation = await this.validateToolCalls(toolCalls, context);
    
    if (!validation.valid) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors
      };
    }
    
    // 2. Виконання
    const results = [];
    for (const call of validation.toolCalls) {
      const startTime = Date.now();
      
      try {
        const result = await this.mcpManager.executeTool(
          call.server,
          call.tool.split('__')[1],  // Remove prefix
          call.parameters
        );
        
        const duration = Date.now() - startTime;
        
        // Записати в історію
        this.historyManager.recordExecution(call, {
          success: true,
          duration,
          sessionId: context.sessionId
        });
        
        results.push({ success: true, result });
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Записати помилку в історію
        this.historyManager.recordExecution(call, {
          success: false,
          error: error.message,
          duration,
          sessionId: context.sessionId
        });
        
        results.push({ success: false, error: error.message });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results,
      corrections: validation.corrections,
      warnings: validation.warnings
    };
  }
}
```

---

## 📈 Metrics & Monitoring

### Get Pipeline Metrics

```javascript
const metrics = pipeline.getMetrics();

console.log('Total validations:', metrics.totalValidations);
console.log('Success rate:', (metrics.successRate * 100).toFixed(1) + '%');
console.log('Avg duration:', metrics.avgDuration + 'ms');

// Stage-specific metrics
for (const [stage, stats] of Object.entries(metrics.stageMetrics)) {
  console.log(`${stage}:`, {
    calls: stats.calls,
    successRate: (stats.successes / stats.calls * 100).toFixed(1) + '%',
    avgDuration: stats.avgDuration + 'ms'
  });
}
```

### Get Pipeline Status

```javascript
const status = pipeline.getStatus();

console.log('Pipeline enabled:', status.enabled);
console.log('Early rejection:', status.earlyRejection);
console.log('Total stages:', status.totalStages);
console.log('Registered validators:', status.registeredValidators);

// Check which validators are registered
status.stages.forEach(stage => {
  console.log(`${stage.name}: ${stage.registered ? '✅' : '❌'} (${stage.critical ? 'CRITICAL' : 'NON-CRITICAL'})`);
});
```

---

## 🐛 Troubleshooting

### Validation завжди fails на format stage

**Проблема**: Tool names не мають формат `server__tool`

**Рішення**: Перевірте що tool names містять подвійне підкреслення:
```javascript
// ❌ Неправильно
{ server: 'playwright', tool: 'browser_navigate' }

// ✅ Правильно
{ server: 'playwright', tool: 'playwright__browser_navigate' }
```

### MCP Sync Validator повільний

**Проблема**: Кожна валідація викликає tools/list

**Рішення**: Перевірте що кеш працює (TTL = 60 секунд):
```javascript
const stats = mcpSyncValidator.getStats();
console.log('Cache size:', stats.cacheSize);
console.log('Cache TTL:', stats.cacheTTL);

// Очистити кеш якщо потрібно
mcpSyncValidator.clearCache();
```

### History Validator блокує всі tool calls

**Проблема**: `maxFailuresBeforeBlock` занадто низький

**Рішення**: Збільште threshold в конфігурації:
```javascript
VALIDATION_CONFIG.history.maxFailuresBeforeBlock = 5;  // Замість 3
```

### Auto-correction не працює

**Проблема**: `similarityThreshold` занадто високий

**Рішення**: Зменште threshold:
```javascript
VALIDATION_CONFIG.mcpSync.similarityThreshold = 0.7;  // Замість 0.8
```

---

## 📚 API Reference

### ValidationPipeline

#### `constructor(options)`
- `options.mcpManager` - MCP Manager instance
- `options.historyManager` - Tool History Manager instance
- `options.llmValidator` - LLM Validator instance (optional)

#### `registerValidator(stageName, validator)`
Реєструє validator для stage

#### `async validate(toolCalls, context)`
Валідує tool calls через pipeline

**Returns**: `{ valid, errors, warnings, corrections, ... }`

#### `getMetrics()`
Повертає метрики валідації

#### `getStatus()`
Повертає статус pipeline

---

## 🎓 Best Practices

1. **Завжди перевіряйте result.valid** перед виконанням
2. **Використовуйте correctedCalls** якщо є корекції
3. **Логуйте warnings** для моніторингу
4. **Записуйте результати в history** після виконання
5. **Моніторте metrics** для оптимізації

---

## 🔗 Related Files

- `/config/validation-config.js` - Конфігурація
- `/orchestrator/ai/validation/validation-pipeline.js` - Pipeline
- `/orchestrator/ai/validation/format-validator.js` - Level 1
- `/orchestrator/ai/validation/history-validator.js` - Level 2
- `/orchestrator/ai/validation/schema-validator.js` - Level 3
- `/orchestrator/ai/validation/mcp-sync-validator.js` - Level 4 ⭐
- `/orchestrator/ai/tool-history-manager.js` - History Manager
