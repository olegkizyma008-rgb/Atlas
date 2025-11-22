# 🚀 Workflow Архітектури - Quick Reference

**Дата**: 22 листопада 2025

---

## 📍 Де Знаходиться Код?

### Основні Файли Workflow

```
orchestrator/
├── workflow/
│   ├── executor-v3.js ⭐ ОСНОВНИЙ ВОРКФЛОУ (967 рядків)
│   ├── mcp-todo-manager.js ⭐ МОНОЛІТНИЙ МЕНЕДЖЕР (3944 рядків)
│   ├── state-machine/ ❌ НЕВИКОРИСТАНИЙ
│   ├── modes/ ❌ НЕВИКОРИСТАНІ
│   ├── execution/ (tool-executor, mcp-executor)
│   ├── stages/ (18 процесорів)
│   ├── core/ (todo-builder, todo-executor, workflow-engine)
│   └── hybrid/ ❌ НЕВИКОРИСТАНИЙ
├── core/
│   ├── service-registry.js (900+ рядків, 100+ сервісів)
│   ├── di-container.js
│   └── application.js
└── ai/
    ├── mcp-manager.js
    └── optimized-workflow-manager.js ❌ НЕВИКОРИСТАНИЙ
```

---

## 🔄 Як Працює Workflow?

### 1. Запуск (chat.routes.js)
```javascript
app.post('/chat/stream', async (req, res) => {
  const { message } = req.body;
  
  // Викликає executor-v3.js
  const result = await executeWorkflow({
    userMessage: message,
    session,
    container,
    wsManager,
    res
  });
});
```

### 2. Основний Workflow (executor-v3.js)
```javascript
export async function executeWorkflow(workflowContext) {
  // Stage 0: Mode Selection
  // Stage 0.5: Context Enrichment
  // Stage 1: TODO Planning
  // Stage 2.0: Server Selection
  // Stage 2.1: Tetyana Plan Tools
  // Stage 2.2: Tetyana Execute Tools
  // Stage 2.3: Grisha Verify Item
  // Stage 3.x: Replan / Deep Analysis
  // Stage 8: Final Summary
}
```

### 3. TODO Менеджер (mcp-todo-manager.js)
```javascript
class MCPTodoManager {
  async execute(userMessage, session) {
    // Планування TODO
    // Виконання TODO
    // Верифікація результатів
  }
}
```

---

## 🔴 TOP 5 ПРОБЛЕМ

| #   | Проблема                            | Файл                                                               | Дія                         |
| --- | ----------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| 1   | 4 executor реалізації               | executor-v3, mcp-todo-manager, optimized-executor, hybrid-executor | Видалити optimized & hybrid |
| 2   | Невикористовувані компоненти в DI   | service-registry.js                                                | Видалити реєстрації         |
| 3   | Дублювання логування (649 операцій) | 47 файлів                                                          | Створити LoggingMiddleware  |
| 4   | Монолітна структура (3944 рядків)   | mcp-todo-manager.js                                                | Розділити на модулі         |
| 5   | 0% покриття тестами                 | tests/                                                             | Додати unit тести           |

---

## 📋 ПЛАН ДІЙ (4-6 тижнів)

### Тиждень 1: Консолідація
- [ ] Видалити `optimized-executor.js`
- [ ] Видалити `hybrid-executor.js`
- [ ] Видалити DI реєстрації невикористовуваних компонентів
- [ ] Видалити закоментований код

### Тиждень 2-3: Рефакторинг
- [ ] Розділити MCPTodoManager на модулі (Planner, Executor, Verifier)
- [ ] Видалити дублювання з executor-v3.js
- [ ] Централізувати логування
- [ ] Додати unit тести

### Тиждень 4+: Оптимізація
- [ ] Інтегрувати HybridExecutor для паралельного виконання
- [ ] Додати кешування результатів
- [ ] Оновити документацію

---

## 🎯 МЕТРИКИ

### Поточні Метрики
- Executor реалізацій: **4** (мають бути 1)
- Невикористовувані компоненти: **10+** (мають бути 0)
- MCPTodoManager: **3944 рядків** (має бути 200)
- executor-v3: **967 рядків** (має бути 200)
- Дублювання логування: **649 операцій** (має бути 0)
- Покриття тестами: **0%** (має бути 60%+)

---

## 📚 ДОКУМЕНТАЦІЯ

### Створена Документація
1. **WORKFLOW_ARCHITECTURE_ANALYSIS.md** - Повний аналіз (10 проблем)
2. **WORKFLOW_REFACTORING_ACTION_PLAN.md** - Детальний план дій (3 фази)
3. **WORKFLOW_ISSUES_SUMMARY.md** - Короткий огляд (TOP 10)
4. **WORKFLOW_QUICK_REFERENCE.md** - Цей файл

### Посилання на Поточну Документацію
- `/docs/` - Поточна документація
- `/archive/docs/` - Архів документації
- `/orchestrator/workflow/` - Workflow файли

---

## 🔍 ЯК ЗНАЙТИ КОД?

### Пошук за функціональністю

**Планування TODO**
```bash
grep -r "planTools\|generateItems" orchestrator/workflow/
# Файли: mcp-todo-manager.js, atlas-todo-planning-processor.js
```

**Виконання TODO**
```bash
grep -r "executeTools\|executeItem" orchestrator/workflow/
# Файли: mcp-todo-manager.js, tetyana-execute-tools-processor.js
```

**Верифікація**
```bash
grep -r "verifyItem\|verification" orchestrator/workflow/
# Файли: mcp-todo-manager.js, grisha-verify-item-processor.js
```

**Логування**
```bash
grep -r "logger\." orchestrator/workflow/ | wc -l
# Результат: 649 операцій логування
```

---

## 🚀 ШВИДКИЙ СТАРТ РЕФАКТОРИНГУ

### Крок 1: Видалити невикористовувані файли
```bash
cd /Users/dev/Documents/GitHub/atlas4

# Перевірити, що немає посилань
grep -r "optimized-executor\|hybrid-executor" orchestrator/ --include="*.js"

# Видалити
rm orchestrator/workflow/optimized-executor.js
rm orchestrator/workflow/hybrid-executor.js
rm orchestrator/workflow/modes/*.js
```

### Крок 2: Видалити DI реєстрації
```bash
# Відкрити orchestrator/core/service-registry.js
# Видалити рядки з:
# - workflowStateMachine
# - hybridWorkflowExecutor
# - optimizedWorkflowManager
# - modeExecutorFactory
# - standardModeExecutor
# - optimizedModeExecutor
# - hybridModeExecutor
```

### Крок 3: Централізувати логування
```bash
# Створити orchestrator/workflow/utils/logging-middleware.js
# Замінити 649 операцій логування на виклики LoggingMiddleware
```

### Крок 4: Розділити MCPTodoManager
```bash
# Створити:
# - orchestrator/workflow/core/todo-planner.js
# - orchestrator/workflow/core/todo-executor.js
# - orchestrator/workflow/core/todo-verifier.js

# Оновити:
# - orchestrator/workflow/mcp-todo-manager.js (координатор)
# - orchestrator/workflow/executor-v3.js (спрощено)
```

---

## ⚠️ РИЗИКИ

| Ризик                   | Мітигація                       |
| ----------------------- | ------------------------------- |
| Регресія функціоналу    | Unit тести перед рефакторингом  |
| Проблеми з залежностями | Перевірка циклічних залежностей |
| Проблеми з інтеграцією  | Integration тести               |

---

## 📞 КОНТАКТИ

- **Аналіз**: Cascade AI Assistant
- **Дата**: 22 листопада 2025
- **Статус**: ⚠️ ПОТРЕБУЄ ДІЙ

---

## 🔗 ПОСИЛАННЯ

- Повний аналіз: `/WORKFLOW_ARCHITECTURE_ANALYSIS.md`
- План дій: `/WORKFLOW_REFACTORING_ACTION_PLAN.md`
- Короткий огляд: `/WORKFLOW_ISSUES_SUMMARY.md`
- Цей файл: `/WORKFLOW_QUICK_REFERENCE.md`
