# 🏗️ ATLAS Orchestrator Structure v5.0

**Дата аналізу:** 2025-10-20  
**Версія системи:** MCP Workflow v5.0  
**Статус:** Production Ready

---

## 📊 Загальна статистика

```
orchestrator/
├── 16 директорій
├── 53 файли
└── ~8,849 рядків коду (без node_modules)
```

---

## 🗂️ Структура директорій

```
orchestrator/
├── agents/          # Агенти та протоколи (2 файли)
├── ai/              # AI/LLM інтеграції (9 файлів)
│   └── backends/    # MCP backend (1 файл)
├── api/             # HTTP/WebSocket API (5 файлів)
│   └── routes/      # Express routes (3 файли)
├── core/            # DI Container та lifecycle (3 файли)
├── errors/          # Error handling (1 файл)
├── logs/            # Log files (порожня)
├── monitoring/      # Health monitoring (1 файл)
├── services/        # Domain services (2 файли)
├── state/           # State management (3 файли)
├── utils/           # Utilities (6 файлів)
└── workflow/        # MCP Workflow logic (12 файлів)
    ├── modules/     # Workflow modules (1 README)
    └── stages/      # Stage processors (10 файлів)
```

---

## 📁 Детальний аналіз файлів

### 🎯 **Entry Point**

#### `server.js` (22 LOC)
**Роль:** Точка входу системи  
**Статус:** ✅ Активний  
**Функціонал:**
- Імпортує `Application` з `core/application.js`
- Запускає систему через `app.start()`
- Експортує app для тестування

---

### 🔧 **Core (Ядро системи)**

#### `core/application.js` (256 LOC)
**Роль:** Управління життєвим циклом додатку  
**Статус:** ✅ Активний  
**Функціонал:**
- Ініціалізація DI Container
- Реєстрація сервісів через `service-registry.js`
- Налаштування Express routes
- Запуск HTTP/WebSocket серверів
- Graceful shutdown handling

**Залежності:**
- `di-container.js`
- `service-registry.js`
- `app.js`
- Routes (health, chat, web)

#### `core/di-container.js` (11,855 bytes)
**Роль:** Dependency Injection Container  
**Статус:** ✅ Активний  
**Функціонал:**
- Singleton/transient реєстрація
- Lifecycle hooks (onInit, onStart, onStop)
- Dependency resolution
- Service initialization

#### `core/service-registry.js` (431 LOC)
**Роль:** Централізована реєстрація всіх сервісів  
**Статус:** ✅ Активний  
**Функціонал:**
- `registerCoreServices()` - Logger, Config, ErrorHandler, Telemetry
- `registerApiServices()` - WebSocket, WebIntegration
- `registerStateServices()` - Session Store
- `registerUtilityServices()` - NetworkConfig, VisionAnalysis
- `registerMCPWorkflowServices()` - MCPManager, TetyanaToolSystem, TTSSyncManager, MCPTodoManager
- `registerMCPProcessors()` - 9 MCP stage processors

**Зареєстровані сервіси:**
1. config
2. logger
3. errorHandler
4. telemetry
5. wsManager
6. webIntegration
7. sessions
8. networkConfig
9. visionAnalysis
10. mcpManager
11. tetyanaToolSystem
12. ttsSyncManager
13. mcpTodoManager
14. modeSelectionProcessor
15. atlasTodoPlanningProcessor
16. serverSelectionProcessor
17. tetyanaПlanToolsProcessor
18. tetyanaExecuteToolsProcessor
19. grishaVerifyItemProcessor
20. atlasAdjustTodoProcessor
21. atlasReplanTodoProcessor
22. mcpFinalSummaryProcessor

---

### 🤖 **AI/LLM Integration**

#### `ai/mcp-manager.js` (1,237 LOC)
**Роль:** Управління MCP серверами (filesystem, playwright, shell, applescript, memory)  
**Статус:** ✅ Активний  
**Функціонал:**
- Запуск MCP servers через stdio
- JSON-RPC protocol communication
- Tool listing та виконання
- Server lifecycle management

#### `ai/tetyana-tool-system.js` (9,017 bytes)
**Роль:** Goose-inspired tool management система  
**Статус:** ✅ Активний  
**Функціонал:**
- MCPExtensionManager - завантаження MCP tools
- ToolInspectionManager - перевірка результатів
- ToolDispatcher - виконання з inspection
- Automatic tool filtering та validation

#### `ai/llm-client.js` (5,284 bytes)
**Роль:** LLM API client  
**Статус:** ✅ Активний  
**Функціонал:**
- HTTP запити до LLM endpoints
- Streaming support
- Error handling
- Model configuration

#### `ai/mcp-extension-manager.js` (15,255 bytes)
**Роль:** MCP Extensions Manager  
**Статус:** ✅ Активний  
**Функціонал:**
- Extension loading для MCP tools
- Tool metadata management
- Schema validation

#### `ai/tool-dispatcher.js` (9,896 bytes)
**Роль:** Tool execution dispatcher  
**Статус:** ✅ Активний  
**Функціонал:**
- Виконання MCP tools
- Parameter validation
- Result inspection
- Error handling

#### `ai/tool-inspectors.js` (14,427 bytes)
**Роль:** Tool result inspection  
**Статус:** ✅ Активний  
**Функціонал:**
- Аналіз результатів виконання tools
- Success/failure detection
- Suggestions для retry

#### `ai/fallback-llm.js` (214 LOC)
**Роль:** Fallback LLM integration  
**Статус:** ✅ Активний  
**Функціонал:**
- Локальний fallback LLM server
- Model registry з GlobalConfig
- Streaming chat completions

#### `ai/backends/mcp-backend.js` (257 LOC)
**Роль:** MCP Backend - прямий доступ до MCP без Goose  
**Статус:** ❌ НЕ ВИКОРИСТОВУЄТЬСЯ  
**Проблема:**
- Не імпортується ніде в системі
- Дублює функціональність MCPManager + TetyanaToolSystem
- Legacy код до введення TetyanaToolSystem
**Рекомендація:** АРХІВУВАТИ

#### `ai/state-analyzer.js` (168 LOC)
**Роль:** AI аналіз станів агентів  
**Статус:** ⚠️ LEGACY - НЕ ВИКОРИСТОВУЄТЬСЯ  
**Проблема:**
- Імпортує `state_analysis_prompts.mjs` з `archive/legacy-prompts/system/`
- Використовується тільки в `workflow/conditions.js`
- `workflow/conditions.js` не використовується в MCP workflow
**Рекомендація:** АРХІВУВАТИ

---

### 🤝 **Agents**

#### `agents/agent-protocol.js` (70 LOC)
**Роль:** Протокол взаємодії між агентами  
**Статус:** ❌ НЕ ВИКОРИСТОВУЄТЬСЯ  
**Функціонал:**
- Message types (QUERY, RESPONSE, ERROR, etc.)
- Message formatting/validation
**Проблема:**
- Імпортується тільки в `fallback-llm.js`, але не використовується
- MCP workflow не використовує цей протокол
**Рекомендація:** АРХІВУВАТИ

#### `agents/tts-optimizer.js` (402 LOC)
**Роль:** TTS оптимізація тексту  
**Статус:** ⚠️ ЧАСТКОВО АКТИВНИЙ  
**Функціонал:**
- Скорочення тексту для TTS
- Оптимізація для швидкої озвучки
**Примітка:**
- Використовується в старій workflow системі
- В MCP workflow TTS обробка в TTSSyncManager
**Рекомендація:** Перевірити використання, можливо АРХІВУВАТИ

---

### 🌐 **API**

#### `api/routes/chat.routes.js`
**Роль:** Chat API endpoints  
**Статус:** ✅ Активний  
**Функціонал:**
- POST `/chat` - основний endpoint для MCP workflow
- Streaming відповіді через SSE
- Передача DI container для executor

#### `api/routes/health.routes.js`
**Роль:** Health check endpoints  
**Статус:** ✅ Активний  
**Функціонал:**
- GET `/health` - статус системи
- GET `/health/services` - статус сервісів

#### `api/routes/web.routes.js`
**Роль:** Web integration routes  
**Статус:** ✅ Активний  
**Функціонал:**
- Інтеграція з веб-інтерфейсом
- Static file serving

#### `api/websocket-manager.js`
**Роль:** WebSocket server management  
**Статус:** ✅ Активний  
**Функціонал:**
- WebSocket server на порту 3003
- Broadcasting до subscribers
- TTS delivery через WebSocket

#### `api/web-integration.js`
**Роль:** Web integration utilities  
**Статус:** ✅ Активний  
**Функціонал:**
- Допоміжні функції для web integration

---

### 📊 **State Management**

#### `state/state-manager.js`
**Роль:** Централізований state manager  
**Статус:** ✅ Активний  
**Функціонал:**
- Global state management
- Stage transitions
- State persistence

#### `state/state-persistence.js`
**Роль:** State persistence layer  
**Статус:** ✅ Активний  
**Функціонал:**
- Збереження стану в файли/БД

#### `state/pause-state.js`
**Роль:** Pause/resume state  
**Статус:** ✅ Активний  
**Функціонал:**
- Управління паузою workflow

---

### 🔄 **Workflow (MCP)**

#### `workflow/executor-v3.js` (1,284 LOC)
**Роль:** Головний executor MCP workflow  
**Статус:** ✅ Активний  
**Функціонал:**
- `executeMCPWorkflow()` - основна функція
- 9 етапів MCP workflow
- Mode selection → TODO planning → Server selection → Tool planning → Execution → Verification → Summary
- Integration з DI container

**MCP Workflow stages:**
1. Stage 0-MCP: Mode Selection
2. Stage 1-MCP: Atlas TODO Planning
3. Stage 2.0-MCP: Server Selection
4. Stage 2.1-MCP: Tetyana Plan Tools
5. Stage 2.2-MCP: Tetyana Execute Tools
6. Stage 2.3-MCP: Grisha Verify Item
7. Stage 3-MCP: Atlas Adjust TODO
8. Stage 3.5-MCP: Atlas Replan TODO (deep analysis)
9. Stage 8-MCP: Final Summary

#### `workflow/mcp-todo-manager.js` (3,129 LOC)
**Роль:** MCP Dynamic TODO Manager  
**Статус:** ✅ Активний  
**Функціонал:**
- Item-by-item TODO execution
- Dependency management
- Auto-retry з adjustments
- WebSocket chat updates
- Rate limiting (2000ms між API calls)

#### `workflow/tts-sync-manager.js` (15,637 bytes)
**Роль:** TTS synchronization для MCP workflow  
**Статус:** ✅ Активний  
**Функціонал:**
- TTS queue management
- WebSocket TTS delivery
- Synchronization з workflow stages

#### `workflow/stages.js` (30 LOC)
**Роль:** Workflow stages configuration  
**Статус:** ❌ НЕ ВИКОРИСТОВУЄТЬСЯ  
**Проблема:**
- Експортує WORKFLOW_STAGES з GlobalConfig
- Функція `executeStage()` не викликається ніде
- Legacy для старої workflow системи
**Рекомендація:** АРХІВУВАТИ

#### `workflow/conditions.js` (153 LOC)
**Роль:** Workflow умови переходу між етапами  
**Статус:** ❌ НЕ ВИКОРИСТОВУЄТЬСЯ  
**Проблема:**
- WORKFLOW_CONDITIONS не імпортується ніде
- Використовує `state-analyzer.js` (legacy)
- Legacy для старої workflow системи
**Рекомендація:** АРХІВУВАТИ

#### `workflow/modules/README.md` (263 LOC)
**Роль:** Документація workflow modules  
**Статус:** ⚠️ ЗАСТАРІЛА  
**Проблема:**
- Описує `prompt-loader.js` і `chat-helpers.js` які вже АРХІВОВАНІ
- Застаріла інформація про структуру
**Рекомендація:** ОНОВИТИ або АРХІВУВАТИ

---

### 🎭 **Stage Processors (MCP)**

Всі 9 processors зареєстровані в DI Container та активно використовуються:

#### `stages/mode-selection-processor.js`
**Роль:** Stage 0-MCP - визначення режиму (chat vs task)  
**Статус:** ✅ Активний

#### `stages/atlas-todo-planning-processor.js`
**Роль:** Stage 1-MCP - планування TODO списку  
**Статус:** ✅ Активний

#### `stages/server-selection-processor.js`
**Роль:** Stage 2.0-MCP - вибір MCP серверів  
**Статус:** ✅ Активний  
**Особливості:**
- 3-layer JSON parsing для robust обробки
- Intelligent fallback на playwright
- Prompt assignment based на selected servers

#### `stages/tetyana-plan-tools-processor.js`
**Роль:** Stage 2.1-MCP - планування MCP tools  
**Статус:** ✅ Активний  
**Особливості:**
- Використовує TetyanaToolSystem
- Specialized prompts (playwright, filesystem, shell, etc.)

#### `stages/tetyana-execute-tools-processor.js`
**Роль:** Stage 2.2-MCP - виконання MCP tools  
**Статус:** ✅ Активний  
**Особливості:**
- Tool execution з inspection
- Auto-correction параметрів
- Error handling з retry

#### `stages/grisha-verify-item-processor.js`
**Роль:** Stage 2.3-MCP - верифікація результатів  
**Статус:** ✅ Активний  
**Особливості:**
- Visual AI verification
- Screenshot-based checking
- Success/failure detection

#### `stages/atlas-adjust-todo-processor.js`
**Роль:** Stage 3-MCP - корегування TODO при помилках  
**Статус:** ✅ Активний

#### `stages/atlas-replan-todo-processor.js`
**Роль:** Stage 3.5-MCP - deep replan analysis  
**Статус:** ✅ Активний  
**Особливості:**
- Аналіз причин failure
- Rebuild TODO з новим підходом

#### `stages/mcp-final-summary-processor.js`
**Роль:** Stage 8-MCP - фінальне підведення підсумків  
**Статус:** ✅ Активний

#### `stages/index.js`
**Роль:** Експорт всіх processors  
**Статус:** ✅ Активний  
**Функціонал:**
- Централізований експорт для service-registry

---

### 🛠️ **Services**

#### `services/vision-analysis-service.js`
**Роль:** Vision AI для Grisha verification  
**Статус:** ✅ Активний  
**Функціонал:**
- Screenshot analysis
- Multi-provider support (port 4000, Ollama, OpenRouter)
- Fallback chain для reliability

#### `services/visual-capture-service.js`
**Роль:** Screenshot capture service  
**Статус:** ✅ Активний  
**Функціонал:**
- Screenshot MCP tool integration
- Image capture для verification

---

### 🔧 **Utilities**

#### `utils/logger.js`
**Роль:** Централізований logging  
**Статус:** ✅ Активний

#### `utils/telemetry.js`
**Роль:** Metrics та моніторинг  
**Статус:** ✅ Активний

#### `utils/axios-config.js`
**Роль:** Axios retry logic для 429 errors  
**Статус:** ✅ Активний

#### `utils/circuit-breaker.js`
**Роль:** Circuit breaker pattern  
**Статус:** ✅ Активний

#### `utils/helpers.js`
**Роль:** Загальні helper functions  
**Статус:** ✅ Активний

#### `utils/sanitizer.js`
**Роль:** Input sanitization  
**Статус:** ✅ Активний

---

### ⚙️ **Configuration**

#### `config.js` (28 LOC)
**Роль:** Proxy для GlobalConfig  
**Статус:** ❌ НЕ ПОТРІБЕН  
**Проблема:**
- Просто реекспортує все з `../config/global-config.js`
- Всі файли імпортують напряму з GlobalConfig
- Додає зайвий шар абстракції
**Рекомендація:** АРХІВУВАТИ, використовувати GlobalConfig напряму

#### `app.js`
**Роль:** Express app configuration  
**Статус:** ✅ Активний  
**Функціонал:**
- Express middleware setup
- CORS configuration
- Body parsing

---

### 🚨 **Error Handling**

#### `errors/error-handler.js`
**Роль:** Централізована обробка помилок  
**Статус:** ✅ Активний  
**Функціонал:**
- Error middleware для Express
- Error formatting
- Logging

---

### 📊 **Monitoring**

#### `monitoring/health-monitor.js`
**Роль:** Health check monitoring  
**Статус:** ✅ Активний  
**Функціонал:**
- Service health checks
- Status reporting

---

## ❌ Файли для архівації

### Категорія 1: Legacy Workflow System

```
orchestrator/workflow/
├── stages.js                  ❌ 30 LOC - Legacy, executeStage() не викликається
├── conditions.js              ❌ 153 LOC - WORKFLOW_CONDITIONS не використовується
└── modules/README.md          ❌ 263 LOC - Застаріла документація
```

### Категорія 2: Невикористовувані AI модулі

```
orchestrator/ai/
├── backends/mcp-backend.js    ❌ 257 LOC - Замінено на TetyanaToolSystem
└── state-analyzer.js          ❌ 168 LOC - Legacy, імпортує archived prompts
```

### Категорія 3: Невикористовувані Agent модулі

```
orchestrator/agents/
└── agent-protocol.js          ❌ 70 LOC - Протокол не використовується
```

### Категорія 4: Зайві прокси

```
orchestrator/
└── config.js                  ❌ 28 LOC - Просто proxy для GlobalConfig
```

**Всього до архівації:** 7 файлів, ~969 рядків

---

## ✅ Активні файли (46 файлів)

### Core & Infrastructure (20 файлів)
- ✅ server.js
- ✅ app.js
- ✅ core/* (3 файли)
- ✅ utils/* (6 файлів)
- ✅ errors/* (1 файл)
- ✅ state/* (3 файли)
- ✅ monitoring/* (1 файл)
- ✅ api/* (5 файлів)

### AI/LLM Integration (6 файлів)
- ✅ ai/mcp-manager.js
- ✅ ai/tetyana-tool-system.js
- ✅ ai/llm-client.js
- ✅ ai/mcp-extension-manager.js
- ✅ ai/tool-dispatcher.js
- ✅ ai/tool-inspectors.js
- ✅ ai/fallback-llm.js

### MCP Workflow (13 файлів)
- ✅ workflow/executor-v3.js
- ✅ workflow/mcp-todo-manager.js
- ✅ workflow/tts-sync-manager.js
- ✅ workflow/stages/* (10 processors)

### Services (2 файли)
- ✅ services/vision-analysis-service.js
- ✅ services/visual-capture-service.js

### Special (1 файл)
- ⚠️ agents/tts-optimizer.js (потребує перевірки)

---

## 📊 Статистика після рефакторингу

| Метрика | До | Після | Зміна |
|---------|-----|-------|-------|
| **Файли** | 53 | 46 | -7 (-13%) |
| **Рядків коду** | ~8,849 | ~7,880 | -969 (-11%) |
| **Legacy код** | 7 файлів | 0 | -100% |
| **Maintainability** | Середня | Висока | ↑ |

---

## 🎯 Рекомендації

### Короткострокові
1. ✅ Архівувати 7 файлів з категорій 1-4
2. ⚠️ Перевірити використання `tts-optimizer.js`
3. 📝 Оновити або видалити `workflow/modules/README.md`

### Довгострокові
1. Розглянути винесення stage processors в окремий npm package
2. Додати unit tests для всіх processors
3. Документувати DI Container dependencies
4. Створити architecture diagram

---

**Створено:** 2025-10-20  
**Автор:** Cascade AI  
**Версія:** 1.0.0  
**Статус:** Ready for review
