# MCP Workflow Analysis - Повний перелік файлів системи
## Дата аналізу: 2025-10-29

## 1. Основні компоненти MCP Workflow

### 1.1 Етапи обробки (Stages)
- `/orchestrator/workflow/stages/mode-selection-processor.js` - Stage 0: Визначення режиму (chat/task/dev)
- `/orchestrator/workflow/stages/server-selection-processor.js` - Stage 2.0: Вибір MCP серверів
- `/orchestrator/workflow/stages/tetyana-plan-tools-processor.js` - Stage 2.1: Планування інструментів
- `/orchestrator/workflow/stages/tetyana-execute-tools-processor.js` - Stage 2.2: Виконання інструментів
- `/orchestrator/workflow/stages/grisha-verify-item-processor.js` - Stage 2.3: Верифікація результатів
- `/orchestrator/workflow/stages/grisha-verification-eligibility-processor.js` - Визначення методу верифікації
- `/orchestrator/workflow/stages/grisha-verification-strategy.js` - Стратегії верифікації

### 1.2 Координація та управління
- `/orchestrator/workflow/executor-v3.js` - Головний координатор workflow
- `/orchestrator/workflow/workflow-coordinator.js` - Координація виконання етапів
- `/orchestrator/workflow/mcp-todo-manager.js` - Управління TODO списками з MCP

### 1.3 AI та LLM компоненти
- `/orchestrator/ai/llm-client.js` - Клієнт для взаємодії з LLM
- `/orchestrator/ai/tetyana-tool-system.js` - Система планування та виконання інструментів
- `/orchestrator/ai/mcp-manager.js` - Менеджер MCP серверів
- `/orchestrator/ai/llm-tool-selector.js` - Вибір інструментів через LLM
- `/orchestrator/ai/tool-dispatcher.js` - Диспетчер виконання інструментів

### 1.4 Валідація та інспекція
- `/orchestrator/ai/validation/validation-pipeline.js` - Головний pipeline валідації
- `/orchestrator/ai/validation/format-validator.js` - Валідація формату JSON
- `/orchestrator/ai/validation/schema-validator.js` - Валідація проти JSON Schema
- `/orchestrator/ai/validation/mcp-sync-validator.js` - Синхронізація з MCP серверами
- `/orchestrator/ai/validation/history-validator.js` - Валідація історії викликів
- `/orchestrator/ai/tool-inspectors.js` - Інспектори для різних типів інструментів
- `/orchestrator/ai/tool-inspection-manager.js` - Менеджер інспекцій
- `/orchestrator/ai/inspectors/repetition-inspector.js` - Перевірка на повторення

## 2. Промпти та конфігурація

### 2.1 Промпти MCP
- `/prompts/mcp/stage0_mode_selection.js` - Промпт вибору режиму
- `/prompts/mcp/stage2_0_server_selection.js` - Промпт вибору серверів
- `/prompts/mcp/tetyana_plan_tools.js` - Базовий промпт планування
- `/prompts/mcp/tetyana_plan_tools_filesystem.js` - Спеціалізований для filesystem
- `/prompts/mcp/tetyana_plan_tools_applescript.js` - Спеціалізований для AppleScript
- `/prompts/mcp/tetyana_plan_tools_playwright.js` - Спеціалізований для Playwright
- `/prompts/mcp/tetyana_plan_tools_shell.js` - Спеціалізований для shell
- `/prompts/mcp/tetyana_plan_tools_memory.js` - Спеціалізований для memory
- `/prompts/mcp/tetyana_plan_tools_java_sdk.js` - Спеціалізований для Java SDK
- `/prompts/mcp/tetyana_plan_tools_python_sdk.js` - Спеціалізований для Python SDK
- `/prompts/mcp/tetyana_execute_tools.js` - Промпт виконання інструментів
- `/prompts/mcp/grisha_verification_eligibility.js` - Промпт визначення методу верифікації
- `/prompts/mcp/grisha_verify_item.js` - Промпт верифікації результатів

### 2.2 Конфігурація
- `/config/mcp-registry.js` - Реєстр MCP серверів та їх конфігурацій
- `/config/models-config.js` - Конфігурація моделей для різних етапів
- `/config/ai-config.js` - Загальна конфігурація AI
- `/config/validation-config.js` - Конфігурація валідації
- `/config/security-config.js` - Безпека та обмеження

## 3. Допоміжні компоненти

### 3.1 Сервіси
- `/orchestrator/services/vision-analysis-service.js` - Аналіз зображень для верифікації
- `/orchestrator/services/confidence-evaluator.js` - Оцінка впевненості результатів
- `/orchestrator/services/localization-service.js` - Локалізація повідомлень

### 3.2 Утиліти
- `/orchestrator/utils/hierarchical-id-manager.js` - Управління ієрархічними ID (1.1, 1.2, etc.)
- `/orchestrator/utils/tool-name-normalizer.js` - Нормалізація назв інструментів
- `/orchestrator/utils/json-parser.js` - Розбір JSON з fallback

### 3.3 Core компоненти
- `/orchestrator/core/service-registry.js` - DI Container та реєстрація сервісів
- `/orchestrator/core/di-container.js` - Dependency Injection
- `/orchestrator/core/application.js` - Головний application клас

## 4. MCP Сервери
- `/mcp-servers/java-sdk/` - Java SDK MCP сервер
- `/mcp-servers/python-sdk/` - Python SDK MCP сервер
Добав сюди можливо весь перелік севреів мсп їх разом 7 !!!!!!!!!
Щоб не випустити потім інші в роботі.

## 5. Тести
- `/tests/validation/test-validation-pipeline.js` - Тести validation pipeline
- `/tests/unit/circuit-breaker.test.js` - Тести circuit breaker
- `/tests/unit/exponential-backoff.test.js` - Тести exponential backoff

## Потік виконання MCP інструментів

```
1. Mode Selection (Stage 0)
   ↓
2. TODO Planning (Stage 1) 
   ↓
3. Server Selection (Stage 2.0)
   - Аналіз завдання
   - Вибір релевантних MCP серверів
   - Призначення спеціалізованих промптів
   ↓
4. Tool Planning (Stage 2.1)
   - Використання спеціалізованого промпту
   - Генерація JSON Schema
   - Планування послідовності інструментів
   ↓
5. Validation Pipeline
   - Format Validation
   - Schema Validation  
   - MCP Sync Validation
   - History Validation
   ↓
6. Tool Execution (Stage 2.2)
   - Виконання через MCP Manager
   - Error handling та retries
   ↓
7. Verification (Stage 2.3)
   - Eligibility decision
   - Visual/MCP verification
   - Confidence evaluation
   ↓
8. Result Processing
```

## Ключові файли для модернізації

1. **Промпти** - основа якості планування:
   - `/prompts/mcp/tetyana_plan_tools_*.js` - потребують оптимізації згідно refactor.md

2. **Валідація** - забезпечення надійності:
   - `/orchestrator/ai/validation/validation-pipeline.js`
   - `/orchestrator/ai/validation/mcp-sync-validator.js`

3. **Координація** - оркестрація процесу:
   - `/orchestrator/workflow/workflow-coordinator.js`
   - `/orchestrator/workflow/executor-v3.js`

4. **Планування** - інтелект системи:
   - `/orchestrator/workflow/stages/tetyana-plan-tools-processor.js`
   - `/orchestrator/ai/tetyana-tool-system.js`
